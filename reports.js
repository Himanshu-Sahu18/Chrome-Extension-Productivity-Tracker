// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize week selector with current week
  initWeekSelector();
  
  // Set up event listeners
  setupEventListeners();
  
  // Load initial report (current week)
  loadWeeklyReport(getCurrentWeekDates());
});

// Initialize week selector with current week
function initWeekSelector() {
  const currentWeekDates = getCurrentWeekDates();
  updateWeekDisplay(currentWeekDates.start, currentWeekDates.end);
}

// Get start and end dates of current week (Sunday to Saturday)
function getCurrentWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 (Sunday) to 6 (Saturday)
  
  // Calculate start of week (Sunday)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - dayOfWeek);
  startDate.setHours(0, 0, 0, 0);
  
  // Calculate end of week (Saturday)
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  
  return {
    start: startDate,
    end: endDate
  };
}

// Get dates of previous week
function getPreviousWeekDates(currentStart) {
  const prevStart = new Date(currentStart);
  prevStart.setDate(prevStart.getDate() - 7);
  
  const prevEnd = new Date(prevStart);
  prevEnd.setDate(prevStart.getDate() + 6);
  prevEnd.setHours(23, 59, 59, 999);
  
  return {
    start: prevStart,
    end: prevEnd
  };
}

// Get dates of next week
function getNextWeekDates(currentStart) {
  const nextStart = new Date(currentStart);
  nextStart.setDate(nextStart.getDate() + 7);
  
  const nextEnd = new Date(nextStart);
  nextEnd.setDate(nextStart.getDate() + 6);
  nextEnd.setHours(23, 59, 59, 999);
  
  return {
    start: nextStart,
    end: nextEnd
  };
}

// Update week display
function updateWeekDisplay(startDate, endDate) {
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  const startStr = startDate.toLocaleDateString(undefined, options);
  const endStr = endDate.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
  
  document.getElementById('week-display').textContent = `${startStr} - ${endStr}`;
}

// Load weekly report data
function loadWeeklyReport(weekDates) {
  // Convert dates to storage format (YYYY-MM-DD)
  const startStr = weekDates.start.toISOString().split('T')[0];
  const endStr = weekDates.end.toISOString().split('T')[0];
  
  // Generate array of all dates in the week
  const dates = getDatesInRange(startStr, endStr);
  
  // Get data for all dates in the week
  chrome.storage.local.get(['siteData', 'dailySummaries'], (result) => {
    const siteData = result.siteData || {};
    const dailySummaries = result.dailySummaries || [];
    
    // Aggregate data across all days in the week
    let weeklyData = aggregateDataForDates(dates, siteData);
    
    // Get daily summaries for the week
    let dailyData = getDailyDataForDates(dates, siteData, dailySummaries);
    
    // Get hourly data for the week
    let hourlyData = getHourlyDataForDates(dates, siteData);
    
    // If no data for the week, show no data message
    if (weeklyData.totalTime === 0) {
      showNoDataMessage();
      return;
    }
    
    // Update the report UI
    updateSummary(weeklyData, dailyData);
    updateDailyBreakdown(dailyData);
    updateCategoryUsage(weeklyData);
    updateHourlyDistribution(hourlyData);
    generateInsights(weeklyData, dailyData, hourlyData);
  });
}

