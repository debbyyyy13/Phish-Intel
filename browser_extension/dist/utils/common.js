// src/utils/common.js
class EmailMonitorBase {
  constructor(providerName) {
    this.providerName = providerName;
    this.processedEmails = new Set();
    console.log(`[PhishGuard] ${providerName} monitor base constructor called`);
  }

  // Add the init method to the base class
  async init() {
    console.log(`[PhishGuard] Base init() called for ${this.providerName}`);
    
    try {
      const settings = await this.getSettings();
      if (!settings.enabled) {
        console.log('[PhishGuard] Extension disabled');
        return;
      }

      // Call the provider-specific waitForInterface if it exists
      if (typeof this.waitForInterface === 'function') {
        await this.waitForInterface();
      }
      
      // Call the provider-specific startMonitoring if it exists
      if (typeof this.startMonitoring === 'function') {
        this.startMonitoring();
      }
      
      console.log(`[PhishGuard] ${this.providerName} monitor ready`);
    } catch (error) {
      console.error(`[PhishGuard] ${this.providerName} initialization error:`, error);
    }
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([
        'enabled', 'autoScan', 'notificationsEnabled', 'apiKey',
        'apiEndpoint', 'autoQuarantine', 'confidenceThreshold',
        'showSafeIndicators'
      ], (settings) => {
        resolve({
          enabled: settings.enabled !== false,
          autoScan: settings.autoScan !== false,
          notificationsEnabled: settings.notificationsEnabled !== false,
          apiKey: settings.apiKey || '',
          apiEndpoint: settings.apiEndpoint || 'http://localhost:8000/api/v1',
          autoQuarantine: settings.autoQuarantine !== false,
          confidenceThreshold: settings.confidenceThreshold || 0.6,
          showSafeIndicators: settings.showSafeIndicators !== false
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

// Make sure it's available globally
if (typeof window !== 'undefined') {
  window.EmailMonitorBase = EmailMonitorBase;
  console.log('[PhishGuard] EmailMonitorBase class registered globally');
}

// Also export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmailMonitorBase;
}