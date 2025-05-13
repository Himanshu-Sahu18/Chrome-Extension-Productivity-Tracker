# ProductivityTracker Chrome Extension

A Chrome extension that tracks the time spent on different websites and provides productivity analytics.

## Features

- **Time Tracking**: Automatically tracks time spent on websites while browsing
- **Productivity Classification**: Categorizes websites as productive, unproductive, or neutral
- **Real-time Analytics**: View your productivity metrics in real time
- **Detailed Dashboard**: In-depth analysis of your browsing habits
- **Weekly Reports**: Get summarized productivity reports for each week
- **Customizable Categories**: Add or remove websites from productivity categories
- **Data Export**: Export your productivity data in JSON format

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right corner)
4. Click "Load unpacked" and select the directory containing this extension
5. The ProductivityTracker extension icon should now appear in your browser toolbar

## Usage

### Main Popup

- Click the extension icon in your browser toolbar to see a quick summary of today's productivity
- Use the buttons at the bottom to navigate to the Dashboard, Settings, or Reports pages

### Dashboard

- View detailed analytics about your browsing habits
- Switch between different time periods (Today, Week, Month, or Custom)
- See breakdowns of productive vs. unproductive time
- Identify your most visited websites

### Settings

- Customize which websites are considered productive or unproductive
- Set notification preferences
- Adjust your productivity target
- Export or clear your data

### Reports

- View weekly productivity reports
- See day-by-day breakdowns of your productivity
- Get insights about your browsing habits
- Export or print reports for record keeping

## Privacy

This extension stores all data locally on your computer. No data is sent to any external servers.

## Development

### Project Structure

- `manifest.json`: Extension configuration
- `background.js`: Core tracking functionality
- `popup.html/js/css`: Main extension popup
- `dashboard.html/js/css`: Detailed analytics dashboard
- `settings.html/js/css`: Extension settings
- `reports.html/js/css`: Weekly reports
- `icons/`: Extension icons

### Technologies Used

- HTML, CSS, and JavaScript
- Chart.js for data visualization
- Chrome Extension APIs

## License

This project is released under the MIT License. 