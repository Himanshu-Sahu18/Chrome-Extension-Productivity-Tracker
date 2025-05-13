// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Set up date range buttons
  setupDateRangeButtons();
  
  // Load initial data (today's data by default)
  loadData('today');
});

// Setup date range buttons
function setupDateRangeButtons() {
  const dateButtons = document.querySelectorAll('.date-btn');
  
  dateButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      dateButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      this.classList.add('active');
      
      // Load data for selected range
      const range = this.id;
      loadData(range);
      
      // If custom range is selected, show date picker
      if (range === 'custom') {
        showCustomDatePicker();
      }
    });
  });
}

// Show custom date picker (simplified for now)
function showCustomDatePicker() {
  // This would normally show a date picker
  // For simplicity, we'll just use prompt for now
  const startDate = prompt('Enter start date (YYYY-MM-DD):', '');
  const endDate = prompt('Enter end date (YYYY-MM-DD):', '');
  
  if (startDate && endDate) {
    loadCustomRangeData(startDate, endDate);
  } else {
    // If user cancels, revert to today
    document.getElementById('today').click();
  }
}

// Load data based on selected date range
function loadData(range) {
  switch (range) {
    case 'today':
      const today = new Date().toISOString().split('T')[0];
      loadDayData(today);
      break;
    case 'week':
      loadWeekData();
      break;
    case 'month':
      loadMonthData();
      break;
    // Custom range is handled separately
  }
}

// Load data for a specific day
function loadDayData(date) {
  chrome.storage.local.get(['siteData'], (result) => {
    const siteData = result.siteData || {};
    const dayData = siteData[date] || {};
    
    // Calculate time totals
    let productiveTime = 0;
    let unproductiveTime = 0;
    let neutralTime = 0;
    
    const sitesArray = Object.values(dayData);
    
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
    
    // If no data, show "No data" message
    if (totalTime === 0) {
      showNoDataMessage();
      return;
    }
    
    // Calculate percentages
    const productivePercentage = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;
    const unproductivePercentage = totalTime > 0 ? Math.round((unproductiveTime / totalTime) * 100) : 0;
    const neutralPercentage = totalTime > 0 ? Math.round((neutralTime / totalTime) * 100) : 0;
    
    // Update UI with data
    updateOverview(productiveTime, unproductiveTime, neutralTime, totalTime, 
                   productivePercentage, unproductivePercentage, neutralPercentage);
    
    updateProductivityScore(productivePercentage);
    
    updateTimeChart(productiveTime, unproductiveTime, neutralTime);
    
    // For single day, we'll show a simpler trend chart
    updateSingleDayTrendChart(sitesArray);
    
    updateTopSites(sitesArray);
    
    updateCategoryBreakdown(sitesArray, totalTime);
  });
}

// Load week data (last 7 days)
function loadWeekData() {
  // Get dates for the last 7 days
  const dates = getLastNDays(7);
  
  // Get data for those dates
  chrome.storage.local.get(['siteData', 'dailySummaries'], (result) => {
    const siteData = result.siteData || {};
    const dailySummaries = result.dailySummaries || [];
    
    // Aggregate data across all days
    let aggregatedData = aggregateDataForDates(dates, siteData);
    
    // Also get the trend data
    let trendData = getTrendDataForDates(dates, dailySummaries);
    
    // If no data, show message
    if (aggregatedData.totalTime === 0) {
      showNoDataMessage();
      return;
    }
    
    // Update UI with aggregated data
    updateOverview(
      aggregatedData.productiveTime, 
      aggregatedData.unproductiveTime, 
      aggregatedData.neutralTime, 
      aggregatedData.totalTime,
      aggregatedData.productivePercentage,
      aggregatedData.unproductivePercentage,
      aggregatedData.neutralPercentage
    );
    
    updateProductivityScore(aggregatedData.productivePercentage);
    
    updateTimeChart(
      aggregatedData.productiveTime, 
      aggregatedData.unproductiveTime, 
      aggregatedData.neutralTime
    );
    
    // Update trend chart with daily data
    updateTrendChart(trendData, dates);
    
    // Update top sites
    updateTopSites(aggregatedData.sitesArray);
    
    // Update category breakdown
    updateCategoryBreakdown(aggregatedData.sitesArray, aggregatedData.totalTime);
  });
}

