// background.js
// Listen for when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if the page is a LeetCode problem page and has finished loading
    if (changeInfo.status === 'complete' && tab.url.includes('leetcode.com/problems/')) {
      // Update the extension icon to indicate it's active
      chrome.action.setIcon({
        tabId: tabId,
        path: {
          "16": "images/icon16-active.png",
          "48": "images/icon48-active.png",
          "128": "images/icon128-active.png"
        }
      });
    } else if (changeInfo.status === 'complete') {
      // Reset to default icon on non-LeetCode pages
      chrome.action.setIcon({
        tabId: tabId,
        path: {
          "16": "images/icon16.png",
          "48": "images/icon48.png",
          "128": "images/icon128.png"
        }
      });
    }
  });
  
  // Optional: Add event listener for toolbar icon click
  chrome.action.onClicked.addListener((tab) => {
    // Only act if we're on a LeetCode problem page
    if (tab.url.includes('leetcode.com/problems/')) {
      // This will only run if popup.html is not defined in the manifest
      chrome.tabs.sendMessage(tab.id, {action: "toggleSubmitPanel"});
    }
  });