// Format milliseconds into hours and minutes
function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m`;
}

// Get array of dates between start and end (inclusive)
function getDatesInRange(startStr, endStr) {
  const dates = [];
  let currentDate = new Date(startStr);
  const endDate = new Date(endStr);
  
  while (currentDate <= endDate) {
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

// Get daily data for each date in the range
function getDailyDataForDates(dates, siteData, dailySummaries) {
  const dailyData = [];
  
  dates.forEach(date => {
    // Try to find an existing summary
    const summary = dailySummaries.find(s => s.date === date);
    
    if (summary) {
      dailyData.push({
        date: date,
        productiveTime: summary.productiveTime,
        unproductiveTime: summary.unproductiveTime,
        neutralTime: summary.neutralTime,
        totalTime: summary.totalTime,
        productivityScore: summary.productivityScore
      });
    } else {
      // Calculate summary from site data
      const dayData = siteData[date] || {};
      let productiveTime = 0;
      let unproductiveTime = 0;
      let neutralTime = 0;
      
      Object.values(dayData).forEach(site => {
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
      
      dailyData.push({
        date: date,
        productiveTime,
        unproductiveTime,
        neutralTime,
        totalTime,
        productivityScore
      });
    }
  });
  
  return dailyData;
}

// Get hourly data aggregated across all dates
function getHourlyDataForDates(dates, siteData) {
  // Initialize array for each hour (0-23)
  const hourlyData = Array(24).fill().map((_, hour) => ({
    hour,
    productive: 0,
    unproductive: 0,
    neutral: 0,
    total: 0
  }));
  
  // This is a simplified implementation since we don't track hour information
  // In a real implementation, we would use timestamp data to group by hour
  
  // For now, we'll distribute the time based on common patterns:
  // More productivity in morning/afternoon, less in evening
  const morningHours = [8, 9, 10, 11];
  const afternoonHours = [12, 13, 14, 15, 16];
  const eveningHours = [17, 18, 19, 20, 21];
  
  dates.forEach(date => {
    const dayData = siteData[date] || {};
    let dayProductiveTime = 0;
    let dayUnproductiveTime = 0;
    let dayNeutralTime = 0;
    
    Object.values(dayData).forEach(site => {
      if (site.category === 'productive') {
        dayProductiveTime += site.timeSpent;
      } else if (site.category === 'unproductive') {
        dayUnproductiveTime += site.timeSpent;
      } else {
        dayNeutralTime += site.timeSpent;
      }
    });
    
    // Distribute productive time - mostly in morning and afternoon
    const productivePerHourMorning = dayProductiveTime * 0.5 / morningHours.length;
    const productivePerHourAfternoon = dayProductiveTime * 0.4 / afternoonHours.length;
    const productivePerHourEvening = dayProductiveTime * 0.1 / eveningHours.length;
    
    // Distribute unproductive time - mostly in evening
    const unproductivePerHourMorning = dayUnproductiveTime * 0.2 / morningHours.length;
    const unproductivePerHourAfternoon = dayUnproductiveTime * 0.3 / afternoonHours.length;
    const unproductivePerHourEvening = dayUnproductiveTime * 0.5 / eveningHours.length;
    
    // Distribute neutral time - evenly
    const neutralPerHourAll = dayNeutralTime / (morningHours.length + afternoonHours.length + eveningHours.length);
    
    // Apply to hourly data
    morningHours.forEach(hour => {
      hourlyData[hour].productive += productivePerHourMorning;
      hourlyData[hour].unproductive += unproductivePerHourMorning;
      hourlyData[hour].neutral += neutralPerHourAll;
      hourlyData[hour].total += productivePerHourMorning + unproductivePerHourMorning + neutralPerHourAll;
    });
    
    afternoonHours.forEach(hour => {
      hourlyData[hour].productive += productivePerHourAfternoon;
      hourlyData[hour].unproductive += unproductivePerHourAfternoon;
      hourlyData[hour].neutral += neutralPerHourAll;
      hourlyData[hour].total += productivePerHourAfternoon + unproductivePerHourAfternoon + neutralPerHourAll;
    });
    
    eveningHours.forEach(hour => {
      hourlyData[hour].productive += productivePerHourEvening;
      hourlyData[hour].unproductive += unproductivePerHourEvening;
      hourlyData[hour].neutral += neutralPerHourAll;
      hourlyData[hour].total += productivePerHourEvening + unproductivePerHourEvening + neutralPerHourAll;
    });
  });
  
  return hourlyData;
}

// Update weekly summary section
function updateSummary(weeklyData, dailyData) {
  // Update productivity score
  document.getElementById('productivity-score').textContent = `${weeklyData.productivePercentage}%`;
  
  // Update productive and unproductive time
  document.getElementById('productive-time').textContent = formatTime(weeklyData.productiveTime);
  document.getElementById('unproductive-time').textContent = formatTime(weeklyData.unproductiveTime);
  
  // Find most productive day
  if (dailyData.length > 0) {
    const mostProductiveDay = dailyData.reduce((best, day) => 
      day.productivityScore > best.productivityScore ? day : best, dailyData[0]);
    
    const date = new Date(mostProductiveDay.date);
    const dayName = date.toLocaleDateString(undefined, { weekday: 'long' });
    document.getElementById('most-productive-day').textContent = dayName;
  }
}

// Update daily breakdown chart
function updateDailyBreakdown(dailyData) {
  const ctx = document.getElementById('daily-chart').getContext('2d');
  
  // Destroy existing chart if it exists
  if (window.dailyChart) {
    window.dailyChart.destroy();
  }
  
  // Prepare data for chart
  const labels = dailyData.map(day => {
    const date = new Date(day.date);
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  });
  
  const productiveData = dailyData.map(day => day.productiveTime / (1000 * 60 * 60)); // Convert to hours
  const unproductiveData = dailyData.map(day => day.unproductiveTime / (1000 * 60 * 60)); // Convert to hours
  const neutralData = dailyData.map(day => day.neutralTime / (1000 * 60 * 60)); // Convert to hours
  const productivityScores = dailyData.map(day => day.productivityScore);
  
  window.dailyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Productive',
          data: productiveData,
          backgroundColor: '#4CAF50',
          stack: 'Stack 0'
        },
        {
          label: 'Unproductive',
          data: unproductiveData,
          backgroundColor: '#F44336',
          stack: 'Stack 0'
        },
        {
          label: 'Neutral',
          data: neutralData,
          backgroundColor: '#2196F3',
          stack: 'Stack 0'
        },
        {
          label: 'Productivity Score',
          data: productivityScores,
          type: 'line',
          borderColor: '#FF9800',
          backgroundColor: 'rgba(255, 152, 0, 0.2)',
          fill: false,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          stacked: true,
          title: {
            display: true,
            text: 'Hours'
          }
        },
        y1: {
          position: 'right',
          title: {
            display: true,
            text: 'Productivity Score (%)'
          },
          min: 0,
          max: 100,
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

// Update category usage chart and top sites
function updateCategoryUsage(weeklyData) {
  const ctx = document.getElementById('category-chart').getContext('2d');
  
  // Destroy existing chart if it exists
  if (window.categoryChart) {
    window.categoryChart.destroy();
  }
  
  window.categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Productive', 'Unproductive', 'Neutral'],
      datasets: [{
        data: [
          weeklyData.productiveTime, 
          weeklyData.unproductiveTime, 
          weeklyData.neutralTime
        ],
        backgroundColor: ['#4CAF50', '#F44336', '#2196F3'],
        borderWidth: 1
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
  
  // Update top sites list
  updateTopSites(weeklyData.sitesArray);
}

// Update hourly distribution chart
function updateHourlyDistribution(hourlyData) {
  const ctx = document.getElementById('hourly-chart').getContext('2d');
  
  // Destroy existing chart if it exists
  if (window.hourlyChart) {
    window.hourlyChart.destroy();
  }
  
  // Prepare data for chart
  const labels = hourlyData.map(hour => `${hour.hour}:00`);
  const productiveData = hourlyData.map(hour => hour.productive / (1000 * 60 * 60)); // Convert to hours
  const unproductiveData = hourlyData.map(hour => hour.unproductive / (1000 * 60 * 60)); // Convert to hours
  const neutralData = hourlyData.map(hour => hour.neutral / (1000 * 60 * 60)); // Convert to hours
  
  window.hourlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Productive',
          data: productiveData,
          backgroundColor: '#4CAF50',
          stack: 'Stack 0'
        },
        {
          label: 'Unproductive',
          data: unproductiveData,
          backgroundColor: '#F44336',
          stack: 'Stack 0'
        },
        {
          label: 'Neutral',
          data: neutralData,
          backgroundColor: '#2196F3',
          stack: 'Stack 0'
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
            text: 'Hours'
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

// Generate insights based on data
function generateInsights(weeklyData, dailyData, hourlyData) {
  const insightsContainer = document.getElementById('insights-container');
  insightsContainer.innerHTML = '';
  
  const insights = [];
  
  // Productivity score insight
  if (weeklyData.productivePercentage >= 70) {
    insights.push({
      title: 'Great productivity this week!',
      description: `Your productivity score of ${weeklyData.productivePercentage}% is excellent. Keep up the good work!`
    });
  } else if (weeklyData.productivePercentage >= 50) {
    insights.push({
      title: 'Good productivity this week',
      description: `Your productivity score of ${weeklyData.productivePercentage}% is good, but there's room for improvement.`
    });
  } else {
    insights.push({
      title: 'Low productivity this week',
      description: `Your productivity score of ${weeklyData.productivePercentage}% is below average. Try to reduce time on unproductive sites.`
    });
  }
  
  // Most productive day insight
  if (dailyData.length > 0) {
    const mostProductiveDay = dailyData.reduce((best, day) => 
      day.productivityScore > best.productivityScore ? day : best, dailyData[0]);
    
    const date = new Date(mostProductiveDay.date);
    const dayName = date.toLocaleDateString(undefined, { weekday: 'long' });
    
    insights.push({
      title: `${dayName} was your most productive day`,
      description: `You achieved a productivity score of ${mostProductiveDay.productivityScore}% on ${dayName}.`
    });
  }
  
  // Most productive time insight
  const productiveHours = hourlyData
    .filter(h => h.total > 0)
    .sort((a, b) => (b.productive / b.total) - (a.productive / a.total))
    .slice(0, 3);
  
  if (productiveHours.length > 0) {
    const hourStrings = productiveHours.map(h => `${h.hour}:00`).join(', ');
    insights.push({
      title: 'Your most productive hours',
      description: `You're most productive at ${hourStrings}. Consider scheduling important tasks during these times.`
    });
  }
  
  // Top unproductive site insight
  const topUnproductiveSites = weeklyData.sitesArray
    .filter(site => site.category === 'unproductive')
    .sort((a, b) => b.timeSpent - a.timeSpent);
  
  if (topUnproductiveSites.length > 0) {
    const topSite = topUnproductiveSites[0];
    insights.push({
      title: `Time spent on ${topSite.url}`,
      description: `You spent ${formatTime(topSite.timeSpent)} on ${topSite.url} this week. This was your most used unproductive site.`
    });
  }
  
  // Add insights to container
  insights.forEach(insight => {
    const insightElement = document.createElement('div');
    insightElement.className = 'insight-item';
    
    insightElement.innerHTML = `
      <div class="insight-title">${insight.title}</div>
      <div class="insight-description">${insight.description}</div>
    `;
    
    insightsContainer.appendChild(insightElement);
  });
}

