// JobApply Agent - Background Service Worker
// Handles communication between content scripts and the main application

const API_BASE_URL = 'http://localhost:3000';

// Store auth token
let authToken: string | null = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('JobApply Agent installed');
  
  // Set up context menu
  chrome.contextMenus.create({
    id: 'jobapply-fill-form',
    title: 'Auto-fill Application Form',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'jobapply-fill-form' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'fill-form' });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender).then(sendResponse).catch(error => {
    console.error('Background error:', error);
    sendResponse({ success: false, error: error.message });
  });
  return true; // Required for async response
});

async function handleMessage(request: any, sender: any) {
  switch (request.action) {
    case 'get-user-data':
      return await getUserData();
    
    case 'track-application':
      return await trackApplication(request.data);
    
    case 'detect-job-page':
      return await detectJobPage(request.url);
    
    case 'save-auth-token':
      authToken = request.token;
      await chrome.storage.local.set({ authToken });
      return { success: true };
    
    case 'get-auth-token':
      const stored = await chrome.storage.local.get('authToken');
      return { token: stored.authToken };
    
    case 'show-notification':
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: request.title,
        message: request.message
      });
      return { success: true };
    
    default:
      return { success: false, error: 'Unknown action' };
  }
}

async function getUserData() {
  try {
    const stored = await chrome.storage.local.get(['authToken', 'userData']);
    
    if (!stored.authToken) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Fetch user data from API
    const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
      headers: {
        'Authorization': `Bearer ${stored.authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }
    
    const data = await response.json();
    
    // Store user data locally for quick access
    await chrome.storage.local.set({ userData: data });
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error getting user data:', error);
    return { success: false, error: error.message };
  }
}

async function trackApplication(data: {
  jobTitle: string;
  company: string;
  jobUrl: string;
  platform: string;
  status: string;
}) {
  try {
    const stored = await chrome.storage.local.get('authToken');
    
    const response = await fetch(`${API_BASE_URL}/api/applications/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${stored.authToken}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to track application');
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error tracking application:', error);
    return { success: false, error: error.message };
  }
}

async function detectJobPage(url: string) {
  const jobPlatforms = [
    { pattern: /greenhouse\.io/i, name: 'Greenhouse' },
    { pattern: /lever\.co/i, name: 'Lever' },
    { pattern: /workday\.com/i, name: 'Workday' },
    { pattern: /indeed\.com\/viewjob/i, name: 'Indeed' },
    { pattern: /linkedin\.com\/jobs/i, name: 'LinkedIn' },
    { pattern: /glassdoor\.com/i, name: 'Glassdoor' },
    { pattern: /ziprecruiter\.com/i, name: 'ZipRecruiter' },
    { pattern: /angel\.co/i, name: 'AngelList' },
    { pattern: /jobs\.ashbyhq\.com/i, name: 'Ashby' }
  ];
  
  const detected = jobPlatforms.find(p => p.pattern.test(url));
  
  if (detected) {
    return {
      success: true,
      isJobPage: true,
      platform: detected.name,
      url
    };
  }
  
  return {
    success: true,
    isJobPage: false,
    platform: null,
    url
  };
}

// Listen for tab updates to detect job pages
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const result = await detectJobPage(tab.url);
    
    if (result.isJobPage) {
      // Show notification about job page detection
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Job Page Detected!',
        message: `Click the JobApply Agent icon to auto-fill this ${result.platform} application.`
      });
      
      // Send message to content script
      chrome.tabs.sendMessage(tabId, {
        action: 'job-page-detected',
        platform: result.platform
      }).catch(() => {
        // Content script may not be loaded yet, ignore error
      });
    }
  }
});
