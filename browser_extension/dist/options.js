// options.js - Settings and dashboard functionality

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadSettings();
  loadDashboard();
  loadHistory();
  setupEventListeners();
});

// Tab navigation
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      // Add active to clicked
      tab.classList.add('active');
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');

      // Reload data for dashboard and history tabs
      if (tabId === 'dashboard') {
        loadDashboard();
      } else if (tabId === 'history') {
        loadHistory();
      }
    });
  });
}

// Load settings
function loadSettings() {
  chrome.storage.sync.get([
    'enabled',
    'autoScan',
    'autoQuarantine',
    'showSafeIndicators',
    'notificationsEnabled',
    'confidenceThreshold',
    'apiEndpoint',
    'apiKey'
  ], (settings) => {
    document.getElementById('enabledToggle').checked = settings.enabled !== false;
    document.getElementById('autoScanToggle').checked = settings.autoScan !== false;
    document.getElementById('autoQuarantineToggle').checked = settings.autoQuarantine !== false;
    document.getElementById('showSafeToggle').checked = settings.showSafeIndicators === true;
    document.getElementById('notificationsToggle').checked = settings.notificationsEnabled !== false;
    
    const threshold = settings.confidenceThreshold || 0.6;
    document.getElementById('confidenceThreshold').value = threshold * 100;
    document.getElementById('thresholdValue').textContent = Math.round(threshold * 100) + '%';
    
    document.getElementById('apiEndpoint').value = settings.apiEndpoint || 'https://your-backend-api.com/api';
    document.getElementById('apiKey').value = settings.apiKey || '';
  });
}

// Load dashboard statistics
function loadDashboard() {
  chrome.storage.local.get([
    'totalScanned',
    'threatsDetected',
    'emailsQuarantined',
    'lastScan',
    'providerStats'
  ], (stats) => {
    // Overall stats
    const totalScanned = stats.totalScanned || 0;
    const threatsDetected = stats.threatsDetected || 0;
    const emailsQuarantined = stats.emailsQuarantined || 0;

    document.getElementById('totalScanned').textContent = formatNumber(totalScanned);
    document.getElementById('threatsDetected').textContent = formatNumber(threatsDetected);
    document.getElementById('emailsQuarantined').textContent = formatNumber(emailsQuarantined);

    // Detection rate
    const detectionRate = totalScanned > 0 ? (threatsDetected / totalScanned * 100).toFixed(1) : 0;
    document.getElementById('detectionRate').textContent = detectionRate + '%';

    // Last scan
    if (stats.lastScan) {
      const lastScanDate = new Date(stats.lastScan);
      document.getElementById('lastScan').textContent = formatDateTime(lastScanDate);
    } else {
      document.getElementById('lastScan').textContent = 'Never';
    }

    // Extension status
    chrome.storage.sync.get(['enabled'], (settings) => {
      const status = settings.enabled !== false ? '🟢 Active' : '🔴 Disabled';
      document.getElementById('extensionStatus').textContent = status;
    });

    // Provider stats
    const providerStats = stats.providerStats || {};
    renderProviderStats(providerStats);
  });
}

function renderProviderStats(providerStats) {
  const container = document.getElementById('providerStats');
  
  if (Object.keys(providerStats).length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No provider statistics yet</p>';
    return;
  }

  container.innerHTML = '';
  
  const providers = Object.entries(providerStats);
  providers.forEach(([provider, data]) => {
    const card = document.createElement('div');
    card.className = 'provider-card';
    
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    
    card.innerHTML = `
      <div class="provider-name">${providerName}</div>
      <div class="provider-value">${formatNumber(data.scanned)}</div>
      <div style="font-size: 12px; color: #6c757d; margin-top: 4px;">
        ${data.threats} threat${data.threats !== 1 ? 's' : ''} detected
      </div>
    `;
    
    container.appendChild(card);
  });
}

