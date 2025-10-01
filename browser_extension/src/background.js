// Background service worker for email security extension

const API_ENDPOINT = 'https://your-api-endpoint.com/api';

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Email Security Scanner installed');
  
  // Set default settings
  chrome.storage.sync.set({
    enabled: true,
    autoScan: true,
    notificationsEnabled: true,
    apiKey: ''
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeEmail') {
    analyzeEmail(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['enabled', 'autoScan', 'notificationsEnabled', 'apiKey'], (settings) => {
      sendResponse(settings);
    });
    return true;
  }
  
  if (request.action === 'updateStats') {
    updateStatistics(request.data);
    sendResponse({ success: true });
    return true;
  }
});

// Analyze email using backend API with XGBoost model
async function analyzeEmail(emailData) {
  try {
    const settings = await chrome.storage.sync.get(['apiKey', 'enabled']);
    
    if (!settings.enabled) {
      return { threat: false, confidence: 0, message: 'Scanner disabled' };
    }

    // Extract features from email
    const features = extractFeatures(emailData);
    
    // Send to backend for XGBoost prediction
    const response = await fetch(`${API_ENDPOINT}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey || 'demo-key'}`
      },
      body: JSON.stringify({
        features,
        email: {
          subject: emailData.subject,
          sender: emailData.from,
          timestamp: emailData.timestamp
        }
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const result = await response.json();
    
    // Show notification if threat detected
    if (result.isThreat && settings.notificationsEnabled) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Threat Detected',
        message: `Suspicious email from ${emailData.from}: ${result.threatType}`,
        priority: 2
      });
    }
    
    return result;
  } catch (error) {
    console.error('Analysis error:', error);
    return { 
      threat: false, 
      confidence: 0, 
      error: error.message,
      fallback: true 
    };
  }
}

// Extract features for ML model
function extractFeatures(emailData) {
  return {
    // Sender features
    has_suspicious_tld: checkSuspiciousTLD(emailData.from),
    sender_domain_age: 0, // Would need external API
    has_display_name_mismatch: checkDisplayNameMismatch(emailData.from, emailData.fromName),
    
    // Content features
    subject_length: emailData.subject ? emailData.subject.length : 0,
    body_length: emailData.body ? emailData.body.length : 0,
    has_urgent_keywords: checkUrgentKeywords(emailData.subject, emailData.body),
    has_financial_keywords: checkFinancialKeywords(emailData.subject, emailData.body),
    num_links: countLinks(emailData.body),
    num_external_links: countExternalLinks(emailData.body, emailData.from),
    has_shortened_urls: checkShortenedUrls(emailData.body),
    has_suspicious_attachments: checkSuspiciousAttachments(emailData.attachments),
    
    // Structure features
    html_to_text_ratio: calculateHtmlRatio(emailData.body, emailData.bodyText),
    has_hidden_text: checkHiddenText(emailData.body),
    num_images: countImages(emailData.body),
    
    // Behavioral features
    is_reply: emailData.isReply || false,
    time_of_day: new Date(emailData.timestamp).getHours(),
    has_spf_pass: emailData.spfPass || false,
    has_dkim_pass: emailData.dkimPass || false
  };
}

// Feature extraction helper functions
function checkSuspiciousTLD(email) {
  const suspiciousTLDs = ['.xyz', '.top', '.work', '.click', '.loan', '.win', '.gq', '.tk'];
  return suspiciousTLDs.some(tld => email.toLowerCase().includes(tld)) ? 1 : 0;
}

function checkDisplayNameMismatch(email, displayName) {
  if (!displayName) return 0;
  const emailDomain = email.split('@')[1]?.toLowerCase();
  const nameLower = displayName.toLowerCase();
  
  const trustedDomains = ['paypal', 'amazon', 'microsoft', 'google', 'apple', 'bank'];
  return trustedDomains.some(domain => 
    nameLower.includes(domain) && !emailDomain?.includes(domain)
  ) ? 1 : 0;
}

function checkUrgentKeywords(subject, body) {
  const urgentWords = ['urgent', 'immediate', 'action required', 'suspended', 'verify', 'confirm', 'expire', 'limited time'];
  const text = `${subject} ${body}`.toLowerCase();
  return urgentWords.some(word => text.includes(word)) ? 1 : 0;
}

function checkFinancialKeywords(subject, body) {
  const financialWords = ['payment', 'invoice', 'refund', 'credit card', 'bank account', 'wire transfer', 'paypal', 'bitcoin'];
  const text = `${subject} ${body}`.toLowerCase();
  return financialWords.some(word => text.includes(word)) ? 1 : 0;
}

function countLinks(body) {
  if (!body) return 0;
  const linkRegex = /https?:\/\/[^\s<>"]+/gi;
  return (body.match(linkRegex) || []).length;
}

function countExternalLinks(body, senderEmail) {
  if (!body) return 0;
  const domain = senderEmail.split('@')[1];
  const linkRegex = /https?:\/\/([^\s<>/"]+)/gi;
  const matches = body.match(linkRegex) || [];
  return matches.filter(link => !link.includes(domain)).length;
}

function checkShortenedUrls(body) {
  const shorteners = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd'];
  return shorteners.some(shortener => body?.includes(shortener)) ? 1 : 0;
}

function checkSuspiciousAttachments(attachments) {
  if (!attachments || attachments.length === 0) return 0;
  const suspiciousExts = ['.exe', '.scr', '.bat', '.cmd', '.js', '.vbs', '.jar'];
  return attachments.some(att => 
    suspiciousExts.some(ext => att.name.toLowerCase().endsWith(ext))
  ) ? 1 : 0;
}

function calculateHtmlRatio(html, text) {
  if (!html || !text) return 0;
  return html.length / (text.length || 1);
}

function checkHiddenText(body) {
  if (!body) return 0;
  return /display:\s*none|visibility:\s*hidden|font-size:\s*0/i.test(body) ? 1 : 0;
}

function countImages(body) {
  if (!body) return 0;
  const imgRegex = /<img[^>]*>/gi;
  return (body.match(imgRegex) || []).length;
}

// Update statistics
async function updateStatistics(data) {
  const stats = await chrome.storage.local.get(['totalScanned', 'threatsDetected', 'lastScan']);
  
  chrome.storage.local.set({
    totalScanned: (stats.totalScanned || 0) + 1,
    threatsDetected: (stats.threatsDetected || 0) + (data.isThreat ? 1 : 0),
    lastScan: Date.now()
  });
}