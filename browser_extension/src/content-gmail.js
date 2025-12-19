// content-gmail.js - Enhanced Gmail monitoring with robust error handling and optimized timing

(function() {
  'use strict';
  
  console.log('[PhishGuard] Gmail script loading...');

  // Helper function to check if extension context is still valid
  function isExtensionContextValid() {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  // Helper function to safely send messages to background
  function safeSendMessage(message, callback) {
    if (!isExtensionContextValid()) {
      console.warn('[PhishGuard] Extension context invalidated. Please refresh the page.');
      if (callback) callback(null);
      return;
    }

    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message;
          if (errorMsg.includes('Extension context invalidated')) {
            console.warn('[PhishGuard] Extension was reloaded. Please refresh Gmail page.');
          } else {
            console.error('[PhishGuard] Runtime error:', errorMsg);
          }
          if (callback) callback(null);
        } else {
          if (callback) callback(response);
        }
      });
    } catch (error) {
      console.error('[PhishGuard] Exception sending message:', error);
      if (callback) callback(null);
    }
  }

  class GmailMonitor extends EmailMonitorBase {
    constructor() {
      super('Gmail');
      this.gmailAPI = null;
      this.isActive = true;
      console.log('[PhishGuard] GmailMonitor constructor called');
    }

    async init() {
      console.log('[PhishGuard] GmailMonitor.init() called');
      
      if (!isExtensionContextValid()) {
        console.error('[PhishGuard] Cannot initialize - extension context is invalid');
        return;
      }

      try {
        const settings = await this.getSettings();
        if (!settings.enabled) {
          console.log('[PhishGuard] Extension disabled');
          return;
        }

        await this.waitForInterface();
        this.startMonitoring();
        
        console.log('[PhishGuard] Gmail monitor ready');
      } catch (error) {
        console.error('[PhishGuard] Initialization error:', error);
      }
    }

    async waitForInterface() {
      return new Promise((resolve) => {
        let checkCount = 0;
        const maxChecks = 60; // 60 seconds total
        
        const checkGmail = setInterval(() => {
          checkCount++;
          
          if (!this.isActive) {
            clearInterval(checkGmail);
            console.log('[PhishGuard] Monitor deactivated during interface check');
            resolve();
            return;
          }

          // More comprehensive Gmail interface detection
          const main = document.querySelector('[role="main"]');
          const inbox = document.querySelector('[aria-label*="Inbox"]') || 
                       document.querySelector('[href*="inbox"]') ||
                       document.querySelector('.aim'); // Gmail inbox container
          
          // Also check for email list container
          const emailList = document.querySelector('table.F') || // Gmail email table
                           document.querySelector('[gh="tl"]'); // Gmail thread list
          
          // Check if document is fully loaded
          const isLoaded = document.readyState === 'complete' || 
                          document.readyState === 'interactive';
          
          console.log(`[PhishGuard] Interface check ${checkCount}/${maxChecks}:`, {
            main: !!main,
            inbox: !!inbox,
            emailList: !!emailList,
            readyState: document.readyState
          });
          
          // Consider Gmail loaded if we have main area and either inbox or email list
          if (isLoaded && main && (inbox || emailList)) {
            clearInterval(checkGmail);
            console.log('[PhishGuard] Gmail interface detected successfully');
            resolve();
          } else if (checkCount >= maxChecks) {
            clearInterval(checkGmail);
            console.warn('[PhishGuard] Gmail interface detection timeout after 60 seconds');
            console.warn('[PhishGuard] Proceeding anyway - some features may not work');
            resolve();
          }
        }, 1000); // Check every second instead of every 100ms to reduce load
      });
    }

    startMonitoring() {
      if (!isExtensionContextValid()) {
        console.warn('[PhishGuard] Cannot start monitoring - invalid context');
        return;
      }

      console.log('[PhishGuard] Starting Gmail monitoring');
      
      // Wait a bit before starting to ensure Gmail is stable
      setTimeout(() => {
        // Monitor inbox for new emails
        this.observer = new MutationObserver(() => {
          if (this.isActive && isExtensionContextValid()) {
            this.checkForNewEmails();
          }
        });

        const mainContent = document.querySelector('[role="main"]');
        if (mainContent) {
          this.observer.observe(mainContent, {
            childList: true,
            subtree: true
          });
          console.log('[PhishGuard] Observer attached to main content');
        } else {
          console.warn('[PhishGuard] Main content not found for observer');
        }

        // Initial scan with slight delay
        setTimeout(() => this.checkForNewEmails(), 1000);
        
        // Monitor email viewing
        this.monitorEmailView();

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
      }, 500);
    }

    checkForNewEmails() {
      if (!isExtensionContextValid()) return;

      const emailRows = document.querySelectorAll('tr.zA:not([data-phishguard-processed])');
      
      console.log(`[PhishGuard] Found ${emailRows.length} unprocessed emails`);
      
      emailRows.forEach(row => {
        const emailId = this.getEmailId(row);
        if (emailId && !this.processedEmails.has(emailId)) {
          this.processedEmails.add(emailId);
          row.setAttribute('data-phishguard-processed', 'true');
          this.scanEmailRow(row, emailId);
        }
      });
    }

    getEmailId(row) {
      return row.getAttribute('data-legacy-message-id') || 
             row.getAttribute('id') || 
             row.querySelector('[data-message-id]')?.getAttribute('data-message-id') ||
             `gmail_${Date.now()}_${Math.random()}`;
    }

    async scanEmailRow(row, emailId) {
      if (!isExtensionContextValid()) {
        row.classList.remove('phishguard-processing');
        return;
      }

      try {
        row.classList.add('phishguard-processing');

        const emailData = this.extractEmailDataFromRow(row);
        if (!emailData) {
          row.classList.remove('phishguard-processing');
          return;
        }

        const result = await this.analyzeEmail(emailData);
        if (result) {
          await this.handleAnalysisResult(row, emailId, result, emailData);

          // Update stats
          safeSendMessage({
            action: 'updateStats',
            data: { 
              isThreat: result.prediction === 'phish' || result.threat,
              provider: 'gmail'
            }
          });
        }
      } catch (error) {
        console.error('[PhishGuard] Error scanning Gmail email:', error);
      } finally {
        row.classList.remove('phishguard-processing');
      }
    }

    extractEmailDataFromRow(row) {
      try {
        const senderElement = row.querySelector('[email]');
        const sender = senderElement?.getAttribute('email') || 
                       senderElement?.getAttribute('name') || '';

        const nameElement = row.querySelector('.yW span[email]') || 
                           row.querySelector('.yW .gD');
        const senderName = nameElement?.getAttribute('name') || 
                          nameElement?.textContent || '';

        const subjectElement = row.querySelector('.bog span') || 
                              row.querySelector('[data-thread-id] span');
        const subject = subjectElement?.textContent || '';

        const snippetElement = row.querySelector('.y2');
        const snippet = snippetElement?.textContent || '';

        const isUnread = row.classList.contains('zE');
        const hasAttachment = row.querySelector('[title*="Attachment"]') !== null;

        const dateElement = row.querySelector('.xW span[title]');
        const dateText = dateElement?.getAttribute('title') || 
                        dateElement?.textContent || '';

        return {
          from: sender,
          fromName: senderName,
          subject: subject,
          body: snippet,
          bodyText: snippet,
          timestamp: Date.now(),
          isReply: subject.toLowerCase().startsWith('re:'),
          attachments: hasAttachment ? [{ name: 'unknown' }] : [],
          isUnread: isUnread,
          dateText: dateText,
          provider: 'gmail'
        };
      } catch (error) {
        console.error('[PhishGuard] Error extracting Gmail row data:', error);
        return null;
      }
    }

    async handleAnalysisResult(row, emailId, result, emailData) {
      const isPhishing = result.prediction === 'phish' || result.threat;
      const settings = await this.getSettings();

      if (isPhishing) {
        console.log('[PhishGuard] Threat detected in Gmail:', emailId);
        row.classList.add('phishguard-warning');

        this.addWarningIcon(row, result);

        if (settings.autoQuarantine && result.confidence_score > settings.confidenceThreshold) {
          setTimeout(async () => {
            await this.moveToQuarantine(emailData, row);
          }, 1000); // Increased from 500ms to 1000ms for stability
        }
      } else if (settings.showSafeIndicators) {
        row.classList.add('phishguard-safe');
        const nameElement = row.querySelector('.yW');
        if (nameElement && !nameElement.querySelector('.phishguard-icon')) {
          const icon = document.createElement('span');
          icon.className = 'phishguard-icon';
          icon.innerHTML = '✓';
          icon.title = 'Verified safe by PhishGuard';
          icon.style.color = '#28a745';
          nameElement.insertBefore(icon, nameElement.firstChild);
        }
      }
    }

    addWarningIcon(row, result) {
      const nameElement = row.querySelector('.yW');
      
      if (nameElement && !nameElement.querySelector('.phishguard-icon')) {
        const icon = document.createElement('span');
        icon.className = 'phishguard-icon';
        icon.innerHTML = '⚠️';
        icon.title = `Security Warning: ${result.threat_level || 'Potential phishing'} (${Math.round(result.confidence_score * 100)}% confidence)\nClick email for details`;
        nameElement.insertBefore(icon, nameElement.firstChild);
      }
    }

    monitorEmailView() {
      document.addEventListener('click', (e) => {
        if (!isExtensionContextValid()) return;
        
        const emailRow = e.target.closest('tr.zA');
        if (emailRow) {
          // Increased delay to ensure email is fully loaded
          setTimeout(() => this.scanOpenEmail(), 1000);
        }
      });

      let lastUrl = location.href;
      new MutationObserver(() => {
        if (!this.isActive || !isExtensionContextValid()) return;
        
        const url = location.href;
        if (url !== lastUrl) {
          lastUrl = url;
          if (url.includes('/mail/u/')) {
            // Increased delay for URL-based navigation
            setTimeout(() => this.scanOpenEmail(), 1500);
          }
        }
      }).observe(document, { subtree: true, childList: true });
    }

    async scanOpenEmail() {
      if (!isExtensionContextValid()) {
        console.warn('[PhishGuard] Cannot scan email - extension context invalidated');
        return;
      }

      const emailView = document.querySelector('[role="main"] [data-message-id]') ||
                       document.querySelector('.adn.ads');
      
      if (!emailView) {
        console.log('[PhishGuard] Email view not found yet');
        return;
      }

      const emailData = this.extractFullEmailData(emailView);
      if (!emailData) return;

      try {
        const result = await this.analyzeEmail(emailData);
        if (!result) return;

        const isPhishing = result.prediction === 'phish' || result.threat;

        if (isPhishing || (await this.getSettings()).showSafeIndicators) {
          const banner = this.showWarningBanner(emailView, result, emailData);
          
          const subjectElement = emailView.querySelector('h2') || 
                                emailView.querySelector('.hP');
          
          if (subjectElement && subjectElement.parentNode) {
            subjectElement.parentNode.insertBefore(banner, subjectElement.nextSibling);
          } else {
            emailView.insertBefore(banner, emailView.firstChild);
          }
        }
      } catch (error) {
        console.error('[PhishGuard] Error scanning open Gmail email:', error);
      }
    }

    extractFullEmailData(emailView) {
      try {
        const senderElement = emailView.querySelector('[email]') ||
                             emailView.querySelector('.gD[email]');
        const sender = senderElement?.getAttribute('email') || '';
        const senderName = senderElement?.getAttribute('name') || 
                          senderElement?.textContent || '';

        const subjectElement = emailView.querySelector('h2') ||
                              emailView.querySelector('.hP');
        const subject = subjectElement?.textContent || '';

        const bodyElement = emailView.querySelector('[data-message-id] .a3s') ||
                           emailView.querySelector('.a3s.aiL');
        const body = bodyElement?.innerHTML || '';
        const bodyText = bodyElement?.textContent || '';

        const attachmentElements = emailView.querySelectorAll('.aZo');
        const attachments = Array.from(attachmentElements).map(att => ({
          name: att.textContent.trim()
        }));

        const spfPass = emailView.querySelector('[data-tooltip*="SPF: PASS"]') !== null ||
                       emailView.textContent.includes('mailed-by:');
        const dkimPass = emailView.querySelector('[data-tooltip*="DKIM"]') !== null;

        const urls = this.extractURLs(body + ' ' + bodyText);

        return {
          from: sender,
          fromName: senderName,
          subject: subject,
          body: body,
          bodyText: bodyText,
          timestamp: Date.now(),
          isReply: subject.toLowerCase().startsWith('re:') || 
                  subject.toLowerCase().startsWith('fwd:'),
          attachments: attachments,
          spfPass: spfPass,
          dkimPass: dkimPass,
          urls: urls,
          provider: 'gmail'
        };
      } catch (error) {
        console.error('[PhishGuard] Error extracting full Gmail email data:', error);
        return null;
      }
    }

    async moveToQuarantine(emailData, row = null) {
      if (!isExtensionContextValid()) return;

      try {
        console.log('[PhishGuard] Moving Gmail email to spam');

        const spamButton = document.querySelector('[aria-label*="Report spam"]') ||
                          document.querySelector('[data-tooltip*="Report spam"]') ||
                          document.querySelector('[title*="Report spam"]');

        if (row) {
          row.click();
          await this.sleep(500); // Increased from 300ms
        }

        if (spamButton && !spamButton.disabled) {
          spamButton.click();
          this.showQuarantineNotice('Email moved to Spam');

          safeSendMessage({
            action: 'emailQuarantined',
            data: {
              provider: 'gmail',
              email: emailData
            }
          });

          return;
        }

        // Fallback: keyboard shortcut
        const event = new KeyboardEvent('keydown', {
          key: '!',
          code: 'Digit1',
          shiftKey: true,
          bubbles: true
        });
        document.dispatchEvent(event);

        this.showQuarantineNotice('Email reported as spam');

        safeSendMessage({
          action: 'emailQuarantined',
          data: {
            provider: 'gmail',
            email: emailData
          }
        });

      } catch (error) {
        console.error('[PhishGuard] Error moving Gmail email to quarantine:', error);
        this.showQuarantineNotice('Unable to automatically quarantine. Please report as spam manually.');
      }
    }

    setupKeyboardShortcuts() {
      document.addEventListener('keydown', async (e) => {
        if (!isExtensionContextValid()) return;

        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
          e.preventDefault();
          
          const selectedEmail = document.querySelector('tr.zA.x7');
          if (selectedEmail) {
            const emailData = this.extractEmailDataFromRow(selectedEmail);
            if (emailData) {
              await this.moveToQuarantine(emailData, selectedEmail);
            }
          }
        }
      });
    }

    async analyzeEmail(emailData) {
      if (!isExtensionContextValid()) {
        console.warn('[PhishGuard] Cannot analyze - extension context invalidated');
        return { prediction: 'safe', confidence_score: 0, threat: false };
      }

      return new Promise((resolve) => {
        safeSendMessage({
          action: 'analyzeEmail',
          data: emailData
        }, (response) => {
          if (!response) {
            resolve({ prediction: 'safe', confidence_score: 0, threat: false });
          } else if (response.success && response.result) {
            resolve(response.result);
          } else {
            resolve({ prediction: 'safe', confidence_score: 0, threat: false });
          }
        });
      });
    }

    showWarningBanner(emailView, result, emailData) {
      const existingBanner = emailView.querySelector('.phishguard-banner');
      if (existingBanner) {
        existingBanner.remove();
      }

      const banner = document.createElement('div');
      banner.className = 'phishguard-banner';
      
      const isPhishing = result.prediction === 'phish' || result.threat;
      const bgColor = isPhishing ? '#fff3cd' : '#d1ecf1';
      const borderColor = isPhishing ? '#ffc107' : '#0dcaf0';
      const icon = isPhishing ? '⚠️' : '✓';
      const title = isPhishing ? 'Security Warning' : 'Safe Email';
      const message = isPhishing 
        ? `This email has been flagged as potential phishing (${Math.round(result.confidence_score * 100)}% confidence)`
        : 'This email appears to be safe';
      
      banner.style.cssText = `
        background: ${bgColor};
        border: 2px solid ${borderColor};
        border-radius: 8px;
        padding: 16px;
        margin: 16px 0;
        font-family: Arial, sans-serif;
        font-size: 14px;
      `;
      
      banner.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px; font-size: 16px;">${icon} ${title}</div>
        <div>${message}</div>
      `;
      
      return banner;
    }

    showQuarantineNotice(message) {
      const existingNotice = document.querySelector('.phishguard-quarantine-notice');
      if (existingNotice) {
        existingNotice.remove();
      }

      const notice = document.createElement('div');
      notice.className = 'phishguard-quarantine-notice';
      notice.textContent = message;
      notice.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        font-family: Arial, sans-serif;
        font-size: 14px;
      `;
      document.body.appendChild(notice);
      setTimeout(() => notice.remove(), 3000);
    }

    destroy() {
      this.isActive = false;
      if (this.observer) {
        this.observer.disconnect();
      }
      console.log('[PhishGuard] Gmail monitor destroyed');
    }
  }

  // Initialize Gmail monitor with retry mechanism
  let gmailMonitor = null;
  let initAttempts = 0;
  const maxAttempts = 15; // Increased from 10

  function waitForBaseClass() {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        initAttempts++;
        
        if (typeof EmailMonitorBase !== 'undefined') {
          clearInterval(checkInterval);
          console.log('[PhishGuard] EmailMonitorBase found after', initAttempts, 'attempts');
          resolve();
        } else if (initAttempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error('EmailMonitorBase not loaded after ' + maxAttempts + ' attempts'));
        }
      }, 200); // Increased from 100ms to reduce CPU load
    });
  }

  async function initializeGmailMonitor() {
    console.log('[PhishGuard] Attempting to initialize Gmail monitor');
    
    if (!isExtensionContextValid()) {
      console.error('[PhishGuard] Cannot initialize - extension context is invalid. Please refresh the page.');
      return;
    }
    
    try {
      await waitForBaseClass();
      
      if (!gmailMonitor) {
        console.log('[PhishGuard] Creating new GmailMonitor instance');
        gmailMonitor = new GmailMonitor();
        
        if (typeof gmailMonitor.init !== 'function') {
          throw new Error('gmailMonitor.init is not a function');
        }
        
        await gmailMonitor.init();
        console.log('[PhishGuard] Gmail monitor initialized successfully');
      }
    } catch (error) {
      console.error('[PhishGuard] Failed to initialize Gmail monitor:', error);
      console.error('[PhishGuard] Error details:', error.message);
    }
  }

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    if (gmailMonitor) {
      gmailMonitor.destroy();
    }
  });

  // Start initialization with delayed retry logic
  function startInitialization() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeGmailMonitor, 500); // Wait 500ms after DOM ready
      });
    } else {
      // Document already loaded, wait a bit to ensure Gmail scripts are loaded
      setTimeout(initializeGmailMonitor, 1000);
    }
  }

  startInitialization();
})();