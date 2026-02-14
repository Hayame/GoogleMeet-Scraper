// Background script (Service Worker) - Chrome Manifest V3
// Thin relay: forwards start/stop/status commands to the content script.
// The actual scanning loop lives in content.js (immune to SW termination).
importScripts('debug-config.js');

// Inject content script into all open Google Meet tabs on install
chrome.runtime.onInstalled.addListener(() => {
    chrome.tabs.query({ url: 'https://meet.google.com/*' }, (tabs) => {
        for (const tab of tabs) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            }).catch(err => {
                console.error(`Failed to inject content script into tab ${tab.id}:`, err);
            });
        }
    });
});

chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes('meet.google.com')) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startBackgroundScanning') {
        // Relay to content script
        const tabId = request.tabId;
        chrome.tabs.sendMessage(tabId, {
            action: 'startContentScanning',
            sessionId: request.sessionId || 'default'
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('❌ [BACKGROUND] Failed to relay startContentScanning:', chrome.runtime.lastError.message);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
            }
            sendResponse(response || { success: true });
        });
        return true; // async

    } else if (request.action === 'stopBackgroundScanning') {
        // Relay stop to content script — need to find which tab is scanning
        _relayStopToScanningTab(sendResponse);
        return true; // async

    } else if (request.action === 'getScanningStatus') {
        // Relay status query to content script
        _relayScanningStatus(sendResponse);
        return true; // async

    } else if (request.action === 'getOwnTabId') {
        // Content script asks for its own tab ID
        sendResponse({ tabId: sender.tab?.id || null });

    } else if (request.action === 'updateGoogleUserName') {
        console.log('⚙️ [BACKGROUND] Received Google user name update:', request.userName);
        chrome.runtime.sendMessage({
            action: 'updateGoogleUserName',
            userName: request.userName
        }).catch(() => {
            // Popup is not open — expected during background operation
        });
        sendResponse({ success: true });
    }
    return true;
});

/**
 * Find the first Meet tab that is actively scanning.
 * @returns {Promise<{tab: Object, status: Object}|null>} The matching tab and its status, or null
 */
async function _findScanningTab() {
    const tabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });

    for (const tab of tabs) {
        try {
            const status = await chrome.tabs.sendMessage(tab.id, { action: 'getScanningStatus' });
            if (status?.isScanning) {
                return { tab, status };
            }
        } catch {
            // Tab may not have content script loaded
        }
    }

    return null;
}

/**
 * Find the scanning Meet tab and relay stop command
 */
async function _relayStopToScanningTab(sendResponse) {
    try {
        const found = await _findScanningTab();

        if (found) {
            await chrome.tabs.sendMessage(found.tab.id, { action: 'stopContentScanning' });
        }

        sendResponse({ success: true, stopped: !!found });
    } catch (error) {
        console.error('❌ [BACKGROUND] Failed to relay stop:', error);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Relay scanning status query to Meet tabs
 */
async function _relayScanningStatus(sendResponse) {
    try {
        const found = await _findScanningTab();

        if (found) {
            sendResponse({ isScanning: true, tabId: found.tab.id, scanCount: found.status.scanCount });
        } else {
            sendResponse({ isScanning: false, tabId: null });
        }
    } catch (error) {
        console.error('❌ [BACKGROUND] Failed to get scanning status:', error);
        sendResponse({ isScanning: false, tabId: null, error: error.message });
    }
}
