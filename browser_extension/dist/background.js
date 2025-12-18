// background.js - Updated with dashboard integration

// Load config (in production, you'd import this properly)
const API_CONFIG = {
  endpoint: 'http://localhost:8000/api/v1', // CHANGE THIS TO YOUR BACKEND URL
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

// User authentication state
let userToken = null;
let userId = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('[PhishGuard] Extension installed/updated');
  
  // Set default settings
  chrome.storage.sync.set({
    enabled: true,
    autoScan: true,
    notificationsEnabled: true,
    autoQuarantine: true,
    confidenceThreshold: 0.6,
    apiKey: '',
    apiEndpoint: API_CONFIG.endpoint,
    showSafeIndicators: false,
    userToken: null,
    userId: null
  });

  // Initialize stats
  chrome.storage.local.set({
    totalScanned: 0,
    threatsDetected: 0,
    emailsQuarantined: 0,
    lastScan: Date.now(),
    scanHistory: []
  });
});

// Load user authentication on startup
chrome.storage.sync.get(['userToken', 'userId'], (data) => {
  userToken = data.userToken;
  userId = data.userId;
  console.log('[PhishGuard] User auth loaded:', userId ? 'Authenticated' : 'Not authenticated');
});

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[PhishGuard] Message received:', request.action);

  if (request.action === 'analyzeEmail') {
    handleEmailAnalysis(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'setAuth') {
    // Set authentication from popup
    userToken = request.token;
    userId = request.userId;
    chrome.storage.sync.set({ userToken, userId });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'getAuth') {
    sendResponse({ userToken, userId });
    return true;
  }
  
  if (request.action === 'getSettings') {
    chrome.storage.sync.get([
      'enabled', 'autoScan', 'notificationsEnabled', 'apiKey',
      'apiEndpoint', 'autoQuarantine', 'confidenceThreshold', 
      'showSafeIndicators', 'userToken', 'userId'
    ], (settings) => {
      sendResponse(settings);
    });
    return true;
  }
  
  if (request.action === 'updateStats') {
    updateStatistics(request.data);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'emailQuarantined') {
    handleQuarantine(request.data);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'reportFalsePositive') {
    handleFalsePositiveReport(request.data)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'syncWithDashboard') {
    syncWithDashboard()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Main email analysis function with dashboard sync
async function handleEmailAnalysis(emailData) {
  const startTime = Date.now();
  
  try {
    const settings = await getSettings();
    
    if (!settings.enabled) {
      return { 
        threat: false, 
        prediction: 'legit',
        confidence: 0, 
        message: 'Scanner disabled' 
      };
    }

    // Check cache first
    const cacheKey = generateCacheKey(emailData);
    const cached = await getCachedResult(cacheKey);
    
    if (cached) {
      console.log('[PhishGuard] Using cached result');
      return cached;
    }

    // Extract comprehensive features
    const features = extractFeatures(emailData);
    
    // Add user_id if authenticated
    if (userId) {
      emailData.user_id = userId;
    }
    
    // Send to backend API for analysis
    const result = await analyzeWithBackend(features, emailData, settings);
    
    // Calculate processing time
    const processingTime = Date.now() - startTime;
    result.processing_time_ms = processingTime;

    // Cache the result
    await cacheResult(cacheKey, result);

    // Show notification if threat detected
    if ((result.prediction === 'phish' || result.threat) && settings.notificationsEnabled) {
      showThreatNotification(emailData, result);
    }

    // Log to history
    await logToHistory(emailData, result);

    // Sync with dashboard if authenticated
    if (userToken && userId) {
      await syncDetectionWithDashboard(emailData, result);
    }

    return result;
    
  } catch (error) {
    console.error('[PhishGuard] Analysis error:', error);
    return { 
      threat: false,
      prediction: 'error',
      confidence: 0, 
      error: error.message,
      fallback: true,
      processing_time_ms: Date.now() - startTime
    };
  }
}

// Backend API communication with JWT support
async function analyzeWithBackend(features, emailData, settings, attempt = 1) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    // Use JWT token if available, otherwise fall back to API key
    const authHeader = userToken 
      ? `Bearer ${userToken}`
      : `Bearer ${settings.apiKey || 'demo-key'}`;

    const response = await fetch(`${settings.apiEndpoint}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-Extension-Version': chrome.runtime.getManifest().version
      },
      body: JSON.stringify({
        features,
        email: {
          subject: emailData.subject,
          sender: emailData.from,
          recipient: emailData.to || 'unknown',
          body: emailData.bodyText || emailData.body,
          timestamp: emailData.timestamp,
          provider: emailData.provider,
          user_id: userId
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired - clear auth
        userToken = null;
        userId = null;
        chrome.storage.sync.set({ userToken: null, userId: null });
        throw new Error('Authentication expired. Please sign in again.');
      }
      
      if (response.status === 429) {
        if (attempt < API_CONFIG.retryAttempts) {
          await sleep(API_CONFIG.retryDelay * attempt);
          return analyzeWithBackend(features, emailData, settings, attempt + 1);
        }
        throw new Error('API rate limit exceeded');
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      prediction: result.prediction || (result.is_phishing ? 'phish' : 'legit'),
      threat: result.prediction === 'phish' || result.is_phishing,
      confidence: result.confidence_score || result.confidence || 0,
      confidence_score: result.confidence_score || result.confidence || 0,
      threat_level: result.threat_level || determineThreatLevel(result.confidence_score),
      threatType: result.threat_type || result.threatType || 'phishing',
      model_version: result.model_version || 'unknown',
      urls_found: result.urls_found || 0,
      url_analysis: result.url_analysis || null,
      header_analysis: result.header_analysis || null,
      extracted_features: result.extracted_features || features
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[PhishGuard] Request timeout');
      if (attempt < API_CONFIG.retryAttempts) {
        await sleep(API_CONFIG.retryDelay * attempt);
        return analyzeWithBackend(features, emailData, settings, attempt + 1);
      }
    }

    console.warn('[PhishGuard] API failed, using local heuristics');
    return performLocalAnalysis(features, emailData);
  }
}

// Sync detection with dashboard
async function syncDetectionWithDashboard(emailData, result) {
  try {
    if (!userToken || !userId) {
      console.log('[PhishGuard] Not authenticated, skipping dashboard sync');
      return;
    }

    const settings = await getSettings();
    
    // The analysis is already stored in the backend via /analyze endpoint
    // But we can sync stats separately
    await fetch(`${settings.apiEndpoint}/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      }
    });

    console.log('[PhishGuard] Stats synced with dashboard');
  } catch (error) {
    console.error('[PhishGuard] Dashboard sync error:', error);
  }
}

