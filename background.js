// Background script (Service Worker) dla Chrome Manifest V3
console.log('Background script loaded');

// Nasłuchuj na instalację rozszerzenia
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
    
    // Wstrzyknij content script do wszystkich otwartych kart Google Meet
    chrome.tabs.query({ url: 'https://meet.google.com/*' }, (tabs) => {
        tabs.forEach(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            }).then(() => {
                console.log(`Content script injected into tab ${tab.id}`);
            }).catch(err => {
                console.error(`Failed to inject content script into tab ${tab.id}:`, err);
            });
        });
    });
});

// Opcjonalnie: nasłuchuj na aktywację rozszerzenia
chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes('meet.google.com')) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });
    }
});