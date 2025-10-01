// Gmail content script for email monitoring

class GmailMonitor {
  constructor() {
    this.processedEmails = new Set();
    this.observer = null;
    this.init();
  }

  init() {
    console.log('Gmail Security Monitor initialized');
    this.waitForGmail();
  }

  waitForGmail() {
    // Wait for Gmail to load
    const checkGmail = setInterval(() => {
      if (document.querySelector('[role="main"]')) {
        clearInterval(checkGmail);
        this.startMonitoring();
      }
    }, 1000);

    // Timeout after 30 seconds
    setTimeout(() => clearInterval(checkGmail), 30000);
  }

  startMonitoring() {
    console.log('Starting Gmail monitoring');
    
    // Monitor for new emails in inbox
    this.observer = new MutationObserver((mutations) => {
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
    
    // Also monitor when opening individual emails
    this.monitorEmailView();
  }

  checkForNewEmails() {
    // Find all email rows in inbox
    const emailRows = document.querySelectorAll('tr.zA');
    
    emailRows.forEach(row => {
      const emailId = this.getEmailId(row);
      if (emailId && !this.processedEmails.has(emailId)) {
        this.processedEmails.add(emailId);
        this.scanEmailRow(row, emailId);
      }
    });
  }

  getEmailId(row) {
    // Extract unique identifier from the row
    return row.getAttribute('data-legacy-message-id') || 
           row.getAttribute('id') || 
           row.querySelector('[data-message-id]')?.getAttribute('data-message-id');
  }

  async scanEmailRow(row, emailId) {
    try {
      const emailData = this.extractEmailDataFromRow(row);
      
      if (!emailData) return;

      // Send to background for analysis
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
      // Extract sender
      const senderElement = row.querySelector('[email]');
      const sender = senderElement?.getAttribute('email') || 
                     senderElement?.getAttribute('name') || '';

      // Extract sender name
      const nameElement = row.querySelector('.yW span');
      const senderName = nameElement?.textContent || '';

      // Extract subject
      const subjectElement = row.querySelector('.bog span');
      const subject = subjectElement?.textContent || '';

      // Extract snippet/preview
      const snippetElement = row.querySelector('.y2');
      const snippet = snippetElement?.textContent || '';

      // Check if unread
      const isUnread = row.classList.contains('zE');

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
      
      // Update stats
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
    // Add visual indicator
    row.style.backgroundColor = '#fff3cd';
    row.style.borderLeft = '4px solid #dc3545';
    
    // Add warning icon
    const warningIcon = document.createElement('span');
    warningIcon.innerHTML = '⚠️';
    warningIcon.style.cssText = 'margin-right: 8px; font-size: 16px;';
    warningIcon.title = `Security Warning: ${result.threatType || 'Suspicious email detected'} (${Math.round(result.confidence * 100)}% confidence)`;
    
    const nameElement = row.querySelector('.yW');
    if (nameElement && !nameElement.querySelector('.security-warning')) {
      warningIcon.classList.add('security-warning');
      nameElement.insertBefore(warningIcon, nameElement.firstChild);
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
  }

  async scanOpenEmail() {
    // Find the open email view
    const emailView = document.querySelector('[role="main"] [data-message-id]');
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
      const senderElement = emailView.querySelector('[email]');
      const sender = senderElement?.getAttribute('email') || '';
      const senderName = senderElement?.getAttribute('name') || '';

      // Extract subject
      const subjectElement = emailView.querySelector('h2');
      const subject = subjectElement?.textContent || '';

      // Extract body
      const bodyElement = emailView.querySelector('[data-message-id] .a3s');
      const body = bodyElement?.innerHTML || '';
      const bodyText = bodyElement?.textContent || '';

      // Extract attachments
      const attachmentElements = emailView.querySelectorAll('.aZo');
      const attachments = Array.from(attachmentElements).map(att => ({
        name: att.textContent.trim()
      }));

      // Check email headers for authentication
      const spfPass = emailView.querySelector('[data-tooltip*="SPF: PASS"]') !== null;
      const dkimPass = emailView.querySelector('[data-tooltip*="DKIM: PASS"]') !== null;

      return {
        from: sender,
        fromName: senderName,
        subject: subject,
        body: body,
        bodyText: bodyText,
        timestamp: Date.now(),
        isReply: subject.toLowerCase().startsWith('re:'),
        attachments: attachments,
        spfPass: spfPass,
        dkimPass: dkimPass
      };
    } catch (error) {
      console.error('Error extracting full email data:', error);
      return null;
    }
  }

  showWarningBanner(emailView, result) {
    // Remove existing banner
    const existingBanner = emailView.querySelector('.security-warning-banner');
    if (existingBanner) {
      existingBanner.remove();
    }

    // Create warning banner
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

    // Insert at the top of email
    const subjectElement = emailView.querySelector('h2');
    if (subjectElement) {
      subjectElement.parentNode.insertBefore(banner, subjectElement.nextSibling);
    }
  }
}

// Initialize monitor
const monitor = new GmailMonitor();