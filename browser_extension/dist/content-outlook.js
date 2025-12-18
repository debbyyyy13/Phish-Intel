// Outlook content script for email monitoring

class OutlookMonitor {
  constructor() {
    this.processedEmails = new Set();
    this.observer = null;
    this.init();
  }

  init() {
    console.log('Outlook Security Monitor initialized');
    this.waitForOutlook();
  }

  waitForOutlook() {
    const checkOutlook = setInterval(() => {
      if (document.querySelector('[role="main"]') || document.querySelector('.customScrollBar')) {
        clearInterval(checkOutlook);
        this.startMonitoring();
      }
    }, 1000);

    setTimeout(() => clearInterval(checkOutlook), 30000);
  }

  startMonitoring() {
    console.log('Starting Outlook monitoring');
    
    this.observer = new MutationObserver(() => {
      this.checkForNewEmails();
    });

    const mainContent = document.querySelector('[role="main"]') || document.querySelector('.customScrollBar');
    if (mainContent) {
      this.observer.observe(mainContent, {
        childList: true,
        subtree: true
      });
    }

    this.checkForNewEmails();
    this.monitorEmailView();
  }

  checkForNewEmails() {
    // Outlook uses different selectors depending on version
    const emailRows = document.querySelectorAll('[role="listitem"]') || 
                      document.querySelectorAll('[data-convid]') ||
                      document.querySelectorAll('.customScrollBar [draggable="true"]');
    
    emailRows.forEach(row => {
      const emailId = this.getEmailId(row);
      if (emailId && !this.processedEmails.has(emailId)) {
        this.processedEmails.add(emailId);
        this.scanEmailRow(row, emailId);
      }
    });
  }

  getEmailId(row) {
    return row.getAttribute('data-convid') || 
           row.getAttribute('id') || 
           row.getAttribute('data-item-id') ||
           row.querySelector('[id]')?.getAttribute('id');
  }

  async scanEmailRow(row, emailId) {
    try {
      const emailData = this.extractEmailDataFromRow(row);
      
      if (!emailData) return;

      chrome.runtime.sendMessage({
        action: 'analyzeEmail',
        data: emailData
      }, (response) => {
        if (response && response.success) {
          this.handleAnalysisResult(row, emailId, response.result);
        }
      });
    } catch (error) {
      console.error('Error scanning email:', error);
    }
  }

  extractEmailDataFromRow(row) {
    try {
      // Extract sender - Outlook has multiple possible structures
      let sender = '';
      let senderName = '';
      
      const senderElement = row.querySelector('[title*="@"]') || 
                           row.querySelector('.XG4ay span') ||
                           row.querySelector('[aria-label*="From"]');
      
      if (senderElement) {
        const title = senderElement.getAttribute('title') || senderElement.textContent;
        senderName = title.split('<')[0].trim();
        const emailMatch = title.match(/<(.+?)>/);
        sender = emailMatch ? emailMatch[1] : title;
      }

      // Extract subject
      const subjectElement = row.querySelector('[role="heading"]') ||
                            row.querySelector('.G4ay2') ||
                            row.querySelector('[id*="Subject"]');
      const subject = subjectElement?.textContent || '';

      // Extract preview/snippet
      const snippetElement = row.querySelector('[role="heading"] + div') ||
                            row.querySelector('.Dsaw4');
      const snippet = snippetElement?.textContent || '';

      // Check if unread
      const isUnread = row.querySelector('[aria-label*="unread"]') !== null ||
                       row.classList.contains('unread');

      return {
        from: sender,
        fromName: senderName,
        subject: subject,
        body: snippet,
        bodyText: snippet,
        timestamp: Date.now(),
        isReply: subject.toLowerCase().startsWith('re:'),
        attachments: [],
        isUnread: isUnread
      };
    } catch (error) {
      console.error('Error extracting email data:', error);
      return null;
    }
  }

  handleAnalysisResult(row, emailId, result) {
    if (result.isThreat || result.threat) {
      console.log('Threat detected:', emailId);
      this.markAsSuspicious(row, result);
      
      chrome.runtime.sendMessage({
        action: 'updateStats',
        data: { isThreat: true }
      });
    } else {
      chrome.runtime.sendMessage({
        action: 'updateStats',
        data: { isThreat: false }
      });
    }
  }

