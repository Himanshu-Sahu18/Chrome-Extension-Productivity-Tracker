// Initialize variables
let activeTabId = null;
let startTime = null;
let currentUrl = null;

// Website categories
const productiveWebsites = [
  'github.com',
  'stackoverflow.com',
  'leetcode.com',
  'docs.google.com',
  'trello.com',
  'notion.so',
  'hackerrank.com',
  'codepen.io',
  'replit.com'
];

const unproductiveWebsites = [
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'youtube.com',
  'reddit.com',
  'netflix.com',
  'tiktok.com',
  'twitch.tv'
];

// Function to classify website
function classifyWebsite(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    
    if (productiveWebsites.some(site => hostname.includes(site))) {
      return 'productive';
    } else if (unproductiveWebsites.some(site => hostname.includes(site))) {
      return 'unproductive';
    } else {
      return 'neutral';
    }
  } catch (error) {
    return 'neutral';
  }
}

// Function to get domain from URL
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return url;
  }
}

// Track tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // If there was a previous active tab, record the time spent
  if (activeTabId && startTime && currentUrl) {
    const timeSpent = Date.now() - startTime;
    recordSiteVisit(currentUrl, timeSpent);
  }
  
  // Update to the newly activated tab
  activeTabId = activeInfo.tabId;
  startTime = Date.now();
  
  try {
    const tab = await chrome.tabs.get(activeTabId);
    if (tab.url && tab.url.startsWith('http')) {
      currentUrl = tab.url;
    } else {
      currentUrl = null;
    }
  } catch (error) {
    console.error("Error getting tab info:", error);
    currentUrl = null;
  }
});

// Track URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url) {
    // Record time spent on the previous URL
    if (startTime && currentUrl) {
      const timeSpent = Date.now() - startTime;
      recordSiteVisit(currentUrl, timeSpent);
    }
    
    // Update to the new URL
    currentUrl = changeInfo.url;
    startTime = Date.now();
  }
});

// Track when browser loses focus
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus, record the time
    if (activeTabId && startTime && currentUrl) {
      const timeSpent = Date.now() - startTime;
      recordSiteVisit(currentUrl, timeSpent);
      activeTabId = null;
      startTime = null;
      currentUrl = null;
    }
  } else {
    // Browser gained focus, start tracking again
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        activeTabId = tabs[0].id;
        startTime = Date.now();
        if (tabs[0].url && tabs[0].url.startsWith('http')) {
          currentUrl = tabs[0].url;
        }
      }
    });
  }
});

// Record site visit to storage
function recordSiteVisit(url, timeSpent) {
  if (!url || !url.startsWith('http') || timeSpent < 1000) return;
  
  const domain = getDomain(url);
  const category = classifyWebsite(url);
  const today = new Date().toISOString().split('T')[0];
  
  chrome.storage.local.get(['siteData'], (result) => {
    const siteData = result.siteData || {};
    
    if (!siteData[today]) {
      siteData[today] = {};
    }
    
    if (!siteData[today][domain]) {
      siteData[today][domain] = {
        timeSpent: 0,
        category: category,
        url: domain
      };
    }
    
    siteData[today][domain].timeSpent += timeSpent;
    
    chrome.storage.local.set({ siteData });
  });
}

// Set up daily summary alarm
chrome.alarms.create('dailySummary', {
  periodInMinutes: 24 * 60 // Once a day
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailySummary') {
    generateDailySummary();
  }
});

// Generate daily summary
function generateDailySummary() {
  const today = new Date().toISOString().split('T')[0];
  
  chrome.storage.local.get(['siteData'], (result) => {
    const siteData = result.siteData || {};
    const todayData = siteData[today] || {};
    
    let productiveTime = 0;
    let unproductiveTime = 0;
    let neutralTime = 0;
    
    Object.values(todayData).forEach(site => {
      if (site.category === 'productive') {
        productiveTime += site.timeSpent;
      } else if (site.category === 'unproductive') {
        unproductiveTime += site.timeSpent;
      } else {
        neutralTime += site.timeSpent;
      }
    });
    
    const totalTime = productiveTime + unproductiveTime + neutralTime;
    
    const summary = {
      date: today,
      productiveTime,
      unproductiveTime,
      neutralTime,
      totalTime,
      productivityScore: totalTime > 0 ? (productiveTime / totalTime) * 100 : 0
    };
    
    chrome.storage.local.get(['dailySummaries'], (result) => {
      const dailySummaries = result.dailySummaries || [];
      dailySummaries.push(summary);
      
      chrome.storage.local.set({ dailySummaries });
    });
  });
}

// Record time when popup opens to ensure current tab's time is up to date
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateCurrentTab' && activeTabId && startTime && currentUrl) {
    const timeSpent = Date.now() - startTime;
    recordSiteVisit(currentUrl, timeSpent);
    
    // Reset the timer to start counting from now
    startTime = Date.now();
    
    // Send response that update was completed
    sendResponse({success: true});
  }
  return true; // Keep the message channel open for async response
});

// Setup for when extension is first installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    siteData: {},
    dailySummaries: [],
    userCategories: {
      productive: [...productiveWebsites],
      unproductive: [...unproductiveWebsites]
    }
  });
});

// If browser closed, save the final session data
chrome.runtime.onSuspend.addListener(() => {
  if (activeTabId && startTime && currentUrl) {
    const timeSpent = Date.now() - startTime;
    recordSiteVisit(currentUrl, timeSpent);
  }
}); 