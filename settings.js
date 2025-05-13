// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Load current settings
  loadSettings();
  
  // Set up event listeners
  setupEventListeners();
});

// Load current settings from storage
function loadSettings() {
  chrome.storage.local.get(['userCategories', 'settings'], (result) => {
    const userCategories = result.userCategories || {
      productive: [],
      unproductive: []
    };
    
    const settings = result.settings || {
      dailySummary: true,
      unproductiveAlert: false,
      timeThreshold: 15,
      productivityTarget: 70
    };
    
    // Populate website categories
    populateCategoryList('productive-list', userCategories.productive);
    populateCategoryList('unproductive-list', userCategories.unproductive);
    
    // Set notification settings
    document.getElementById('daily-summary-toggle').checked = settings.dailySummary;
    document.getElementById('unproductive-alert-toggle').checked = settings.unproductiveAlert;
    document.getElementById('time-threshold').value = settings.timeThreshold;
    
    // Set productivity target
    document.getElementById('productivity-target').value = settings.productivityTarget;
    document.getElementById('target-value').textContent = `${settings.productivityTarget}%`;
    
    // Show/hide time threshold setting based on alert toggle
    document.getElementById('time-threshold-setting').style.display = 
      settings.unproductiveAlert ? 'flex' : 'none';
  });
}

// Populate a category list with websites
function populateCategoryList(listId, websites) {
  const list = document.getElementById(listId);
  list.innerHTML = '';
  
  if (websites.length === 0) {
    const emptyItem = document.createElement('div');
    emptyItem.className = 'category-item empty';
    emptyItem.textContent = 'No websites added yet';
    list.appendChild(emptyItem);
    return;
  }
  
  websites.forEach(site => {
    const item = document.createElement('div');
    item.className = 'category-item';
    
    item.innerHTML = `
      <span>${site}</span>
      <button class="remove-btn" data-site="${site}">×</button>
    `;
    
    list.appendChild(item);
  });
  
  // Add event listeners to remove buttons
  const removeButtons = list.querySelectorAll('.remove-btn');
  removeButtons.forEach(button => {
    button.addEventListener('click', function() {
      const site = this.getAttribute('data-site');
      const category = listId === 'productive-list' ? 'productive' : 'unproductive';
      
      removeSiteFromCategory(site, category);
    });
  });
}

// Remove a site from a category
function removeSiteFromCategory(site, category) {
  chrome.storage.local.get(['userCategories'], (result) => {
    const userCategories = result.userCategories || {
      productive: [],
      unproductive: []
    };
    
    userCategories[category] = userCategories[category].filter(s => s !== site);
    
    chrome.storage.local.set({ userCategories }, () => {
      // Refresh the list
      populateCategoryList(
        category === 'productive' ? 'productive-list' : 'unproductive-list', 
        userCategories[category]
      );
    });
  });
}

// Add a site to a category
function addSiteToCategory(site, category) {
  // Basic validation
  if (!site || site.trim() === '') {
    alert('Please enter a valid domain name');
    return;
  }
  
  // Strip http:// or https:// if present
  let domain = site.trim();
  domain = domain.replace(/^https?:\/\//i, '');
  
  chrome.storage.local.get(['userCategories'], (result) => {
    const userCategories = result.userCategories || {
      productive: [],
      unproductive: []
    };
    
    // Check if already exists in the same category
    if (userCategories[category].includes(domain)) {
      alert(`${domain} is already in the ${category} category`);
      return;
    }
    
    // Check if exists in the other category
    const otherCategory = category === 'productive' ? 'unproductive' : 'productive';
    if (userCategories[otherCategory].includes(domain)) {
      // Ask if they want to move it
      if (confirm(`${domain} is already in the ${otherCategory} category. Do you want to move it to ${category}?`)) {
        // Remove from other category
        userCategories[otherCategory] = userCategories[otherCategory].filter(s => s !== domain);
      } else {
        return;
      }
    }
    
    // Add to category
    userCategories[category].push(domain);
    
    chrome.storage.local.set({ userCategories }, () => {
      // Clear the input
      document.getElementById(`add-${category}-input`).value = '';
      
      // Refresh both lists
      populateCategoryList('productive-list', userCategories.productive);
      populateCategoryList('unproductive-list', userCategories.unproductive);
    });
  });
}

// Save settings to storage
function saveSettings() {
  const settings = {
    dailySummary: document.getElementById('daily-summary-toggle').checked,
    unproductiveAlert: document.getElementById('unproductive-alert-toggle').checked,
    timeThreshold: parseInt(document.getElementById('time-threshold').value),
    productivityTarget: parseInt(document.getElementById('productivity-target').value)
  };
  
  chrome.storage.local.set({ settings }, () => {
    // Show saved message
    const saveBtn = document.getElementById('save-settings-btn');
    const originalText = saveBtn.textContent;
    
    saveBtn.textContent = 'Saved!';
    saveBtn.disabled = true;
    
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }, 2000);
  });
}

// Export data as JSON file
function exportData() {
  chrome.storage.local.get(null, (data) => {
    // Convert to JSON string
    const jsonData = JSON.stringify(data, null, 2);
    
    // Create a blob and download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `productivity_tracker_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  });
}

// Clear all data
function clearData() {
  // Show confirmation modal
  const modal = document.getElementById('confirm-modal');
  modal.style.display = 'flex';
  
  // Set up confirm button
  document.getElementById('confirm-btn').onclick = function() {
    chrome.storage.local.get(['userCategories', 'settings'], (result) => {
      // Keep settings and categories, but clear tracking data
      chrome.storage.local.set({
        siteData: {},
        dailySummaries: [],
        userCategories: result.userCategories,
        settings: result.settings
      }, () => {
        modal.style.display = 'none';
        
        alert('All tracking data has been cleared');
      });
    });
  };
  
  // Set up cancel button
  document.getElementById('cancel-btn').onclick = function() {
    modal.style.display = 'none';
  };
}

// Set up all event listeners
function setupEventListeners() {
  // Add productive site
  document.getElementById('add-productive-btn').addEventListener('click', function() {
    const site = document.getElementById('add-productive-input').value;
    addSiteToCategory(site, 'productive');
  });
  
  // Add unproductive site
  document.getElementById('add-unproductive-btn').addEventListener('click', function() {
    const site = document.getElementById('add-unproductive-input').value;
    addSiteToCategory(site, 'unproductive');
  });
  
  // Handle input keypress (Enter)
  document.getElementById('add-productive-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      const site = this.value;
      addSiteToCategory(site, 'productive');
    }
  });
  
  document.getElementById('add-unproductive-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      const site = this.value;
      addSiteToCategory(site, 'unproductive');
    }
  });
  
  // Toggle time threshold setting visibility
  document.getElementById('unproductive-alert-toggle').addEventListener('change', function() {
    document.getElementById('time-threshold-setting').style.display = 
      this.checked ? 'flex' : 'none';
  });
  
  // Update productivity target value display
  document.getElementById('productivity-target').addEventListener('input', function() {
    document.getElementById('target-value').textContent = `${this.value}%`;
  });
  
  // Save settings button
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
  
  // Export data button
  document.getElementById('export-data-btn').addEventListener('click', exportData);
  
  // Clear data button
  document.getElementById('clear-data-btn').addEventListener('click', clearData);
  
  // Close modal when clicking outside
  window.addEventListener('click', function(e) {
    const modal = document.getElementById('confirm-modal');
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
} 