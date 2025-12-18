// background.js - Enhanced background service worker

const API_CONFIG = {
  endpoint: 'https://your-backend-api.com/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

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
    showSafeIndicators: false
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

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[PhishGuard] Message received:', request.action);

  if (request.action === 'analyzeEmail') {
    handleEmailAnalysis(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getSettings') {
    chrome.storage.sync.get([
      'enabled', 'autoScan', 'notificationsEnabled', 'apiKey',
      'apiEndpoint', 'autoQuarantine', 'confidenceThreshold', 'showSafeIndicators'
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

  if (request.action === 'batchAnalyze') {
    handleBatchAnalysis(request.data)
      .then(results => sendResponse({ success: true, results }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Main email analysis function
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

// Backend API communication with retry logic
async function analyzeWithBackend(features, emailData, settings, attempt = 1) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    const response = await fetch(`${settings.apiEndpoint}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey || 'demo-key'}`,
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
          provider: emailData.provider
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - wait and retry
        if (attempt < API_CONFIG.retryAttempts) {
          await sleep(API_CONFIG.retryDelay * attempt);
          return analyzeWithBackend(features, emailData, settings, attempt + 1);
        }
        throw new Error('API rate limit exceeded');
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // Normalize response format
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

    // Fallback to local heuristic analysis
    console.warn('[PhishGuard] API failed, using local heuristics');
    return performLocalAnalysis(features, emailData);
  }
}

// Local heuristic analysis as fallback
function performLocalAnalysis(features, emailData) {
  let suspicionScore = 0;
  const indicators = [];

  // Check for suspicious characteristics
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

// Feature extraction
function extractFeatures(emailData) {
  const features = {
    // Sender features
    has_suspicious_tld: checkSuspiciousTLD(emailData.from),
    sender_domain_age: 0,
    has_display_name_mismatch: checkDisplayNameMismatch(emailData.from, emailData.fromName),
    
    // Content features
    subject_length: (emailData.subject || '').length,
    body_length: (emailData.bodyText || emailData.body || '').length,
    has_urgent_keywords: checkUrgentKeywords(emailData.subject, emailData.bodyText || emailData.body),
    has_financial_keywords: checkFinancialKeywords(emailData.subject, emailData.bodyText || emailData.body),
    
    // Link features
    num_links: emailData.urls ? emailData.urls.length : countLinks(emailData.body),
    num_external_links: countExternalLinks(emailData.body, emailData.from),
    has_shortened_urls: checkShortenedUrls(emailData.body),
    
    // Attachment features
    has_suspicious_attachments: checkSuspiciousAttachments(emailData.attachments),
    num_attachments: emailData.attachments ? emailData.attachments.length : 0,
    
    // Structure features
    html_to_text_ratio: calculateHtmlRatio(emailData.body, emailData.bodyText),
    has_hidden_text: checkHiddenText(emailData.body),
    num_images: countImages(emailData.body),
    
    // Behavioral features
    is_reply: emailData.isReply || false,
    time_of_day: new Date(emailData.timestamp).getHours(),
    has_spf_pass: emailData.spfPass || false,
    has_dkim_pass: emailData.dkimPass || false,
    
    // Additional features
    is_unread: emailData.isUnread || false,
    provider: emailData.provider || 'unknown'
  };

  return features;
}

// Feature extraction helper functions
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
  return trustedDomains.some(domain => 
    nameLower.includes(domain) && !emailDomain.includes(domain)
  ) ? 1 : 0;
}

function checkUrgentKeywords(subject, body) {
  const urgentWords = [
    'urgent', 'immediate', 'action required', 'suspended', 'verify', 'confirm', 
    'expire', 'limited time', 'act now', 'click here', 'update required',
    'security alert', 'unusual activity', 'verify your account'
  ];
  const text = `${subject} ${body}`.toLowerCase();
  return urgentWords.some(word => text.includes(word)) ? 1 : 0;
}

function checkFinancialKeywords(subject, body) {
  const financialWords = [
    'payment', 'invoice', 'refund', 'credit card', 'bank account', 'wire transfer', 
    'paypal', 'bitcoin', 'cryptocurrency', 'transaction', 'billing', 'debit card',
    'ssn', 'social security', 'tax return', 'irs'
  ];
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
  return attachments.some(att => 
    suspiciousExts.some(ext => att.name.toLowerCase().endsWith(ext))
  ) ? 1 : 0;
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

// Notification system
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
    // Store notification data for button clicks
    chrome.storage.local.set({
      [`notification_${notificationId}`]: {
        emailData,
        result
      }
    });
  });
}

// Notification button click handler
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  chrome.storage.local.get([`notification_${notificationId}`], (data) => {
    const notificationData = data[`notification_${notificationId}`];
    
    if (!notificationData) return;

    if (buttonIndex === 0) {
      // View Details - open popup or options page
      chrome.action.openPopup();
    } else if (buttonIndex === 1) {
      // Quarantine
      handleQuarantine({
        provider: notificationData.emailData.provider,
        email: notificationData.emailData
      });
    }

    // Clean up
    chrome.storage.local.remove([`notification_${notificationId}`]);
  });
});

// Statistics management
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

      // Update provider-specific stats
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

      // Maintain scan history (last 100)
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

// Quarantine handler
async function handleQuarantine(data) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['emailsQuarantined'], (stats) => {
      chrome.storage.local.set({
        emailsQuarantined: (stats.emailsQuarantined || 0) + 1
      });

      // Log quarantine action
      console.log('[PhishGuard] Email quarantined:', {
        provider: data.provider,
        from: data.email.from,
        subject: data.email.subject
      });

      resolve();
    });
  });
}

// False positive reporting
async function handleFalsePositiveReport(data) {
  try {
    const settings = await getSettings();

    await fetch(`${settings.apiEndpoint}/report-false-positive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey || 'demo-key'}`
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

// Batch analysis
async function handleBatchAnalysis(emailsData) {
  const results = [];
  
  for (const emailData of emailsData) {
    try {
      const result = await handleEmailAnalysis(emailData);
      results.push(result);
      await sleep(50); // Small delay between requests
    } catch (error) {
      results.push({
        error: error.message,
        threat: false,
        prediction: 'error'
      });
    }
  }
  
  return results;
}

// Cache management
function generateCacheKey(emailData) {
  const content = `${emailData.from}${emailData.subject}${emailData.bodyText || ''}`;
  return btoa(content).substring(0, 32);
}

async function getCachedResult(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([`cache_${key}`], (data) => {
      const cached = data[`cache_${key}`];
      if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
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

// Utility functions
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([
      'enabled', 'autoScan', 'notificationsEnabled', 'apiKey',
      'apiEndpoint', 'autoQuarantine', 'confidenceThreshold'
    ], (settings) => {
      resolve({
        enabled: settings.enabled !== false,
        autoScan: settings.autoScan !== false,
        notificationsEnabled: settings.notificationsEnabled !== false,
        apiKey: settings.apiKey || '',
        apiEndpoint: settings.apiEndpoint || API_CONFIG.endpoint,
        autoQuarantine: settings.autoQuarantine !== false,
        confidenceThreshold: settings.confidenceThreshold || 0.6
      });
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

      // Keep last 50 entries
      if (history.length > 50) {
        history.shift();
      }

      chrome.storage.local.set({ analysisHistory: history }, resolve);
    });
  });
}

// Periodic cleanup of old cache entries
chrome.alarms.create('cacheCleanup', { periodInMinutes: 60 });

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
});

console.log('[PhishGuard] Background service worker initialized');