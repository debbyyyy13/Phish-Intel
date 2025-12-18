// popup.js - Enhanced with dashboard integration

document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
  loadSettings();
  loadStats();
  setupEventListeners();
  
  // Auto-refresh stats every 5 seconds
  setInterval(loadStats, 5000);
});

async function checkAuthStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getAuth' });
    const { userToken, userId } = response || {};
    
    const statusDot = document.getElementById('statusDot');
    const authText = document.getElementById('authText');
    const syncInfo = document.getElementById('syncInfo');
    const syncBtn = document.getElementById('syncBtn');
    
    if (userToken && userId) {
      statusDot.classList.remove('offline');
      authText.textContent = 'Connected to Dashboard';
      syncInfo.textContent = `Syncing with your dashboard (User ID: ${userId})`;
      syncBtn.textContent = 'Sync Now';
      syncBtn.disabled = false;
      
      // Try to sync immediately
      syncWithDashboard();
    } else {
      statusDot.classList.add('offline');
      authText.textContent = 'Not connected';
      syncInfo.innerHTML = `
        <a href="#" id="signInLink" style="color: #667eea; font-weight: 600;">
          Sign in to your dashboard
        </a> to sync statistics
      `;
      syncBtn.textContent = 'Sign In First';
      syncBtn.disabled = true;
      
      // Add click handler for sign in link
      setTimeout(() => {
        const signInLink = document.getElementById('signInLink');
        if (signInLink) {
          signInLink.addEventListener('click', (e) => {
            e.preventDefault();
            openDashboard();
          });
        }
      }, 100);
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
  }
}

function loadSettings() {
  chrome.storage.sync.get([
    'enabled',
    'autoScan',
    'notificationsEnabled',
    'apiKey',
    'apiEndpoint'
  ], (settings) => {
    document.getElementById('enableToggle').checked = settings.enabled !== false;
    document.getElementById('autoScanToggle').checked = settings.autoScan !== false;
    document.getElementById('notificationsToggle').checked = settings.notificationsEnabled !== false;
    document.getElementById('apiKey').value = settings.apiKey || '';
    document.getElementById('apiEndpoint').value = settings.apiEndpoint || '';
  });
}

async function loadStats() {
  try {
    // First try to get stats from local storage
    chrome.storage.local.get([
      'totalScanned',
      'threatsDetected',
      'emailsQuarantined',
      'lastScan',
      'lastSync'
    ], (stats) => {
      document.getElementById('totalScanned').textContent = stats.totalScanned || 0;
      document.getElementById('threatsDetected').textContent = stats.threatsDetected || 0;
      
      // Update sync info if available
      if (stats.lastSync) {
        const syncTime = new Date(stats.lastSync);
        const timeDiff = Date.now() - stats.lastSync;
        
        if (timeDiff < 60000) { // Less than 1 minute
          document.getElementById('syncInfo').textContent = 'Synced just now';
        } else if (timeDiff < 3600000) { // Less than 1 hour
          const minutes = Math.floor(timeDiff / 60000);
          document.getElementById('syncInfo').textContent = `Synced ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
          document.getElementById('syncInfo').textContent = `Last synced at ${syncTime.toLocaleTimeString()}`;
        }
      }
    });
  } catch (error) {
    console.error('Error loading stats:', error);
  }
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

  // Save configuration
  document.getElementById('saveConfig').addEventListener('click', saveConfiguration);
  
  // Sync button
  document.getElementById('syncBtn').addEventListener('click', syncWithDashboard);

  // View dashboard
  document.getElementById('viewDashboard').addEventListener('click', (e) => {
    e.preventDefault();
    openDashboard();
  });

  // View options
  document.getElementById('viewOptions').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

function saveConfiguration() {
  const apiEndpoint = document.getElementById('apiEndpoint').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  
  const config = {};
  
  if (apiEndpoint) {
    // Validate URL format
    try {
      new URL(apiEndpoint);
      config.apiEndpoint = apiEndpoint;
    } catch (error) {
      showStatus('Invalid API endpoint URL', 'error');
      return;
    }
  }
  
  if (apiKey) {
    if (apiKey.length < 10) {
      showStatus('API key too short', 'error');
      return;
    }
    config.apiKey = apiKey;
  }
  
  if (Object.keys(config).length === 0) {
    showStatus('No changes to save', 'error');
    return;
  }

  chrome.storage.sync.set(config, () => {
    showStatus('Configuration saved successfully', 'success');
    
    // Test the connection
    if (apiEndpoint) {
      testConnection(apiEndpoint, apiKey);
    }
  });
}

async function testConnection(endpoint, apiKey) {
  try {
    const authHeader = apiKey ? `Bearer ${apiKey}` : 'Bearer demo-key';
    
    const response = await fetch(`${endpoint}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    if (response.ok) {
      const data = await response.json();
      showStatus(`✅ Connected! Status: ${data.status}`, 'success');
    } else {
      showStatus(`⚠️ Connection failed: ${response.status}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ Connection error: ${error.message}`, 'error');
  }
}

async function syncWithDashboard() {
  try {
    const syncBtn = document.getElementById('syncBtn');
    const originalText = syncBtn.textContent;
    syncBtn.textContent = 'Syncing...';
    syncBtn.disabled = true;
    
    const response = await chrome.runtime.sendMessage({ action: 'syncWithDashboard' });
    
    if (response.success) {
      showStatus('✅ Synced with dashboard successfully', 'success');
      
      // Reload stats to show updated values
      await loadStats();
    } else {
      throw new Error(response.error || 'Sync failed');
    }
  } catch (error) {
    console.error('Sync error:', error);
    showStatus(`❌ Sync failed: ${error.message}`, 'error');
  } finally {
    const syncBtn = document.getElementById('syncBtn');
    syncBtn.textContent = 'Sync Now';
    syncBtn.disabled = false;
  }
}

function openDashboard() {
  // Get the API endpoint to construct dashboard URL
  chrome.storage.sync.get(['apiEndpoint'], (settings) => {
    let dashboardUrl = 'http://localhost:5173/dashboard'; // Default
    
    if (settings.apiEndpoint) {
      // Convert API endpoint to dashboard URL
      // e.g., http://localhost:8000/api/v1 -> http://localhost:5173/dashboard
      try {
        const url = new URL(settings.apiEndpoint);
        
        // Assume frontend runs on different port
        if (url.hostname === 'localhost' && url.port === '8000') {
          dashboardUrl = 'http://localhost:5173/dashboard';
        } else {
          // For production, remove /api/v1 path
          const baseUrl = settings.apiEndpoint.replace('/api/v1', '');
          dashboardUrl = `${baseUrl}/dashboard`;
        }
      } catch (error) {
        // Use default
      }
    }
    
    chrome.tabs.create({ url: dashboardUrl });
  });
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

// Format numbers with commas
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}