// Load month data (last 30 days)
function loadMonthData() {
  // Similar to week data but for 30 days
  const dates = getLastNDays(30);
  
  chrome.storage.local.get(['siteData', 'dailySummaries'], (result) => {
    const siteData = result.siteData || {};
    const dailySummaries = result.dailySummaries || [];
    
    let aggregatedData = aggregateDataForDates(dates, siteData);
    let trendData = getTrendDataForDates(dates, dailySummaries);
    
    if (aggregatedData.totalTime === 0) {
      showNoDataMessage();
      return;
    }
    
    updateOverview(
      aggregatedData.productiveTime, 
      aggregatedData.unproductiveTime, 
      aggregatedData.neutralTime, 
      aggregatedData.totalTime,
      aggregatedData.productivePercentage,
      aggregatedData.unproductivePercentage,
      aggregatedData.neutralPercentage
    );
    
    updateProductivityScore(aggregatedData.productivePercentage);
    
    updateTimeChart(
      aggregatedData.productiveTime, 
      aggregatedData.unproductiveTime, 
      aggregatedData.neutralTime
    );
    
    // For month data, we'll group by weeks for the trend
    updateTrendChart(trendData, dates, true);
    
    updateTopSites(aggregatedData.sitesArray);
    
    updateCategoryBreakdown(aggregatedData.sitesArray, aggregatedData.totalTime);
  });
}

// Load custom range data
function loadCustomRangeData(startDate, endDate) {
  // Generate array of dates between start and end
  const dates = getDatesBetween(startDate, endDate);
  
  chrome.storage.local.get(['siteData', 'dailySummaries'], (result) => {
    const siteData = result.siteData || {};
    const dailySummaries = result.dailySummaries || [];
    
    let aggregatedData = aggregateDataForDates(dates, siteData);
    let trendData = getTrendDataForDates(dates, dailySummaries);
    
    if (aggregatedData.totalTime === 0) {
      showNoDataMessage();
      return;
    }
    
    updateOverview(
      aggregatedData.productiveTime, 
      aggregatedData.unproductiveTime, 
      aggregatedData.neutralTime, 
      aggregatedData.totalTime,
      aggregatedData.productivePercentage,
      aggregatedData.unproductivePercentage,
      aggregatedData.neutralPercentage
    );
    
    updateProductivityScore(aggregatedData.productivePercentage);
    
    updateTimeChart(
      aggregatedData.productiveTime, 
      aggregatedData.unproductiveTime, 
      aggregatedData.neutralTime
    );
    
    // Choose between daily or weekly trend based on range length
    updateTrendChart(trendData, dates, dates.length > 14);
    
    updateTopSites(aggregatedData.sitesArray);
    
    updateCategoryBreakdown(aggregatedData.sitesArray, aggregatedData.totalTime);
  });
}