// Sync all local stats with dashboard
async function syncWithDashboard() {
  try {
    if (!userToken || !userId) {
      throw new Error('Not authenticated');
    }

    const settings = await getSettings();
    
    // Fetch latest stats from dashboard
    const response = await fetch(`${settings.apiEndpoint}/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to sync with dashboard');
    }

    const dashboardStats = await response.json();
    
    // Update local stats with dashboard data
    chrome.storage.local.set({
      totalScanned: dashboardStats.total_scanned || 0,
      threatsDetected: dashboardStats.threats_detected || 0,
      emailsQuarantined: dashboardStats.emails_quarantined || 0,
      lastSync: Date.now()
    });

    console.log('[PhishGuard] Successfully synced with dashboard');
    return dashboardStats;
    
  } catch (error) {
    console.error('[PhishGuard] Dashboard sync failed:', error);
    throw error;
  }
}

// Local heuristic analysis as fallback
function performLocalAnalysis(features, emailData) {
  let suspicionScore = 0;
  const indicators = [];

  if (features.has_suspicious_tld) {
    suspicionScore += 0.3;
    indicators.push('Suspicious domain extension');
  }

  if (features.has_urgent_keywords) {
    suspicionScore += 0.2;
    indicators.push('Urgent language detected');
  }

  if (features.has_financial_keywords) {
    suspicionScore += 0.2;
    indicators.push('Financial terms detected');
  }

  if (features.has_shortened_urls) {
    suspicionScore += 0.25;
    indicators.push('Shortened URLs found');
  }

  if (features.has_display_name_mismatch) {
    suspicionScore += 0.35;
    indicators.push('Sender name mismatch');
  }

  if (features.has_suspicious_attachments) {
    suspicionScore += 0.4;
    indicators.push('Suspicious attachments');
  }

  if (features.num_external_links > 5) {
    suspicionScore += 0.15;
    indicators.push('Many external links');
  }

  if (!features.has_spf_pass && !features.has_dkim_pass) {
    suspicionScore += 0.2;
    indicators.push('Email authentication failed');
  }

  const confidence = Math.min(suspicionScore, 1.0);
  const isPhishing = confidence > 0.5;

  return {
    prediction: isPhishing ? 'phish' : 'legit',
    threat: isPhishing,
    confidence: confidence,
    confidence_score: confidence,
    threat_level: determineThreatLevel(confidence),
    threatType: 'phishing',
    model_version: 'local-heuristic-v1',
    indicators: indicators,
    fallback: true,
    local_analysis: true
  };
}

// [Keep all the feature extraction functions from before]
function extractFeatures(emailData) {
  const features = {
    has_suspicious_tld: checkSuspiciousTLD(emailData.from),
    sender_domain_age: 0,
    has_display_name_mismatch: checkDisplayNameMismatch(emailData.from, emailData.fromName),
    subject_length: (emailData.subject || '').length,
    body_length: (emailData.bodyText || emailData.body || '').length,
    has_urgent_keywords: checkUrgentKeywords(emailData.subject, emailData.bodyText || emailData.body),
    has_financial_keywords: checkFinancialKeywords(emailData.subject, emailData.bodyText || emailData.body),
    num_links: emailData.urls ? emailData.urls.length : countLinks(emailData.body),
    num_external_links: countExternalLinks(emailData.body, emailData.from),
    has_shortened_urls: checkShortenedUrls(emailData.body),
    has_suspicious_attachments: checkSuspiciousAttachments(emailData.attachments),
    num_attachments: emailData.attachments ? emailData.attachments.length : 0,
    html_to_text_ratio: calculateHtmlRatio(emailData.body, emailData.bodyText),
    has_hidden_text: checkHiddenText(emailData.body),
    num_images: countImages(emailData.body),
    is_reply: emailData.isReply || false,
    time_of_day: new Date(emailData.timestamp).getHours(),
    has_spf_pass: emailData.spfPass || false,
    has_dkim_pass: emailData.dkimPass || false,
    is_unread: emailData.isUnread || false,
    provider: emailData.provider || 'unknown'
  };
  return features;
}

// [Include all helper functions from previous background.js]
function checkSuspiciousTLD(email) {
  if (!email) return 0;
  const suspiciousTLDs = ['.xyz', '.top', '.work', '.click', '.loan', '.win', '.gq', '.tk', '.ml', '.ga', '.cf', '.buzz'];
  return suspiciousTLDs.some(tld => email.toLowerCase().includes(tld)) ? 1 : 0;
}

function checkDisplayNameMismatch(email, displayName) {
  if (!displayName || !email) return 0;
  const emailDomain = email.split('@')[1]?.toLowerCase() || '';
  const nameLower = displayName.toLowerCase();
  const trustedDomains = ['paypal', 'amazon', 'microsoft', 'google', 'apple', 'bank', 'wells', 'chase', 'citibank'];
  return trustedDomains.some(domain => nameLower.includes(domain) && !emailDomain.includes(domain)) ? 1 : 0;
}

function checkUrgentKeywords(subject, body) {
  const urgentWords = ['urgent', 'immediate', 'action required', 'suspended', 'verify', 'confirm', 'expire', 'limited time', 'act now', 'click here', 'update required', 'security alert', 'unusual activity', 'verify your account'];
  const text = `${subject} ${body}`.toLowerCase();
  return urgentWords.some(word => text.includes(word)) ? 1 : 0;
}

function checkFinancialKeywords(subject, body) {
  const financialWords = ['payment', 'invoice', 'refund', 'credit card', 'bank account', 'wire transfer', 'paypal', 'bitcoin', 'cryptocurrency', 'transaction', 'billing', 'debit card', 'ssn', 'social security', 'tax return', 'irs'];
  const text = `${subject} ${body}`.toLowerCase();
  return financialWords.some(word => text.includes(word)) ? 1 : 0;
}

function countLinks(body) {
  if (!body) return 0;
  const linkRegex = /https?:\/\/[^\s<>"]+/gi;
  return (body.match(linkRegex) || []).length;
}

function countExternalLinks(body, senderEmail) {
  if (!body || !senderEmail) return 0;
  const domain = senderEmail.split('@')[1];
  if (!domain) return 0;
  const linkRegex = /https?:\/\/([^\s<>/"]+)/gi;
  const matches = body.match(linkRegex) || [];
  return matches.filter(link => !link.includes(domain)).length;
}

function checkShortenedUrls(body) {
  if (!body) return 0;
  const shorteners = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly', 'adf.ly'];
  return shorteners.some(shortener => body.includes(shortener)) ? 1 : 0;
}

function checkSuspiciousAttachments(attachments) {
  if (!attachments || attachments.length === 0) return 0;
  const suspiciousExts = ['.exe', '.scr', '.bat', '.cmd', '.js', '.vbs', '.jar', '.msi', '.app', '.dmg', '.apk'];
  return attachments.some(att => suspiciousExts.some(ext => att.name.toLowerCase().endsWith(ext))) ? 1 : 0;
}

function calculateHtmlRatio(html, text) {
  if (!html || !text) return 0;
  return Math.min(html.length / (text.length || 1), 10);
}

function checkHiddenText(body) {
  if (!body) return 0;
  return /display:\s*none|visibility:\s*hidden|font-size:\s*0|color:\s*#fff/i.test(body) ? 1 : 0;
}

function countImages(body) {
  if (!body) return 0;
  const imgRegex = /<img[^>]*>/gi;
  return (body.match(imgRegex) || []).length;
}

function determineThreatLevel(confidence) {
  if (confidence >= 0.9) return 'CRITICAL';
  if (confidence >= 0.7) return 'HIGH';
  if (confidence >= 0.5) return 'MEDIUM';
  return 'LOW';
}

// [Keep all other utility functions from previous background.js]
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([
      'enabled', 'autoScan', 'notificationsEnabled', 'apiKey',
      'apiEndpoint', 'autoQuarantine', 'confidenceThreshold',
      'userToken', 'userId'
    ], (settings) => {
      resolve({
        enabled: settings.enabled !== false,
        autoScan: settings.autoScan !== false,
        notificationsEnabled: settings.notificationsEnabled !== false,
        apiKey: settings.apiKey || '',
        apiEndpoint: settings.apiEndpoint || API_CONFIG.endpoint,
        autoQuarantine: settings.autoQuarantine !== false,
        confidenceThreshold: settings.confidenceThreshold || 0.6,
        userToken: settings.userToken,
        userId: settings.userId
      });
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// [Include remaining functions from previous background.js]
function generateCacheKey(emailData) {
  const content = `${emailData.from}${emailData.subject}${emailData.bodyText || ''}`;
  return btoa(content).substring(0, 32);
}

async function getCachedResult(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([`cache_${key}`], (data) => {
      const cached = data[`cache_${key}`];
      if (cached && Date.now() - cached.timestamp < 3600000) {
        resolve(cached.result);
      } else {
        resolve(null);
      }
    });
  });
}

async function cacheResult(key, result) {
  return new Promise((resolve) => {
    chrome.storage.local.set({
      [`cache_${key}`]: {
        result,
        timestamp: Date.now()
      }
    }, resolve);
  });
}

async function logToHistory(emailData, result) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['analysisHistory'], (data) => {
      const history = data.analysisHistory || [];
      history.push({
        timestamp: Date.now(),
        from: emailData.from,
        subject: emailData.subject,
        prediction: result.prediction,
        confidence: result.confidence_score,
        provider: emailData.provider
      });
      if (history.length > 50) {
        history.shift();
      }
      chrome.storage.local.set({ analysisHistory: history }, resolve);
    });
  });
}

async function updateStatistics(data) {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      'totalScanned', 'threatsDetected', 'emailsQuarantined', 
      'lastScan', 'scanHistory', 'providerStats'
    ], (stats) => {
      const updated = {
        totalScanned: (stats.totalScanned || 0) + 1,
        threatsDetected: (stats.threatsDetected || 0) + (data.isThreat ? 1 : 0),
        emailsQuarantined: stats.emailsQuarantined || 0,
        lastScan: Date.now()
      };

      const providerStats = stats.providerStats || {};
      const provider = data.provider || 'unknown';
      
      if (!providerStats[provider]) {
        providerStats[provider] = { scanned: 0, threats: 0 };
      }
      
      providerStats[provider].scanned += 1;
      if (data.isThreat) {
        providerStats[provider].threats += 1;
      }
      
      updated.providerStats = providerStats;

      const scanHistory = stats.scanHistory || [];
      scanHistory.push({
        timestamp: Date.now(),
        threat: data.isThreat,
        provider: provider
      });
      
      if (scanHistory.length > 100) {
        scanHistory.shift();
      }
      
      updated.scanHistory = scanHistory;

      chrome.storage.local.set(updated, resolve);
    });
  });
}

async function handleQuarantine(data) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['emailsQuarantined'], (stats) => {
      chrome.storage.local.set({
        emailsQuarantined: (stats.emailsQuarantined || 0) + 1
      });
      console.log('[PhishGuard] Email quarantined:', {
        provider: data.provider,
        from: data.email.from,
        subject: data.email.subject
      });
      resolve();
    });
  });
}

async function handleFalsePositiveReport(data) {
  try {
    const settings = await getSettings();
    const authHeader = userToken 
      ? `Bearer ${userToken}`
      : `Bearer ${settings.apiKey || 'demo-key'}`;

    await fetch(`${settings.apiEndpoint}/report-false-positive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        emailData: data.emailData,
        result: data.result,
        provider: data.provider,
        timestamp: Date.now()
      })
    });

    console.log('[PhishGuard] False positive reported successfully');
  } catch (error) {
    console.error('[PhishGuard] Error reporting false positive:', error);
  }
}