// Load history
function loadHistory() {
  chrome.storage.local.get(['analysisHistory'], (data) => {
    const history = data.analysisHistory || [];
    const tbody = document.querySelector('#historyTable tbody');
    
    if (history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">No scan history yet</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    
    // Show most recent first
    const recentHistory = history.slice().reverse().slice(0, 50);
    
    recentHistory.forEach(entry => {
      const row = document.createElement('tr');
      
      const date = new Date(entry.timestamp);
      const isPhishing = entry.prediction === 'phish';
      const confidence = Math.round((entry.confidence || 0) * 100);
      
      row.innerHTML = `
        <td>${formatDateTime(date)}</td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${sanitizeHTML(entry.from || 'Unknown')}</td>
        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis;">${sanitizeHTML(entry.subject || 'No subject')}</td>
        <td><span class="badge ${isPhishing ? 'badge-danger' : 'badge-success'}">${isPhishing ? 'Phishing' : 'Safe'}</span></td>
        <td>${confidence}%</td>
        <td>${capitalize(entry.provider || 'unknown')}</td>
      `;
      
      tbody.appendChild(row);
    });
  });
}

// Event listeners
function setupEventListeners() {
  // Confidence threshold slider
  const thresholdSlider = document.getElementById('confidenceThreshold');
  const thresholdValue = document.getElementById('thresholdValue');
  
  thresholdSlider.addEventListener('input', (e) => {
    thresholdValue.textContent = e.target.value + '%';
  });

  // Save settings
  document.getElementById('saveSettings').addEventListener('click', saveSettings);

  // Reset settings
  document.getElementById('resetSettings').addEventListener('click', resetSettings);

  // Test API connection
  document.getElementById('testApiBtn').addEventListener('click', testApiConnection);

  // Clear history
  document.getElementById('clearHistory').addEventListener('click', clearHistory);

  // Export history
  document.getElementById('exportHistory').addEventListener('click', exportHistory);

  // Auto-save on toggle changes
  const toggles = ['enabledToggle', 'autoScanToggle', 'autoQuarantineToggle', 'showSafeToggle', 'notificationsToggle'];
  toggles.forEach(toggleId => {
    document.getElementById(toggleId).addEventListener('change', () => {
      saveSettings(false); // Save without showing alert
    });
  });
}

function saveSettings(showAlert = true) {
  const settings = {
    enabled: document.getElementById('enabledToggle').checked,
    autoScan: document.getElementById('autoScanToggle').checked,
    autoQuarantine: document.getElementById('autoQuarantineToggle').checked,
    showSafeIndicators: document.getElementById('showSafeToggle').checked,
    notificationsEnabled: document.getElementById('notificationsToggle').checked,
    confidenceThreshold: parseFloat(document.getElementById('confidenceThreshold').value) / 100,
    apiEndpoint: document.getElementById('apiEndpoint').value.trim(),
    apiKey: document.getElementById('apiKey').value.trim()
  };

  chrome.storage.sync.set(settings, () => {
    if (showAlert) {
      showAlertMessage('Settings saved successfully!', 'success');
    }
  });
}

function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) {
    return;
  }

  const defaults = {
    enabled: true,
    autoScan: true,
    autoQuarantine: true,
    showSafeIndicators: false,
    notificationsEnabled: true,
    confidenceThreshold: 0.6,
    apiEndpoint: 'https://your-backend-api.com/api',
    apiKey: ''
  };

  chrome.storage.sync.set(defaults, () => {
    loadSettings();
    showAlertMessage('Settings reset to defaults', 'success');
  });
}

async function testApiConnection() {
  const btn = document.getElementById('testApiBtn');
  btn.textContent = 'Testing...';
  btn.disabled = true;

  try {
    const endpoint = document.getElementById('apiEndpoint').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();

    const response = await fetch(`${endpoint}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey || 'demo-key'}`
      }
    });

    if (response.ok) {
      showAlertMessage('✅ API connection successful!', 'success');
    } else {
      showAlertMessage(`❌ API connection failed: ${response.status} ${response.statusText}`, 'error');
    }
  } catch (error) {
    showAlertMessage(`❌ API connection failed: ${error.message}`, 'error');
  } finally {
    btn.textContent = 'Test Connection';
    btn.disabled = false;
  }
}

function clearHistory() {
  if (!confirm('Are you sure you want to clear all scan history?')) {
    return;
  }

  chrome.storage.local.set({ analysisHistory: [] }, () => {
    loadHistory();
    showAlertMessage('History cleared successfully', 'success');
  });
}

function exportHistory() {
  chrome.storage.local.get(['analysisHistory'], (data) => {
    const history = data.analysisHistory || [];
    
    if (history.length === 0) {
      alert('No history to export');
      return;
    }

    // Create CSV content
    const headers = ['Timestamp', 'From', 'Subject', 'Prediction', 'Confidence', 'Provider'];
    const rows = history.map(entry => {
      const date = new Date(entry.timestamp).toISOString();
      const from = (entry.from || '').replace(/"/g, '""');
      const subject = (entry.subject || '').replace(/"/g, '""');
      const prediction = entry.prediction || 'unknown';
      const confidence = Math.round((entry.confidence || 0) * 100);
      const provider = entry.provider || 'unknown';
      
      return [date, `"${from}"`, `"${subject}"`, prediction, confidence, provider].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phishguard_history_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showAlertMessage('History exported successfully', 'success');
  });
}

function showAlertMessage(message, type) {
  const alert = document.getElementById('saveAlert');
  alert.textContent = message;
  alert.className = `alert alert-${type} show`;
  
  setTimeout(() => {
    alert.classList.remove('show');
  }, 3000);
}

// Utility functions
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatDateTime(date) {
  const now = new Date();
  const diff = now - date;
  
  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now';
  }
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  
  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  
  // Show full date
  return date.toLocaleString();
}

function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Auto-refresh dashboard every 30 seconds
setInterval(() => {
  const dashboardTab = document.getElementById('dashboard');
  if (dashboardTab.classList.contains('active')) {
    loadDashboard();
  }
}, 30000);