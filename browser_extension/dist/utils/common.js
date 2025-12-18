// src/utils/common.js
class EmailMonitorBase {
  constructor(providerName) {
    this.providerName = providerName;
    this.processedEmails = new Set();
    console.log(`[PhishGuard] ${providerName} monitor initialized`);
  }

  async getSettings() {
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
          apiEndpoint: settings.apiEndpoint || 'http://localhost:8000/api/v1',
          autoQuarantine: settings.autoQuarantine !== false,
          confidenceThreshold: settings.confidenceThreshold || 0.6
        });
      });
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  extractURLs(text) {
    if (!text) return [];
    const urlPattern = /https?:\/\/[^\s<>"']+/gi;
    return [...new Set(text.match(urlPattern) || [])];
  }
}

if (typeof window !== 'undefined') {
  window.EmailMonitorBase = EmailMonitorBase;
}