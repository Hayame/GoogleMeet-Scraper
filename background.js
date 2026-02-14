// Background script (Service Worker) - Chrome Manifest V3
importScripts('debug-config.js');

let isScanning = false;
let scanningTabId = null;
let scanInterval = null;

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
        startBackgroundScanning(request.tabId);
        sendResponse({ success: true });
    } else if (request.action === 'stopBackgroundScanning') {
        stopBackgroundScanning();
        sendResponse({ success: true });
    } else if (request.action === 'getScanningStatus') {
        sendResponse({ isScanning, tabId: scanningTabId });
    } else if (request.action === 'updateGoogleUserName') {
        console.log('⚙️ [BACKGROUND] Received Google user name update:', request.userName);
        chrome.runtime.sendMessage({
            action: 'updateGoogleUserName',
            userName: request.userName
        }).catch(() => {
            // Popup is not open - expected during background operation
        });
        sendResponse({ success: true });
    }
    return true;
});

function startBackgroundScanning(tabId) {
    console.log('🔶 [BACKGROUND] Starting background scanning for tab:', tabId);

    if (isScanning) {
        stopBackgroundScanning();
    }

    isScanning = true;
    scanningTabId = tabId;
    let scanCount = 0;

    scanInterval = setInterval(async () => {
        scanCount++;
        if (!isScanning) {
            clearInterval(scanInterval);
            return;
        }

        try {
            const tab = await chrome.tabs.get(tabId);
            if (!tab || !tab.url.includes('meet.google.com')) {
                console.log('🔶 [BACKGROUND] Tab not on Meet page, stopping scan');
                stopBackgroundScanning();
                return;
            }

            const result = await chrome.tabs.sendMessage(tabId, { action: 'scrapeTranscript' });
            const hasMessages = result?.success && result.data?.messages?.length > 0;

            if (hasMessages) {
                console.log(`🔶 [BACKGROUND] Scan #${scanCount}:`, result.data.messages.length, 'messages');

                await chrome.storage.local.set({
                    [`backgroundScan_${tabId}`]: {
                        data: result.data,
                        timestamp: Date.now(),
                        sequenceNumber: scanCount,
                        meetingUrl: result.data.meetingUrl
                    }
                });

                if (scanCount % 10 === 0) {
                    await createCheckpoint(tabId, result.data, scanCount);
                }

                try {
                    await chrome.runtime.sendMessage({
                        action: 'backgroundScanUpdate',
                        data: result.data
                    });
                } catch (popupError) {
                    // Popup not open - data already saved to storage
                }
            }
        } catch (error) {
            console.error('🔶 [BACKGROUND] Scan error:', error);
            if (!error.message.includes('Could not establish connection')) {
                stopBackgroundScanning();
            }
        }
    }, 3000);
}

function stopBackgroundScanning() {
    isScanning = false;
    scanningTabId = null;
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
}

/**
 * Create checkpoint backup of scan data. Keeps last 3 checkpoints for recovery.
 */
async function createCheckpoint(tabId, data, scanCount) {
    try {
        const checkpointKey = `checkpoint_${tabId}_${Date.now()}`;
        await chrome.storage.local.set({
            [checkpointKey]: {
                data: data,
                timestamp: Date.now(),
                scanCount: scanCount,
                type: 'CHECKPOINT'
            }
        });
        console.log(`💾 [CHECKPOINT] Created: ${checkpointKey} (${data.messages.length} messages)`);
        await cleanupOldCheckpoints(tabId);
    } catch (error) {
        console.error('❌ [CHECKPOINT] Failed to create:', error);
    }
}

/**
 * Remove old checkpoints, keeping only the last 3
 */
async function cleanupOldCheckpoints(tabId) {
    try {
        const allData = await chrome.storage.local.get(null);
        const checkpointKeys = Object.keys(allData)
            .filter(k => k.startsWith(`checkpoint_${tabId}_`))
            .sort();

        if (checkpointKeys.length > 3) {
            const toRemove = checkpointKeys.slice(0, -3);
            await chrome.storage.local.remove(toRemove);
            console.log(`🧹 [CHECKPOINT] Cleaned up ${toRemove.length} old checkpoints`);
        }
    } catch (error) {
        console.error('❌ [CHECKPOINT] Cleanup failed:', error);
    }
}

// Stop scanning when the target tab is closed or refreshed
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === scanningTabId) {
        stopBackgroundScanning();
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (tabId === scanningTabId && changeInfo.status === 'loading') {
        stopBackgroundScanning();
    }
});