  markAsSuspicious(row, result) {
    row.style.backgroundColor = '#fff3cd';
    row.style.borderLeft = '4px solid #dc3545';
    
    const warningIcon = document.createElement('span');
    warningIcon.innerHTML = '⚠️';
    warningIcon.style.cssText = 'margin-right: 8px; font-size: 16px;';
    warningIcon.title = `Security Warning: ${result.threatType || 'Suspicious email detected'} (${Math.round(result.confidence * 100)}% confidence)`;
    
    const nameElement = row.querySelector('[role="heading"]') || row.querySelector('.XG4ay');
    if (nameElement && !nameElement.querySelector('.security-warning')) {
      warningIcon.classList.add('security-warning');
      nameElement.insertBefore(warningIcon, nameElement.firstChild);
    }
  }

  monitorEmailView() {
    document.addEventListener('click', (e) => {
      const emailRow = e.target.closest('[role="listitem"]');
      if (emailRow) {
        setTimeout(() => this.scanOpenEmail(), 500);
      }
    });
  }

  async scanOpenEmail() {
    const emailView = document.querySelector('[role="region"][aria-label*="Message"]') ||
                      document.querySelector('.ReadingPaneContents');
    if (!emailView) return;

    const emailData = this.extractFullEmailData(emailView);
    if (!emailData) return;

    chrome.runtime.sendMessage({
      action: 'analyzeEmail',
      data: emailData
    }, (response) => {
      if (response && response.success && response.result.isThreat) {
        this.showWarningBanner(emailView, response.result);
      }
    });
  }

  extractFullEmailData(emailView) {
    try {
      // Extract sender
      const senderElement = emailView.querySelector('[title*="@"]') ||
                           emailView.querySelector('.LPBanner');
      let sender = '';
      let senderName = '';
      
      if (senderElement) {
        const title = senderElement.getAttribute('title') || senderElement.textContent;
        senderName = title.split('<')[0].trim();
        const emailMatch = title.match(/<(.+?)>/) || title.match(/[\w\.-]+@[\w\.-]+/);
        sender = emailMatch ? (emailMatch[1] || emailMatch[0]) : title;
      }

      // Extract subject
      const subjectElement = emailView.querySelector('[role="heading"]') ||
                            emailView.querySelector('.subject');
      const subject = subjectElement?.textContent || '';

      // Extract body
      const bodyElement = emailView.querySelector('[role="document"]') ||
                         emailView.querySelector('.rps_df6a');
      const body = bodyElement?.innerHTML || '';
      const bodyText = bodyElement?.textContent || '';

      // Extract attachments
      const attachmentElements = emailView.querySelectorAll('[data-extension]') ||
                                emailView.querySelectorAll('.attachmentCard');
      const attachments = Array.from(attachmentElements).map(att => ({
        name: att.getAttribute('aria-label') || att.textContent.trim()
      }));

      return {
        from: sender,
        fromName: senderName,
        subject: subject,
        body: body,
        bodyText: bodyText,
        timestamp: Date.now(),
        isReply: subject.toLowerCase().startsWith('re:'),
        attachments: attachments,
        spfPass: false,
        dkimPass: false
      };
    } catch (error) {
      console.error('Error extracting full email data:', error);
      return null;
    }
  }

  showWarningBanner(emailView, result) {
    const existingBanner = emailView.querySelector('.security-warning-banner');
    if (existingBanner) {
      existingBanner.remove();
    }

    const banner = document.createElement('div');
    banner.className = 'security-warning-banner';
    banner.style.cssText = `
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      padding: 12px 16px;
      margin: 16px 0;
      color: #721c24;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 1000;
      position: relative;
    `;

    banner.innerHTML = `
      <div style="display: flex; align-items: center;">
        <span style="font-size: 24px; margin-right: 12px;">⚠️</span>
        <div style="flex: 1;">
          <strong>Security Warning</strong>
          <p style="margin: 4px 0 0 0;">
            This email has been flagged as potentially ${result.threatType || 'suspicious'} 
            with ${Math.round(result.confidence * 100)}% confidence. 
            Please verify the sender before clicking any links or downloading attachments.
          </p>
        </div>
      </div>
    `;

    const firstElement = emailView.querySelector('[role="heading"]') || emailView.firstChild;
    if (firstElement) {
      emailView.insertBefore(banner, firstElement);
    }
  }
}

// Initialize monitor
const monitor = new OutlookMonitor();