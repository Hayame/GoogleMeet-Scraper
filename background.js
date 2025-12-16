// Background script (Service Worker) dla Chrome Manifest V3

// Import debug configuration
importScripts('debug-config.js');

// Stany skanowania
let isScanning = false;
let scanningTabId = null;
let scanInterval = null;

// Nasłuchuj na instalację rozszerzenia
chrome.runtime.onInstalled.addListener(() => {
    // Wstrzyknij content script do wszystkich otwartych kart Google Meet
    chrome.tabs.query({ url: 'https://meet.google.com/*' }, (tabs) => {
        tabs.forEach(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
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

// Nasłuchuj wiadomości z popup i content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {    
    if (request.action === 'startBackgroundScanning') {
        startBackgroundScanning(request.tabId);
        sendResponse({ success: true });
    } else if (request.action === 'stopBackgroundScanning') {
        stopBackgroundScanning();
        sendResponse({ success: true });
    } else if (request.action === 'getScanningStatus') {
        sendResponse({ 
            isScanning: isScanning,
            tabId: scanningTabId
        });
    } else if (request.action === 'updateGoogleUserName') {
        // Forward message from content script to popup (SettingsManager)
        console.log('⚙️ [BACKGROUND] Received Google user name update:', request.userName);
        
        // Try to send to popup if it's open
        chrome.runtime.sendMessage({
            action: 'updateGoogleUserName',
            userName: request.userName
        }).catch(error => {
            // Popup is not open, that's normal
            console.log('⚙️ [BACKGROUND] Popup not open for user name update');
        });
        
        sendResponse({ success: true });
    }
    
    return true;
});

function startBackgroundScanning(tabId) {
    const startTime = new Date().toISOString();
    console.log('🔶 [BACKGROUND DEBUG] Starting background scanning for tab:', tabId, 'at:', startTime);
    
    if (isScanning) {
        console.log('🔶 [BACKGROUND DEBUG] Already scanning, stopping previous scan');
        stopBackgroundScanning();
    }
    
    isScanning = true;
    scanningTabId = tabId;

    let scanCount = 0;
    let lastMeetingUrl = null;  // Track meeting URL for tab ID verification

    // Skanuj co 3 sekundy
    scanInterval = setInterval(async () => {
        scanCount++;
        const scanTime = new Date().toISOString();
        console.log(`🔶 [BACKGROUND DEBUG] Scan #${scanCount} starting at:`, scanTime);
        
        if (!isScanning) {
            clearInterval(scanInterval);
            return;
        }
        
        try {
            // Sprawdź czy karta nadal istnieje
            const tab = await chrome.tabs.get(tabId);
            if (!tab || !tab.url.includes('meet.google.com')) {
                console.log('🔶 [BACKGROUND DEBUG] Tab not found or not on Meet page, stopping scan');
                stopBackgroundScanning();
                return;
            }
            
            // Wyślij żądanie skanowania do content script
            const result = await chrome.tabs.sendMessage(tabId, { action: 'scrapeTranscript' });
            
            if (result && result.success && result.data && result.data.messages && result.data.messages.length > 0) {
                console.log(`🔶 [BACKGROUND DEBUG] Scan #${scanCount} found`, result.data.messages.length, 'messages');
                console.log('🔶 [BACKGROUND DEBUG] First message:', result.data.messages[0] ? `${result.data.messages[0].speaker}: ${result.data.messages[0].text.substring(0, 30)}...` : 'none');

                // Store meeting URL for verification
                if (result.data.meetingUrl) {
                    lastMeetingUrl = result.data.meetingUrl;
                }

                // PRIMARY STORAGE: Latest data with sequence tracking
                await chrome.storage.local.set({
                    [`backgroundScan_${tabId}`]: {
                        data: result.data,
                        timestamp: Date.now(),
                        sequenceNumber: scanCount,
                        meetingUrl: result.data.meetingUrl || lastMeetingUrl
                    }
                });

                // CHECKPOINT SYSTEM: Backup every 10 scans (~30 seconds)
                if (scanCount % 10 === 0) {
                    await createCheckpoint(tabId, result.data, scanCount);
                }

                // Wyślij powiadomienie do popup jeśli jest otwarte
                try {
                    await chrome.runtime.sendMessage({
                        action: 'backgroundScanUpdate',
                        data: result.data
                    });
                    console.log(`🔶 [BACKGROUND DEBUG] Scan #${scanCount} sent to popup successfully`);
                } catch (error) {
                    // Popup prawdopodobnie nie jest otwarte, to normalne
                    console.log('🔶 [BACKGROUND DEBUG] Popup not open, data saved to storage');
                }
            } else {
                console.log(`🔶 [BACKGROUND DEBUG] Scan #${scanCount} found no messages`);
            }
        } catch (error) {
            console.error('🔶 [BACKGROUND DEBUG] Scan error:', error);
            
            // Jeśli błąd to brak content script, spróbuj ponownie za 3 sekundy
            if (error.message.includes('Could not establish connection')) {
                console.log('🔶 [BACKGROUND DEBUG] Content script not ready, will retry...');
            } else {
                console.log('🔶 [BACKGROUND DEBUG] Stopping background scan due to error');
                stopBackgroundScanning();
            }
        }
    }, 3000);
    
    console.log('🔶 [BACKGROUND DEBUG] Background scanning started at:', startTime);
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
 * Create checkpoint backup of scan data
 * Keeps last 3 checkpoints for recovery
 *
 * @param {number} tabId - Tab ID
 * @param {Object} data - Transcript data
 * @param {number} scanCount - Scan sequence number
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

        // Cleanup: Keep only last 3 checkpoints per tab
        await cleanupOldCheckpoints(tabId);

    } catch (error) {
        console.error('❌ [CHECKPOINT] Failed to create:', error);
        // Non-fatal - primary storage still has data
    }
}

/**
 * Remove old checkpoints, keep only last 3
 * @param {number} tabId - Tab ID
 */
async function cleanupOldCheckpoints(tabId) {
    try {
        const allData = await chrome.storage.local.get(null);
        const checkpointKeys = Object.keys(allData)
            .filter(k => k.startsWith(`checkpoint_${tabId}_`))
            .sort(); // Chronological order (timestamp in key)

        // Keep last 3, remove older
        if (checkpointKeys.length > 3) {
            const toRemove = checkpointKeys.slice(0, -3);
            await chrome.storage.local.remove(toRemove);
            console.log(`🧹 [CHECKPOINT] Cleaned up ${toRemove.length} old checkpoints`);
        }
    } catch (error) {
        console.error('❌ [CHECKPOINT] Cleanup failed:', error);
    }
}

// Zatrzymaj skanowanie gdy karta jest zamknięta
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === scanningTabId) {
        stopBackgroundScanning();
    }
});

// Zatrzymaj skanowanie gdy karta jest zaktualizowana (odświeżona)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tabId === scanningTabId && changeInfo.status === 'loading') {
        stopBackgroundScanning();
    }
});