// Show "No data" message
function showNoDataMessage() {
  // Update summary to show zeros
  document.getElementById('productivity-score').textContent = '0%';
  document.getElementById('productive-time').textContent = '0h 0m';
  document.getElementById('unproductive-time').textContent = '0h 0m';
  document.getElementById('most-productive-day').textContent = '-';
  
  // Clear charts
  document.querySelector('.daily-breakdown-card').innerHTML = '<h2>Daily Breakdown</h2><p class="no-data">No data available for the selected week.</p>';
  document.querySelector('.category-usage-card').innerHTML = '<h2>Website Category Usage</h2><p class="no-data">No data available for the selected week.</p>';
  document.querySelector('.time-distribution-card').innerHTML = '<h2>Time Distribution by Hour</h2><p class="no-data">No data available for the selected week.</p>';
  
  // Clear insights
  document.getElementById('insights-container').innerHTML = '<p class="no-data">No insights available for the selected week.</p>';
}

// Export report as PDF-like HTML
function exportReport() {
  // Create a new window for the report
  const reportWindow = window.open('', '_blank');
  
  // Get current displayed week
  const weekDisplay = document.getElementById('week-display').textContent;
  
  // Create HTML content for the report
  reportWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Productivity Report - ${weekDisplay}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { color: #1a73e8; }
        .report-section { margin-bottom: 30px; }
        .charts-container { display: flex; justify-content: space-between; }
        .chart-item { width: 48%; }
        .summary-stats { display: flex; justify-content: space-between; }
        .stat-card { background-color: #f8f9fa; padding: 15px; border-radius: 6px; width: 23%; text-align: center; }
        .stat-label { font-size: 14px; color: #5f6368; margin-bottom: 5px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #1a73e8; }
        .insight-item { background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 10px; }
        .insight-title { font-weight: bold; margin-bottom: 5px; color: #1a73e8; }
        .footer { margin-top: 50px; text-align: center; color: #5f6368; font-size: 12px; }
      </style>
    </head>
    <body>
      <h1>Productivity Report - ${weekDisplay}</h1>
      
      <div class="report-section">
        <h2>Weekly Summary</h2>
        <div class="summary-stats">
          <div class="stat-card">
            <div class="stat-label">Productivity Score</div>
            <div class="stat-value">${document.getElementById('productivity-score').textContent}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Productive Time</div>
            <div class="stat-value">${document.getElementById('productive-time').textContent}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Unproductive Time</div>
            <div class="stat-value">${document.getElementById('unproductive-time').textContent}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Most Productive Day</div>
            <div class="stat-value">${document.getElementById('most-productive-day').textContent}</div>
          </div>
        </div>
      </div>
      
      <div class="report-section">
        <h2>Insights</h2>
        ${document.getElementById('insights-container').innerHTML}
      </div>
      
      <div class="footer">
        Generated by Productivity Tracker on ${new Date().toLocaleDateString()}
      </div>
    </body>
    </html>
  `);
  
  reportWindow.document.close();
  
  // Trigger print dialog after window loads
  reportWindow.onload = function() {
    setTimeout(() => {
      reportWindow.print();
    }, 500);
  };
}

// Print the report
function printReport() {
  window.print();
}

// Set up event listeners
function setupEventListeners() {
  // Previous week button
  document.getElementById('prev-week').addEventListener('click', function() {
    const currentWeekText = document.getElementById('week-display').textContent;
    const startDateStr = currentWeekText.split(' - ')[0];
    const startDate = new Date(startDateStr);
    
    const prevWeekDates = getPreviousWeekDates(startDate);
    updateWeekDisplay(prevWeekDates.start, prevWeekDates.end);
    loadWeeklyReport(prevWeekDates);
  });
  
  // Next week button
  document.getElementById('next-week').addEventListener('click', function() {
    const currentWeekText = document.getElementById('week-display').textContent;
    const startDateStr = currentWeekText.split(' - ')[0];
    const startDate = new Date(startDateStr);
    
    const nextWeekDates = getNextWeekDates(startDate);
    
    // Don't allow going beyond current week
    const currentWeek = getCurrentWeekDates();
    if (nextWeekDates.start > currentWeek.end) {
      return;
    }
    
    updateWeekDisplay(nextWeekDates.start, nextWeekDates.end);
    loadWeeklyReport(nextWeekDates);
  });
  
  // Export report button
  document.getElementById('export-report-btn').addEventListener('click', exportReport);
  
  // Print report button
  document.getElementById('print-report-btn').addEventListener('click', printReport);
}