async function showThreatNotification(emailData, result) {
  const confidence = Math.round(result.confidence_score * 100);
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '⚠️ Phishing Email Detected',
    message: `Suspicious email from ${emailData.from}: ${result.threatType || 'phishing attempt'} (${confidence}% confidence)`,
    priority: 2,
    requireInteraction: true,
    buttons: [
      { title: 'View Details' },
      { title: 'Quarantine' }
    ]
  }, (notificationId) => {
    chrome.storage.local.set({
      [`notification_${notificationId}`]: {
        emailData,
        result
      }
    });
  });
}

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  chrome.storage.local.get([`notification_${notificationId}`], (data) => {
    const notificationData = data[`notification_${notificationId}`];
    if (!notificationData) return;

    if (buttonIndex === 0) {
      chrome.action.openPopup();
    } else if (buttonIndex === 1) {
      handleQuarantine({
        provider: notificationData.emailData.provider,
        email: notificationData.emailData
      });
    }

    chrome.storage.local.remove([`notification_${notificationId}`]);
  });
});

// Periodic cleanup and dashboard sync
chrome.alarms.create('cacheCleanup', { periodInMinutes: 60 });
chrome.alarms.create('dashboardSync', { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cacheCleanup') {
    chrome.storage.local.get(null, (items) => {
      const keysToRemove = [];
      const now = Date.now();
      
      for (const [key, value] of Object.entries(items)) {
        if (key.startsWith('cache_') && value.timestamp && now - value.timestamp > 3600000) {
          keysToRemove.push(key);
        }
      }
      
      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove);
        console.log(`[PhishGuard] Cleaned ${keysToRemove.length} expired cache entries`);
      }
    });
  }
  
  if (alarm.name === 'dashboardSync') {
    if (userToken && userId) {
      syncWithDashboard().catch(err => {
        console.error('[PhishGuard] Auto-sync failed:', err);
      });
    }
  }
});

console.log('[PhishGuard] Background service worker initialized');
console.log('[PhishGuard] API Endpoint:', API_CONFIG.endpoint);