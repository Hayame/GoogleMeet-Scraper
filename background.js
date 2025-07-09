// Background script (Service Worker) dla Chrome Manifest V3
console.log('🚀 Background script loaded');

// Stany skanowania
let isScanning = false;
let scanningTabId = null;
let scanInterval = null;

// Nasłuchuj na instalację rozszerzenia
chrome.runtime.onInstalled.addListener(() => {
    console.log('✅ Extension installed');
    
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

// Nasłuchuj wiadomości z popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Background received message:', request);
    
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
    }
    
    return true;
});

function startBackgroundScanning(tabId) {
    console.log('🔄 Starting background scanning for tab:', tabId);
    
    if (isScanning) {
        console.log('⚠️ Already scanning, stopping previous scan');
        stopBackgroundScanning();
    }
    
    isScanning = true;
    scanningTabId = tabId;
    
    // Skanuj co 2 sekundy
    scanInterval = setInterval(async () => {
        if (!isScanning) {
            clearInterval(scanInterval);
            return;
        }
        
        try {
            // Sprawdź czy karta nadal istnieje
            const tab = await chrome.tabs.get(tabId);
            if (!tab || !tab.url.includes('meet.google.com')) {
                console.log('❌ Tab not found or not on Meet page, stopping scan');
                stopBackgroundScanning();
                return;
            }
            
            // Wyślij żądanie skanowania do content script
            const result = await chrome.tabs.sendMessage(tabId, { action: 'scrapeTranscript' });
            
            if (result && result.success && result.data && result.data.entries.length > 0) {
                console.log('📝 Background scan found', result.data.entries.length, 'entries');
                
                // Zapisz wyniki do storage
                await chrome.storage.local.set({
                    [`backgroundScan_${tabId}`]: {
                        data: result.data,
                        timestamp: Date.now()
                    }
                });
                
                // Wyślij powiadomienie do popup jeśli jest otwarte
                try {
                    await chrome.runtime.sendMessage({
                        action: 'backgroundScanUpdate',
                        data: result.data
                    });
                } catch (error) {
                    // Popup prawdopodobnie nie jest otwarte, to normalne
                    console.log('📱 Popup not open, data saved to storage');
                }
            }
        } catch (error) {
            console.error('❌ Background scan error:', error);
            
            // Jeśli błąd to brak content script, spróbuj ponownie za 5 sekund
            if (error.message.includes('Could not establish connection')) {
                console.log('🔄 Content script not ready, will retry...');
            } else {
                console.log('❌ Stopping background scan due to error');
                stopBackgroundScanning();
            }
        }
    }, 2000);
    
    console.log('✅ Background scanning started');
}

function stopBackgroundScanning() {
    console.log('⏹️ Stopping background scanning');
    isScanning = false;
    scanningTabId = null;
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
}

// Zatrzymaj skanowanie gdy karta jest zamknięta
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === scanningTabId) {
        console.log('🗑️ Scanning tab closed, stopping background scan');
        stopBackgroundScanning();
    }
});

// Zatrzymaj skanowanie gdy karta jest zaktualizowana (odświeżona)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tabId === scanningTabId && changeInfo.status === 'loading') {
        console.log('🔄 Scanning tab refreshed, stopping background scan');
        stopBackgroundScanning();
    }
});