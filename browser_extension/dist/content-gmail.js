// content-gmail.js - Enhanced Gmail monitoring with quarantine support

// Wait for EmailMonitorBase to be available
(function() {
  'use strict';
  
  console.log('[PhishGuard] Gmail script loading...');

  class GmailMonitor extends EmailMonitorBase {
    constructor() {
      super('Gmail');
      this.gmailAPI = null;
      console.log('[PhishGuard] GmailMonitor constructor called');
    }

    // Override init to add Gmail-specific initialization
    async init() {
      console.log('[PhishGuard] GmailMonitor.init() called');
      
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
        const checkGmail = setInterval(() => {
          const main = document.querySelector('[role="main"]');
          const inbox = document.querySelector('[aria-label*="Inbox"]') || 
                       document.querySelector('[href*="inbox"]');
          
          if (main && inbox) {
            clearInterval(checkGmail);
            console.log('[PhishGuard] Gmail interface detected');
            resolve();
          }
        }, 1000);

        setTimeout(() => {
          clearInterval(checkGmail);
          console.warn('[PhishGuard] Gmail timeout');
          resolve();
        }, 30000);
      });
    }

    startMonitoring() {
      console.log('[PhishGuard] Starting Gmail monitoring');
      
      // Monitor inbox for new emails
      this.observer = new MutationObserver(() => {
        this.checkForNewEmails();
      });

      const mainContent = document.querySelector('[role="main"]');
      if (mainContent) {
        this.observer.observe(mainContent, {
          childList: true,
          subtree: true
        });
      }

      // Initial scan
      this.checkForNewEmails();
      
      // Monitor email viewing
      this.monitorEmailView();

      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();
    }

    checkForNewEmails() {
      // Gmail email rows
      const emailRows = document.querySelectorAll('tr.zA:not([data-phishguard-processed])');
      
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
      try {
        row.classList.add('phishguard-processing');

        const emailData = this.extractEmailDataFromRow(row);
        if (!emailData) {
          row.classList.remove('phishguard-processing');
          return;
        }

        const result = await this.analyzeEmail(emailData);
        await this.handleAnalysisResult(row, emailId, result, emailData);

        // Update stats
        chrome.runtime.sendMessage({
          action: 'updateStats',
          data: { 
            isThreat: result.prediction === 'phish' || result.threat,
            provider: 'gmail'
          }
        });
      } catch (error) {
        console.error('[PhishGuard] Error scanning Gmail email:', error);
        row.classList.remove('phishguard-processing');
      }
    }

    extractEmailDataFromRow(row) {
      try {
        // Extract sender email
        const senderElement = row.querySelector('[email]');
        const sender = senderElement?.getAttribute('email') || 
                       senderElement?.getAttribute('name') || '';

        // Extract sender display name
        const nameElement = row.querySelector('.yW span[email]') || 
                           row.querySelector('.yW .gD');
        const senderName = nameElement?.getAttribute('name') || 
                          nameElement?.textContent || '';

        // Extract subject
        const subjectElement = row.querySelector('.bog span') || 
                              row.querySelector('[data-thread-id] span');
        const subject = subjectElement?.textContent || '';

        // Extract snippet
        const snippetElement = row.querySelector('.y2');
        const snippet = snippetElement?.textContent || '';

        // Check if unread
        const isUnread = row.classList.contains('zE');

        // Check for attachments
        const hasAttachment = row.querySelector('[title*="Attachment"]') !== null;

        // Extract date
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
      row.classList.remove('phishguard-processing');

      const isPhishing = result.prediction === 'phish' || result.threat;
      const settings = await this.getSettings();

      if (isPhishing) {
        console.log('[PhishGuard] Threat detected in Gmail:', emailId);
        row.classList.add('phishguard-warning');

        // Add warning icon
        this.addWarningIcon(row, result);

        // Auto-quarantine if enabled and confidence is high enough
        if (settings.autoQuarantine && result.confidence_score > settings.confidenceThreshold) {
          // Small delay before quarantine to ensure proper UI update
          setTimeout(async () => {
            await this.moveToQuarantine(emailData, row);
          }, 500);
        }
      } else if (settings.showSafeIndicators) {
        row.classList.add('phishguard-safe');
        // Optionally add safe icon
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
      // Monitor when user opens an email
      document.addEventListener('click', (e) => {
        const emailRow = e.target.closest('tr.zA');
        if (emailRow) {
          setTimeout(() => this.scanOpenEmail(), 500);
        }
      });

      // Also monitor for URL changes (Gmail is a single-page app)
      let lastUrl = location.href;
      new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
          lastUrl = url;
          if (url.includes('/mail/u/')) {
            setTimeout(() => this.scanOpenEmail(), 800);
          }
        }
      }).observe(document, { subtree: true, childList: true });
    }

    async scanOpenEmail() {
      const emailView = document.querySelector('[role="main"] [data-message-id]') ||
                       document.querySelector('.adn.ads');
      
      if (!emailView) return;

      const emailData = this.extractFullEmailData(emailView);
      if (!emailData) return;

      try {
        const result = await this.analyzeEmail(emailData);
        const isPhishing = result.prediction === 'phish' || result.threat;

        if (isPhishing || (await this.getSettings()).showSafeIndicators) {
          const banner = this.showWarningBanner(emailView, result, emailData);
          
          // Insert banner at the top of email
          const subjectElement = emailView.querySelector('h2') || 
                                emailView.querySelector('.hP');
          
          if (subjectElement) {
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
        // Extract sender
        const senderElement = emailView.querySelector('[email]') ||
                             emailView.querySelector('.gD[email]');
        const sender = senderElement?.getAttribute('email') || '';
        const senderName = senderElement?.getAttribute('name') || 
                          senderElement?.textContent || '';

        // Extract subject
        const subjectElement = emailView.querySelector('h2') ||
                              emailView.querySelector('.hP');
        const subject = subjectElement?.textContent || '';

        // Extract body
        const bodyElement = emailView.querySelector('[data-message-id] .a3s') ||
                           emailView.querySelector('.a3s.aiL');
        const body = bodyElement?.innerHTML || '';
        const bodyText = bodyElement?.textContent || '';

        // Extract attachments
        const attachmentElements = emailView.querySelectorAll('.aZo');
        const attachments = Array.from(attachmentElements).map(att => ({
          name: att.textContent.trim()
        }));

        // Check email authentication
        const spfPass = emailView.querySelector('[data-tooltip*="SPF: PASS"]') !== null ||
                       emailView.textContent.includes('mailed-by:');
        const dkimPass = emailView.querySelector('[data-tooltip*="DKIM"]') !== null;

        // Extract URLs
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
      try {
        console.log('[PhishGuard] Moving Gmail email to spam');

        // Find the spam button in toolbar
        const spamButton = document.querySelector('[aria-label*="Report spam"]') ||
                          document.querySelector('[data-tooltip*="Report spam"]') ||
                          document.querySelector('[title*="Report spam"]');

        if (row) {
          // If we have the row, select it first
          row.click();
          await this.sleep(300);
        }

        if (spamButton && !spamButton.disabled) {
          spamButton.click();
          this.showQuarantineNotice('Email moved to Spam');

          // Notify background
          chrome.runtime.sendMessage({
            action: 'emailQuarantined',
            data: {
              provider: 'gmail',
              email: emailData
            }
          });

          return;
        }

        // Fallback: use keyboard shortcut (!) for spam
        const event = new KeyboardEvent('keydown', {
          key: '!',
          code: 'Digit1',
          shiftKey: true,
          bubbles: true
        });
        document.dispatchEvent(event);

        this.showQuarantineNotice('Email reported as spam');

        chrome.runtime.sendMessage({
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
        // Ctrl/Cmd + Shift + P: Mark as phishing and quarantine
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

    // Methods that need to be implemented or called from background
    async analyzeEmail(emailData) {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'analyzeEmail',
          data: emailData
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[PhishGuard] Error analyzing email:', chrome.runtime.lastError);
            resolve({ prediction: 'safe', confidence_score: 0, threat: false });
          } else {
            resolve(response || { prediction: 'safe', confidence_score: 0, threat: false });
          }
        });
      });
    }

    showWarningBanner(emailView, result, emailData) {
      // Check if banner already exists
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
      // Check if notice already exists
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
  }

  // Initialize Gmail monitor with retry mechanism
  let gmailMonitor = null;
  let initAttempts = 0;
  const maxAttempts = 10;

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
      }, 100); // Check every 100ms
    });
  }

  async function initializeGmailMonitor() {
    console.log('[PhishGuard] Attempting to initialize Gmail monitor');
    
    try {
      // Wait for base class to be available
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

  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGmailMonitor);
  } else {
    initializeGmailMonitor();
  }
})();