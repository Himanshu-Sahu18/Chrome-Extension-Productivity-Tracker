// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Load today's data
  loadTodayData();
  
  // Setup interval to refresh data every 5 seconds while popup is open
  const refreshInterval = setInterval(loadTodayData, 5000);
  
  // Clear the interval when popup is closed
  window.addEventListener('unload', function() {
    clearInterval(refreshInterval);
  });
  
  // Set up navigation buttons
  document.getElementById('btn-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: 'dashboard.html' });
  });
  
  document.getElementById('btn-settings').addEventListener('click', () => {
    chrome.tabs.create({ url: 'settings.html' });
  });
  
  document.getElementById('btn-reports').addEventListener('click', () => {
    chrome.tabs.create({ url: 'reports.html' });
  });
});

// Function to load today's data
function loadTodayData() {
  // First, ask the background script to update the current tab's time
  chrome.runtime.sendMessage({action: 'updateCurrentTab'}, function(response) {
    // Now load the latest data
    const today = new Date().toISOString().split('T')[0];
    
    chrome.storage.local.get(['siteData'], (result) => {
      const siteData = result.siteData || {};
      const todayData = siteData[today] || {};
      
      // Calculate time totals
      let productiveTime = 0;
      let unproductiveTime = 0;
      let neutralTime = 0;
      
      const sitesArray = Object.values(todayData);
      
      sitesArray.forEach(site => {
        if (site.category === 'productive') {
          productiveTime += site.timeSpent;
        } else if (site.category === 'unproductive') {
          unproductiveTime += site.timeSpent;
        } else {
          neutralTime += site.timeSpent;
        }
      });
      
      const totalTime = productiveTime + unproductiveTime + neutralTime;
      const productivityScore = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;
      
      // Update statistics display
      document.getElementById('productive-time').textContent = formatTime(productiveTime);
      document.getElementById('unproductive-time').textContent = formatTime(unproductiveTime);
      document.getElementById('neutral-time').textContent = formatTime(neutralTime);
      document.getElementById('productivity-score').textContent = `${productivityScore}%`;
      
      // Update chart
      updateChart(productiveTime, unproductiveTime, neutralTime);
      
      // Update top sites
      updateTopSites(sitesArray);
    });
  });
}

// Function to format milliseconds into hours and minutes
function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m`;
}

// Function to update the chart
function updateChart(productiveTime, unproductiveTime, neutralTime) {
  const ctx = document.getElementById('time-chart').getContext('2d');
  
  // If there's no data, show a placeholder
  if (productiveTime === 0 && unproductiveTime === 0 && neutralTime === 0) {
    // Display a "No data yet" message instead of the chart
    document.querySelector('.chart-container').innerHTML = '<h2>Time Distribution</h2><p class="no-data">No data yet. Start browsing to track your productivity.</p>';
    return;
  }
  
  // Destroy existing chart if it exists
  if (window.timeChart) {
    window.timeChart.destroy();
  }
  
  window.timeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Productive', 'Unproductive', 'Neutral'],
      datasets: [{
        data: [productiveTime, unproductiveTime, neutralTime],
        backgroundColor: ['#4CAF50', '#F44336', '#2196F3'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      },
      cutout: '70%'
    }
  });
}

// Function to update the top sites list
function updateTopSites(sitesArray) {
  // Sort sites by time spent (descending)
  sitesArray.sort((a, b) => b.timeSpent - a.timeSpent);
  
  // Take top 5 sites
  const topSites = sitesArray.slice(0, 5);
  
  const topSitesList = document.getElementById('top-sites-list');
  topSitesList.innerHTML = '';
  
  if (topSites.length === 0) {
    topSitesList.innerHTML = '<p class="no-data">No sites visited yet today.</p>';
    return;
  }
  
  topSites.forEach(site => {
    const siteElement = document.createElement('div');
    siteElement.className = `site-item ${site.category}`;
    
    siteElement.innerHTML = `
      <div class="site-info">
        <div class="site-domain">${site.url}</div>
        <div class="site-category">${site.category}</div>
      </div>
      <div class="site-time">${formatTime(site.timeSpent)}</div>
    `;
    
    topSitesList.appendChild(siteElement);
  });
} 