// Get last N days (including today)
function getLastNDays(n) {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

// Get all dates between start and end (inclusive)
function getDatesBetween(startDate, endDate) {
  const dates = [];
  let currentDate = new Date(startDate);
  const end = new Date(endDate);
  
  while (currentDate <= end) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

// Aggregate data for multiple dates
function aggregateDataForDates(dates, siteData) {
  let productiveTime = 0;
  let unproductiveTime = 0;
  let neutralTime = 0;
  let sitesMap = {};
  
  dates.forEach(date => {
    const dayData = siteData[date] || {};
    
    Object.values(dayData).forEach(site => {
      // Add to time totals
      if (site.category === 'productive') {
        productiveTime += site.timeSpent;
      } else if (site.category === 'unproductive') {
        unproductiveTime += site.timeSpent;
      } else {
        neutralTime += site.timeSpent;
      }
      
      // Aggregate site data
      if (!sitesMap[site.url]) {
        sitesMap[site.url] = {
          url: site.url,
          timeSpent: 0,
          category: site.category
        };
      }
      
      sitesMap[site.url].timeSpent += site.timeSpent;
    });
  });
  
  const totalTime = productiveTime + unproductiveTime + neutralTime;
  
  // Calculate percentages
  const productivePercentage = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;
  const unproductivePercentage = totalTime > 0 ? Math.round((unproductiveTime / totalTime) * 100) : 0;
  const neutralPercentage = totalTime > 0 ? Math.round((neutralTime / totalTime) * 100) : 0;
  
  return {
    productiveTime,
    unproductiveTime,
    neutralTime,
    totalTime,
    productivePercentage,
    unproductivePercentage,
    neutralPercentage,
    sitesArray: Object.values(sitesMap)
  };
}

// Get trend data for dates
function getTrendDataForDates(dates, dailySummaries) {
  const trendData = [];
  
  dates.forEach(date => {
    // Find summary for this date
    const summary = dailySummaries.find(s => s.date === date);
    
    if (summary) {
      trendData.push({
        date: date,
        productivityScore: summary.productivityScore,
        totalTime: summary.totalTime
      });
    } else {
      // If no summary, check if we have site data for this date
      chrome.storage.local.get(['siteData'], (result) => {
        const siteData = result.siteData || {};
        const dayData = siteData[date] || {};
        
        if (Object.keys(dayData).length > 0) {
          // Calculate productivityScore manually
          let productiveTime = 0;
          let totalTime = 0;
          
          Object.values(dayData).forEach(site => {
            if (site.category === 'productive') {
              productiveTime += site.timeSpent;
            }
            totalTime += site.timeSpent;
          });
          
          const productivityScore = totalTime > 0 ? (productiveTime / totalTime) * 100 : 0;
          
          trendData.push({
            date: date,
            productivityScore: productivityScore,
            totalTime: totalTime
          });
        } else {
          // No data for this date
          trendData.push({
            date: date,
            productivityScore: 0,
            totalTime: 0
          });
        }
      });
    }
  });
  
  return trendData;
}

// Format milliseconds into hours and minutes
function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m`;
}

// Update overview section
function updateOverview(productiveTime, unproductiveTime, neutralTime, totalTime, 
                       productivePercentage, unproductivePercentage, neutralPercentage) {
  document.getElementById('productive-time').textContent = formatTime(productiveTime);
  document.getElementById('unproductive-time').textContent = formatTime(unproductiveTime);
  document.getElementById('neutral-time').textContent = formatTime(neutralTime);
  document.getElementById('total-time').textContent = formatTime(totalTime);
  
  document.getElementById('productive-percentage').textContent = `${productivePercentage}%`;
  document.getElementById('unproductive-percentage').textContent = `${unproductivePercentage}%`;
  document.getElementById('neutral-percentage').textContent = `${neutralPercentage}%`;
}

// Update productivity score
function updateProductivityScore(productivityScore) {
  const scoreElement = document.getElementById('productivity-score');
  const targetDiffElement = document.getElementById('target-diff');
  const targetScore = 70; // Default target
  
  scoreElement.textContent = `${productivityScore}%`;
  
  // Update score circle color based on value
  const scoreCircle = document.querySelector('.score-circle');
  if (productivityScore >= 70) {
    scoreCircle.style.backgroundColor = '#4CAF50'; // Green
  } else if (productivityScore >= 50) {
    scoreCircle.style.backgroundColor = '#FF9800'; // Orange
  } else {
    scoreCircle.style.backgroundColor = '#F44336'; // Red
  }
  
  // Update target difference
  const diff = productivityScore - targetScore;
  const diffText = diff >= 0 ? `+${diff}%` : `${diff}%`;
  
  targetDiffElement.textContent = diffText;
  
  if (diff >= 0) {
    targetDiffElement.classList.add('positive');
  } else {
    targetDiffElement.classList.remove('positive');
  }
}

// Update time chart
function updateTimeChart(productiveTime, unproductiveTime, neutralTime) {
  const ctx = document.getElementById('time-chart').getContext('2d');
  
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
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// Update trend chart for a single day (hourly breakdown)
function updateSingleDayTrendChart(sitesArray) {
  const ctx = document.getElementById('trend-chart').getContext('2d');
  
  // Destroy existing chart if it exists
  if (window.trendChart) {
    window.trendChart.destroy();
  }
  
  // Group data by hour
  const hourlyData = [];
  for (let i = 0; i < 24; i++) {
    hourlyData.push({
      hour: i,
      productive: 0,
      unproductive: 0,
      neutral: 0
    });
  }
  
  // This would normally use timestamps to group by hour
  // For now, just distribute evenly as a placeholder
  sitesArray.forEach((site, index) => {
    const hour = index % 24;
    if (site.category === 'productive') {
      hourlyData[hour].productive += site.timeSpent;
    } else if (site.category === 'unproductive') {
      hourlyData[hour].unproductive += site.timeSpent;
    } else {
      hourlyData[hour].neutral += site.timeSpent;
    }
  });
  
  window.trendChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hourlyData.map(d => `${d.hour}:00`),
      datasets: [
        {
          label: 'Productive',
          data: hourlyData.map(d => d.productive / (1000 * 60)), // Convert to minutes
          backgroundColor: '#4CAF50'
        },
        {
          label: 'Unproductive',
          data: hourlyData.map(d => d.unproductive / (1000 * 60)), // Convert to minutes
          backgroundColor: '#F44336'
        },
        {
          label: 'Neutral',
          data: hourlyData.map(d => d.neutral / (1000 * 60)), // Convert to minutes
          backgroundColor: '#2196F3'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: {
          stacked: true
        },
        y: {
          stacked: true,
          title: {
            display: true,
            text: 'Minutes'
          }
        }
      }
    }
  });
}

// Update trend chart for multiple days
function updateTrendChart(trendData, dates, groupByWeek = false) {
  const ctx = document.getElementById('trend-chart').getContext('2d');
  
  // Destroy existing chart if it exists
  if (window.trendChart) {
    window.trendChart.destroy();
  }
  
  let labels, scores, times;
  
  if (groupByWeek) {
    // Group data by week
    const weeklyData = [];
    let currentWeek = 0;
    let weekSum = 0;
    let weekCount = 0;
    let weekTimeSum = 0;
    
    trendData.forEach((day, index) => {
      if (index > 0 && index % 7 === 0) {
        weeklyData.push({
          week: `Week ${currentWeek + 1}`,
          score: weekCount > 0 ? weekSum / weekCount : 0,
          time: weekTimeSum
        });
        currentWeek++;
        weekSum = 0;
        weekCount = 0;
        weekTimeSum = 0;
      }
      
      if (day.totalTime > 0) {
        weekSum += day.productivityScore;
        weekCount++;
      }
      weekTimeSum += day.totalTime;
    });
    
    // Add the last week if there's data
    if (weekCount > 0) {
      weeklyData.push({
        week: `Week ${currentWeek + 1}`,
        score: weekSum / weekCount,
        time: weekTimeSum
      });
    }
    
    labels = weeklyData.map(d => d.week);
    scores = weeklyData.map(d => d.score);
    times = weeklyData.map(d => d.time / (1000 * 60 * 60)); // Convert to hours
  } else {
    // Use daily data
    labels = dates.map(d => new Date(d).toLocaleDateString());
    scores = trendData.map(d => d.productivityScore);
    times = trendData.map(d => d.totalTime / (1000 * 60 * 60)); // Convert to hours
  }
  
  window.trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Productivity Score (%)',
          data: scores,
          borderColor: '#4CAF50',
          backgroundColor: '#4CAF5022',
          fill: true,
          yAxisID: 'y'
        },
        {
          label: 'Hours Tracked',
          data: times,
          borderColor: '#1a73e8',
          backgroundColor: '#1a73e822',
          borderDash: [5, 5],
          fill: true,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Productivity Score (%)'
          },
          min: 0,
          max: 100
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Hours'
          },
          min: 0,
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

// Update top sites list
function updateTopSites(sitesArray) {
  // Sort sites by time spent (descending)
  sitesArray.sort((a, b) => b.timeSpent - a.timeSpent);
  
  // Take top 10 sites
  const topSites = sitesArray.slice(0, 10);
  
  const topSitesList = document.getElementById('top-sites-list');
  topSitesList.innerHTML = '';
  
  if (topSites.length === 0) {
    topSitesList.innerHTML = '<p class="no-data">No data available.</p>';
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

// Update category breakdown
function updateCategoryBreakdown(sitesArray, totalTime) {
  // Group sites by category
  const categories = {
    productive: {
      totalTime: 0,
      percentage: 0,
      sites: []
    },
    unproductive: {
      totalTime: 0,
      percentage: 0,
      sites: []
    },
    neutral: {
      totalTime: 0,
      percentage: 0,
      sites: []
    }
  };
  
  sitesArray.forEach(site => {
    categories[site.category].totalTime += site.timeSpent;
    categories[site.category].sites.push(site);
  });
  
  // Calculate percentages
  Object.keys(categories).forEach(category => {
    categories[category].percentage = totalTime > 0 
      ? Math.round((categories[category].totalTime / totalTime) * 100) 
      : 0;
  });
  
  const categoryList = document.getElementById('category-list');
  categoryList.innerHTML = '';
  
  // Create category items
  Object.keys(categories).forEach(category => {
    const categoryElement = document.createElement('div');
    categoryElement.className = `category-item ${category}`;
    
    categoryElement.innerHTML = `
      <div class="category-name">
        <span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>
        <span>${formatTime(categories[category].totalTime)} (${categories[category].percentage}%)</span>
      </div>
      <div class="category-progress">
        <div class="category-progress-bar" style="width: ${categories[category].percentage}%"></div>
      </div>
    `;
    
    categoryList.appendChild(categoryElement);
  });
}

// Show "No data" message
function showNoDataMessage() {
  // Update stats to show zeros
  document.getElementById('productive-time').textContent = '0h 0m';
  document.getElementById('unproductive-time').textContent = '0h 0m';
  document.getElementById('neutral-time').textContent = '0h 0m';
  document.getElementById('total-time').textContent = '0h 0m';
  
  document.getElementById('productive-percentage').textContent = '0%';
  document.getElementById('unproductive-percentage').textContent = '0%';
  document.getElementById('neutral-percentage').textContent = '0%';
  
  document.getElementById('productivity-score').textContent = '0%';
  document.getElementById('target-diff').textContent = '-70%';
  document.getElementById('target-diff').classList.remove('positive');
  
  // Clear charts
  document.querySelector('.time-chart-card').innerHTML = '<h2>Time Distribution</h2><p class="no-data">No data available for the selected period.</p>';
  document.querySelector('.trend-chart-card').innerHTML = '<h2>Productivity Trend</h2><p class="no-data">No data available for the selected period.</p>';
  
  // Clear top sites and categories
  document.getElementById('top-sites-list').innerHTML = '<p class="no-data">No data available for the selected period.</p>';
  document.getElementById('category-list').innerHTML = '<p class="no-data">No data available for the selected period.</p>';
} 