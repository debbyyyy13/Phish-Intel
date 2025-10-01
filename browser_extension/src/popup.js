// Popup script for extension UI

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadStats();
  setupEventListeners();
});

function loadSettings() {
  chrome.storage.sync.get(['enabled', 'autoScan', 'notificationsEnabled', 'apiKey'], (settings) => {
    document.getElementById('enableToggle').checked = settings.enabled !== false;
    document.getElementById('autoScanToggle').checked = settings.autoScan !== false;
    document.getElementById('notificationsToggle').checked = settings.notificationsEnabled !== false;
    document.getElementById('apiKey').value = settings.apiKey || '';
  });
}

function loadStats() {
  chrome.storage.local.get(['totalScanned', 'threatsDetected', 'lastScan'], (stats) => {
    document.getElementById('totalScanned').textContent = stats.totalScanned || 0;
    document.getElementById('threatsDetected').textContent = stats.threatsDetected || 0;
  });
}

function setupEventListeners() {
  // Toggle switches
  document.getElementById('enableToggle').addEventListener('change', (e) => {
    chrome.storage.sync.set({ enabled: e.target.checked });
    showStatus(e.target.checked ? 'Scanner enabled' : 'Scanner disabled', 'success');
  });

  document.getElementById('autoScanToggle').addEventListener('change', (e) => {
    chrome.storage.sync.set({ autoScan: e.target.checked });
    showStatus(e.target.checked ? 'Auto-scan enabled' : 'Auto-scan disabled', 'success');
  });

  document.getElementById('notificationsToggle').addEventListener('change', (e) => {
    chrome.storage.sync.set({ notificationsEnabled: e.target.checked });
    showStatus(e.target.checked ? 'Notifications enabled' : 'Notifications disabled', 'success');
  });

  // Save API key
  document.getElementById('saveApiKey').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!apiKey) {
      showStatus('API key removed. Using demo mode.', 'success');
      chrome.storage.sync.set({ apiKey: '' });
      return;
    }

    // Validate API key format (basic validation)
    if (apiKey.length < 20) {
      showStatus('Invalid API key format', 'error');
      return;
    }

    chrome.storage.sync.set({ apiKey }, () => {
      showStatus('API key saved successfully', 'success');
    });
  });

  // View dashboard
  document.getElementById('viewDashboard').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://your-dashboard-url.com' });
  });

  // Refresh stats every 5 seconds
  setInterval(loadStats, 5000);
}

function showStatus(message, type) {
  const statusDiv = document.getElementById('statusMessage');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';

  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}