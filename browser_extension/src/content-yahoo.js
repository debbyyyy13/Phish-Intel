// content-yahoo.js - Yahoo Mail monitoring implementation

class YahooMonitor extends EmailMonitorBase {
  constructor() {
    super('Yahoo Mail');
  }

  async waitForInterface() {
    return new Promise((resolve) => {
      const checkYahoo = setInterval(() => {
        // Yahoo Mail uses different selectors
        const mailList = document.querySelector('[data-test-id="message-list"]') ||
                        document.querySelector('.messages-list') ||
                        document.querySelector('#mail-app-component');
        
        if (mailList) {
          clearInterval(checkYahoo);
          console.log('[PhishGuard] Yahoo Mail interface detected');
          resolve();
        }
      }, 1000);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkYahoo);
        console.warn('[PhishGuard] Yahoo Mail interface not detected after timeout');
        resolve();
      }, 30000);
    });
  }

  startMonitoring() {
    console.log('[PhishGuard] Starting Yahoo Mail monitoring');

    // Monitor for new emails in list
    this.observer = new MutationObserver(() => {
      this.checkForNewEmails();
    });

    const mailContainer = document.querySelector('[data-test-id="message-list"]') ||
                         document.querySelector('.messages-list') ||
                         document.querySelector('#mail-app-component');

    if (mailContainer) {
      this.observer.observe(mailContainer, {
        childList: true,
        subtree: true
      });
    }

    // Initial scan
    this.checkForNewEmails();

    // Monitor email viewing
    this.monitorEmailView();
  }

  checkForNewEmails() {
    // Yahoo Mail message list items
    const emailRows = document.querySelectorAll('[data-test-id="message-list-item"]') ||
                     document.querySelectorAll('li[data-test-id^="message-"]') ||
                     document.querySelectorAll('.message-item');

    emailRows.forEach(row => {
      const emailId = this.getEmailId(row);
      if (emailId && !this.processedEmails.has(emailId)) {
        this.processedEmails.add(emailId);
        this.scanEmailRow(row, emailId);
      }
    });
  }

  getEmailId(row) {
    return row.getAttribute('data-test-id') ||
           row.getAttribute('data-message-id') ||
           row.getAttribute('id') ||
           row.querySelector('[data-test-id]')?.getAttribute('data-test-id');
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
      this.handleAnalysisResult(row, emailId, result, emailData);

      // Update stats
      chrome.runtime.sendMessage({
        action: 'updateStats',
        data: { 
          isThreat: result.prediction === 'phish' || result.threat,
          provider: 'yahoo'
        }
      });
    } catch (error) {
      console.error('[PhishGuard] Error scanning Yahoo email:', error);
      row.classList.remove('phishguard-processing');
    }
  }

  extractEmailDataFromRow(row) {
    try {
      // Extract sender
      const senderElement = row.querySelector('[data-test-id="message-list-sender"]') ||
                           row.querySelector('.sender-name') ||
                           row.querySelector('[title*="@"]');
      
      let sender = '';
      let senderName = '';
      
      if (senderElement) {
        const text = senderElement.textContent || senderElement.getAttribute('title') || '';
        senderName = text.split('<')[0].trim();
        const emailMatch = text.match(/<(.+?)>/) || text.match(/[\w\.-]+@[\w\.-]+/);
        sender = emailMatch ? (emailMatch[1] || emailMatch[0]) : text;
      }

      // Extract subject
      const subjectElement = row.querySelector('[data-test-id="message-list-subject"]') ||
                            row.querySelector('.subject') ||
                            row.querySelector('[title]');
      const subject = subjectElement?.textContent || subjectElement?.getAttribute('title') || '';

      // Extract snippet/preview
      const snippetElement = row.querySelector('[data-test-id="message-list-snippet"]') ||
                            row.querySelector('.snippet') ||
                            row.querySelector('.preview-text');
      const snippet = snippetElement?.textContent || '';

      // Check if unread
      const isUnread = row.classList.contains('unread') ||
                      row.querySelector('[data-test-id*="unread"]') !== null;

      // Extract date
      const dateElement = row.querySelector('[data-test-id="message-list-item-date"]') ||
                         row.querySelector('.date');
      const dateText = dateElement?.textContent || '';

      return {
        from: sender,
        fromName: senderName,
        subject: subject,
        body: snippet,
        bodyText: snippet,
        timestamp: Date.now(),
        isReply: subject.toLowerCase().startsWith('re:'),
        attachments: [],
        isUnread: isUnread,
        dateText: dateText
      };
    } catch (error) {
      console.error('[PhishGuard] Error extracting Yahoo email data:', error);
      return null;
    }
  }

  async handleAnalysisResult(row, emailId, result, emailData) {
    row.classList.remove('phishguard-processing');

    const isPhishing = result.prediction === 'phish' || result.threat;
    const settings = await this.getSettings();

    if (isPhishing) {
      console.log('[PhishGuard] Threat detected in Yahoo:', emailId);
      row.classList.add('phishguard-warning');

      // Add warning icon
      this.addWarningIcon(row, result);

      // Auto-quarantine if enabled
      if (settings.autoQuarantine && result.confidence_score > settings.confidenceThreshold) {
        await this.moveToQuarantine(emailData);
      }
    } else {
      row.classList.add('phishguard-safe');
    }
  }

  addWarningIcon(row, result) {
    const nameElement = row.querySelector('[data-test-id="message-list-sender"]') ||
                       row.querySelector('.sender-name');
    
    if (nameElement && !nameElement.querySelector('.phishguard-icon')) {
      const icon = document.createElement('span');
      icon.className = 'phishguard-icon';
      icon.innerHTML = '⚠️';
      icon.title = `Security Warning: ${result.threat_level || 'Potential phishing'} (${Math.round(result.confidence_score * 100)}% confidence)`;
      nameElement.insertBefore(icon, nameElement.firstChild);
    }
  }

  monitorEmailView() {
    // Monitor when user opens an email
    document.addEventListener('click', (e) => {
      const emailRow = e.target.closest('[data-test-id="message-list-item"]') ||
                      e.target.closest('.message-item');
      
      if (emailRow) {
        setTimeout(() => this.scanOpenEmail(), 500);
      }
    });
  }

  async scanOpenEmail() {
    const emailView = document.querySelector('[data-test-id="message-view"]') ||
                     document.querySelector('.message-content') ||
                     document.querySelector('[role="article"]');
    
    if (!emailView) return;

    const emailData = this.extractFullEmailData(emailView);
    if (!emailData) return;

    try {
      const result = await this.analyzeEmail(emailData);

      const isPhishing = result.prediction === 'phish' || result.threat;
      if (isPhishing) {
        const banner = this.showWarningBanner(emailView, result, emailData);
        
        // Insert banner at the top
        const insertPoint = emailView.querySelector('[data-test-id="message-header"]') ||
                          emailView.firstChild;
        
        if (insertPoint) {
          insertPoint.parentNode.insertBefore(banner, insertPoint.nextSibling);
        } else {
          emailView.insertBefore(banner, emailView.firstChild);
        }
      }
    } catch (error) {
      console.error('[PhishGuard] Error scanning open Yahoo email:', error);
    }
  }

  extractFullEmailData(emailView) {
    try {
      // Extract sender
      const senderElement = emailView.querySelector('[data-test-id="message-from"]') ||
                           emailView.querySelector('.sender') ||
                           emailView.querySelector('[title*="@"]');
      
      let sender = '';
      let senderName = '';
      
      if (senderElement) {
        const text = senderElement.textContent || senderElement.getAttribute('title') || '';
        senderName = text.split('<')[0].trim();
        const emailMatch = text.match(/<(.+?)>/) || text.match(/[\w\.-]+@[\w\.-]+/);
        sender = emailMatch ? (emailMatch[1] || emailMatch[0]) : text;
      }

      // Extract subject
      const subjectElement = emailView.querySelector('[data-test-id="message-subject"]') ||
                            emailView.querySelector('h2') ||
                            emailView.querySelector('.subject');
      const subject = subjectElement?.textContent || '';

      // Extract body
      const bodyElement = emailView.querySelector('[data-test-id="message-view-body-content"]') ||
                         emailView.querySelector('.message-body') ||
                         emailView.querySelector('[role="document"]');
      const body = bodyElement?.innerHTML || '';
      const bodyText = bodyElement?.textContent || '';

      // Extract attachments
      const attachmentElements = emailView.querySelectorAll('[data-test-id*="attachment"]') ||
                                emailView.querySelectorAll('.attachment');
      const attachments = Array.from(attachmentElements).map(att => ({
        name: att.textContent.trim() || att.getAttribute('title') || 'attachment'
      }));

      // Extract headers info
      const headersButton = emailView.querySelector('[data-test-id="message-view-more-info"]');
      const hasHeaders = headersButton !== null;

      return {
        from: sender,
        fromName: senderName,
        subject: subject,
        body: body,
        bodyText: bodyText,
        timestamp: Date.now(),
        isReply: subject.toLowerCase().startsWith('re:'),
        attachments: attachments,
        spfPass: false, // Yahoo doesn't expose this easily
        dkimPass: false,
        urls: this.extractURLs(body + ' ' + bodyText)
      };
    } catch (error) {
      console.error('[PhishGuard] Error extracting full Yahoo email data:', error);
      return null;
    }
  }

  async moveToQuarantine(emailData) {
    try {
      console.log('[PhishGuard] Moving Yahoo email to spam/trash');
      
      // Find the current email row or view
      const emailElement = document.querySelector('[data-test-id="message-view"]') ||
                          document.querySelector('.message-content');
      
      if (!emailElement) {
        console.warn('[PhishGuard] Could not find email element for quarantine');
        return;
      }

      // Yahoo Mail - try to click spam/trash button
      const spamButton = document.querySelector('[data-test-id="toolbar-spamButton"]') ||
                        document.querySelector('[title*="Spam"]') ||
                        document.querySelector('[aria-label*="Spam"]');
      
      if (spamButton) {
        spamButton.click();
        this.showQuarantineNotice('Email moved to Spam folder');
        
        // Send quarantine notification to background
        chrome.runtime.sendMessage({
          action: 'emailQuarantined',
          data: {
            provider: 'yahoo',
            email: emailData
          }
        });
        
        return;
      }

      // Fallback: try trash/delete
      const deleteButton = document.querySelector('[data-test-id="toolbar-deleteButton"]') ||
                          document.querySelector('[title*="Delete"]') ||
                          document.querySelector('[aria-label*="Delete"]');
      
      if (deleteButton) {
        deleteButton.click();
        this.showQuarantineNotice('Email moved to Trash folder');
        
        chrome.runtime.sendMessage({
          action: 'emailQuarantined',
          data: {
            provider: 'yahoo',
            email: emailData
          }
        });
        
        return;
      }

      console.warn('[PhishGuard] Could not find spam/delete button for Yahoo');
      this.showQuarantineNotice('Unable to automatically quarantine. Please move to spam manually.');
      
    } catch (error) {
      console.error('[PhishGuard] Error moving Yahoo email to quarantine:', error);
      this.showQuarantineNotice('Error quarantining email. Please move to spam manually.');
    }
  }
}

// Initialize Yahoo monitor
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const monitor = new YahooMonitor();
    monitor.init();
  });
} else {
  const monitor = new YahooMonitor();
  monitor.init();
}