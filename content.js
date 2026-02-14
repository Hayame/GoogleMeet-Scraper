console.log('🚀 Google Meet Recorder - Content script loaded at:', window.location.href);

if (!window.location.href.includes('meet.google.com')) {
    console.error('❌ Not on Google Meet page');
}

if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.error('❌ Chrome API not available');
}

// User settings for display name customization
let userSettings = {
    displayName: 'Ty',
    googleUserName: null
};

// Load user settings from storage
function loadUserSettings() {
    chrome.storage.sync.get(['userDisplayName', 'googleUserName'], (result) => {
        if (result.userDisplayName) {
            userSettings.displayName = result.userDisplayName;
        } else if (result.googleUserName) {
            userSettings.displayName = `Ty (${result.googleUserName})`;
        }
        
        console.log('⚙️ [CONTENT] Loaded user settings:', userSettings);
    });
}

// Google user name detection with fallback script tag parsing
function detectGoogleUserName() {
    if (window.GoogleUserDetector) {
        const userName = window.GoogleUserDetector.manualDetect();
        if (userName) {
            userSettings.googleUserName = userName;
            console.log('👤 [CONTENT] Google user name detected via GoogleUserDetector:', userName);
        }
        return userName;
    } else {
        console.warn('⚠️ [CONTENT] GoogleUserDetector module not available, using fallback detection');
        return detectGoogleUserNameFallback();
    }
}

// Fallback detection with script tag parsing
function detectGoogleUserNameFallback() {
    console.log('🔄 [CONTENT] Starting fallback detection');

    try {
        const scriptName = detectFromScriptTagsFallback();
        if (scriptName) {
            console.log('✅ [CONTENT] Fallback script tag detection successful:', scriptName);
            return scriptName;
        }

        const domName = detectFromDOMFallback();
        if (domName) {
            console.log('✅ [CONTENT] Fallback DOM detection successful:', domName);
            return domName;
        }

        console.log('❌ [CONTENT] All fallback methods failed');
        return null;
    } catch (error) {
        console.error('❌ [CONTENT] Error in fallback detection:', error);
        return null;
    }
}

// Script tag detection fallback (simplified version)
function detectFromScriptTagsFallback() {
    try {
        const scriptTags = document.querySelectorAll('script');
        if (scriptTags.length === 0) return null;

        for (const script of scriptTags) {
            try {
                const content = script.textContent || script.innerHTML;
                if (!content || !content.includes('AF_initDataCallback')) continue;

                const userName = extractNameDirectlyFromScriptFallback(content);
                if (userName) {
                    return cleanUserNameFallback(userName);
                }
            } catch (scriptError) {
                continue;
            }
        }

        console.log('📜 [CONTENT] No valid user name found in script tags');
        return null;
    } catch (error) {
        console.error('❌ [CONTENT] Error in script tag detection:', error);
        return null;
    }
}

/**
 * Try matching a regex pattern against script content, returning the first valid name.
 * @param {RegExp} pattern - Regex with a capture group for the name
 * @param {string} content - Script content to search
 * @param {number} nameGroup - Capture group index for the name (default 1)
 * @param {number} maxAttempts - Maximum matches to try
 * @returns {string|null}
 */
function findNameByPattern(pattern, content, nameGroup = 1, maxAttempts = 20) {
    let match;
    let attempts = 0;
    while ((match = pattern.exec(content)) !== null && attempts < maxAttempts) {
        attempts++;
        const name = match[nameGroup];
        if (isValidUserNameFallback(name)) {
            return name;
        }
    }
    return null;
}

// Direct name extraction from script content (fallback version)
function extractNameDirectlyFromScriptFallback(scriptContent) {
    try {
        // Pattern 1: Email followed by URL followed by name
        const result1 = findNameByPattern(
            /"([^"]+@[^"]+)","[^"]*","([^"]{2,50})"/g,
            scriptContent, 2
        );
        if (result1) return result1;

        // Pattern 2: Gmail address, skip middle, then capitalized name
        const result2 = findNameByPattern(
            /"([^"]+@gmail\.com)"[^"]*"[^"]*"([A-ZĄŻĆĘŁŃÓŚŹŻ][^"]{2,49})"/g,
            scriptContent, 2
        );
        if (result2) return result2;

        // Pattern 3: Two-word Polish names with proper capitalization
        const result3 = findNameByPattern(
            /"([A-ZĄŻĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\s+[A-ZĄŻĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)"/g,
            scriptContent
        );
        if (result3) return result3;

        // Pattern 4: Broad capitalized string with Polish characters
        const broadPattern = /"([A-ZĄŻĆĘŁŃÓŚŹŻ][A-Za-ząćęłńóśźż\s]{2,48}[a-ząćęłńóśźżA-Za-z])"/g;
        let match;
        let attempts = 0;
        while ((match = broadPattern.exec(scriptContent)) !== null && attempts < 50) {
            attempts++;
            const name = match[1];
            if ((name.includes('ł') || name.includes('Ł') || name.includes(' ')) && isValidUserNameFallback(name)) {
                return name;
            }
        }

        return null;
    } catch (error) {
        console.error('❌ [CONTENT] Error in direct extraction:', error);
        return null;
    }
}

// Blacklisted terms that indicate the string is not a person's name
const NAME_BLACKLIST = [
    'settings', 'account', 'profile', 'zamknij', 'close', 'menu', 'more', 'camera', 'microphone',
    'apis.google.com', 'client.js', 'javascript', 'google.com', 'gstatic.com',
    'accounts.google.com', 'googleapis.com', 'googleusercontent.com',
    'undefined', 'null', 'true', 'false', 'callback', 'function', 'window', 'document',
    'script', 'src', 'type', 'text', 'application', 'json', 'css', 'html',
    'meet', 'hangouts', 'chrome', 'browser', 'android', 'ios',
    'service', 'api', 'sdk', 'library', 'framework'
];

// Simple validation for fallback detection
function isValidUserNameFallback(name) {
    if (!name || typeof name !== 'string') return false;

    const trimmed = name.trim();

    if (trimmed.length < 2 || trimmed.length > 50) return false;
    if (!/[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(trimmed)) return false;
    if (trimmed.includes('@') || trimmed.includes('http') || trimmed.includes('://')) return false;

    const lowerName = trimmed.toLowerCase();
    if (NAME_BLACKLIST.some(term => lowerName.includes(term))) return false;

    // Multi-word name with proper capitalization (e.g., "FirstName LastName")
    if (trimmed.includes(' ')) {
        const words = trimmed.split(' ');
        const looksLikeName = words.length >= 2 &&
            words.every(word => /^[A-ZĄŻĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+$/.test(word));
        if (looksLikeName) return true;
    }

    // Single names with Polish characters are acceptable
    if (/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(trimmed)) return true;

    return false;
}

// Basic DOM detection fallback
function detectFromDOMFallback() {
    const safeSelectors = [
        '[aria-label*="Google Account"] .gb_Ab',
        '.gb_B [role="button"] span:not(.gb_D)',
        '.gb_b .gb_db'
    ];

    for (const selector of safeSelectors) {
        try {
            for (const element of document.querySelectorAll(selector)) {
                const text = element.textContent?.trim();
                if (text && isValidUserNameFallback(text)) {
                    return cleanUserNameFallback(text);
                }
            }
        } catch (error) {
            // Selector may not be supported, continue to next
        }
    }

    return null;
}

// Simple name cleaning for fallback
function cleanUserNameFallback(name) {
    if (!name) return null;

    let cleaned = name.trim()
        .replace(/\s*\([^()]*@[^()]*\)\s*$/, '')  // Remove email in parentheses
        .replace(/\s+/g, ' ')                       // Collapse whitespace
        .trim();

    return (cleaned.length >= 2 && cleaned.length <= 50) ? cleaned : null;
}

// ============================================================================
// AUTO-ENABLE CAPTIONS FEATURE
// ============================================================================

/**
 * Detect if captions are currently enabled
 * @returns {boolean} true if captions are ON, false if OFF
 */
function areCaptionsEnabled() {
    // Element [jsname="dsyhDe"] exists ONLY when captions are enabled
    const captionsElement = document.querySelector('[jsname="dsyhDe"]');
    const isEnabled = captionsElement !== null;
    console.log('🔍 [CC DETECT] Captions enabled:', isEnabled);
    return isEnabled;
}

/**
 * Toggle captions using keyboard shortcut
 * Google Meet responds to 'c' key to toggle captions on/off
 */
function toggleCaptionsViaKeyboard() {
    console.log('⌨️ [CC TOGGLE] Dispatching keyboard event: c');

    // Send 'c' key events to toggle captions
    const keydownEvent = new KeyboardEvent('keydown', {
        key: 'c',
        code: 'KeyC',
        keyCode: 67,
        bubbles: true,
        cancelable: true,
        composed: true  // Crosses shadow DOM boundaries
    });

    const keyupEvent = new KeyboardEvent('keyup', {
        key: 'c',
        code: 'KeyC',
        keyCode: 67,
        bubbles: true,
        cancelable: true,
        composed: true
    });

    document.dispatchEvent(keydownEvent);
    document.dispatchEvent(keyupEvent);

    console.log('✅ [CC TOGGLE] Keyboard events dispatched');
}

/**
 * Enable captions if they are currently disabled
 * @returns {Promise<Object>} Result object with success status and message
 */
async function enableCaptionsIfNeeded() {
    console.log('🎬 [CC ENABLE] Starting auto-enable captions...');

    try {
        // Check current state
        const alreadyEnabled = areCaptionsEnabled();

        if (alreadyEnabled) {
            console.log('✅ [CC ENABLE] Captions already enabled, skipping');
            return {
                success: true,
                alreadyEnabled: true,
                message: 'Captions already enabled'
            };
        }

        // Captions are OFF, need to toggle them ON
        console.log('🔄 [CC ENABLE] Captions disabled, toggling...');
        toggleCaptionsViaKeyboard();

        // Wait for UI to update (Google Meet needs ~250ms to process)
        await new Promise(resolve => setTimeout(resolve, 250));

        // Verify that captions turned ON
        const nowEnabled = areCaptionsEnabled();

        if (nowEnabled) {
            console.log('✅ [CC ENABLE] Captions successfully enabled');
            return {
                success: true,
                toggled: true,
                message: 'Captions enabled successfully'
            };
        } else {
            // Retry once
            console.log('⚠️ [CC ENABLE] First attempt failed, retrying...');
            toggleCaptionsViaKeyboard();
            await new Promise(resolve => setTimeout(resolve, 250));

            const retryEnabled = areCaptionsEnabled();
            if (retryEnabled) {
                console.log('✅ [CC ENABLE] Captions enabled on retry');
                return {
                    success: true,
                    toggled: true,
                    retriedOnce: true,
                    message: 'Captions enabled on retry'
                };
            } else {
                console.log('❌ [CC ENABLE] Failed to enable captions after retry');
                return {
                    success: false,
                    error: 'Failed to enable captions',
                    message: 'Keyboard shortcut did not toggle captions'
                };
            }
        }
    } catch (error) {
        console.error('❌ [CC ENABLE] Error:', error);
        return {
            success: false,
            error: error.message,
            message: 'Exception during caption enable'
        };
    }
}

// Initialize user settings
loadUserSettings();

// Listen for messages from popup and background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrapeTranscript') {
        try {
            const transcriptData = scrapeTranscript();
            sendResponse({ success: true, data: transcriptData });
        } catch (error) {
            console.error('❌ Scraping error:', error);
            sendResponse({ success: false, error: error.message });
        }
    } else if (request.action === 'updateUserDisplayName') {
        // Update user display name from popup
        userSettings.displayName = request.displayName;
        console.log('⚙️ [CONTENT] Updated user display name:', userSettings.displayName);
        loadUserSettings(); // Reload settings to stay in sync
        sendResponse({ success: true });
    } else if (request.action === 'manualDetectGoogleName') {
        console.log('👤 [CONTENT] Manual Google name detection requested');

        try {
            const userName = window.GoogleUserDetector
                ? window.GoogleUserDetector.manualDetect()
                : detectGoogleUserName();

            if (userName) {
                userSettings.googleUserName = userName;
                console.log('✅ [CONTENT] Manual detection successful:', userName);
                sendResponse({ success: true, userName: userName });
            } else {
                console.log('❌ [CONTENT] Manual detection failed');
                sendResponse({
                    success: false,
                    error: 'No Google name detected',
                    debug: {
                        pageUrl: window.location.href,
                        detectorAvailable: !!window.GoogleUserDetector
                    }
                });
            }
        } catch (error) {
            console.error('❌ [CONTENT] Manual detection error:', error);
            sendResponse({ success: false, error: error.message });
        }
    } else if (request.action === 'startContentScanning') {
        console.log('🟢 [CONTENT] Received startContentScanning, sessionId:', request.sessionId);
        startScanning(request.sessionId)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    } else if (request.action === 'stopContentScanning') {
        console.log('🔴 [CONTENT] Received stopContentScanning');
        stopScanning()
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    } else if (request.action === 'getScanningStatus') {
        sendResponse({ isScanning: _isScanning, scanCount: _scanCount });
    } else if (request.action === 'enableCaptions') {
        // Auto-enable captions handler
        console.log('🎬 [CONTENT] Received enableCaptions request');

        enableCaptionsIfNeeded()
            .then(result => {
                console.log('🎬 [CONTENT] Caption enable result:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('❌ [CONTENT] Caption enable error:', error);
                sendResponse({
                    success: false,
                    error: error.message
                });
            });

        return true; // Keep message channel open for async response
    }
    return true; // Keep message channel open for async responses
});

function createEmptyResult() {
    return {
        messages: [],
        scrapedAt: new Date().toISOString(),
        meetingUrl: window.location.href
    };
}

function scrapeTranscript() {
    const mainContainer = document.querySelector('div[jscontroller="D1tHje"]');
    if (!mainContainer) return createEmptyResult();

    const captionsContainer = mainContainer.querySelector('div[aria-label="Napisy"]') ||
                             mainContainer.querySelector('div[aria-label="Captions"]') ||
                             mainContainer.querySelector('[aria-label*="captions"], [aria-label*="napisy"]');
    if (!captionsContainer) return createEmptyResult();

    const messageElements = captionsContainer.querySelectorAll('.nMcdL');
    if (messageElements.length === 0) return createEmptyResult();

    const messages = [];

    messageElements.forEach((messageElement, index) => {
        try {
            const speakerElement = messageElement.querySelector('.NWpY1d');
            let speaker = speakerElement ? speakerElement.textContent.trim() : 'Nieznany';

            if (speaker === 'Ty') {
                speaker = userSettings.displayName;
            }

            const textElement = messageElement.querySelector('.ygicle.VbkSUe');
            const text = textElement ? textElement.textContent.trim() : '';

            if (text && isValidTranscriptText(text, speaker)) {
                const sanitizedText = sanitizeTranscriptText(text);
                if (sanitizedText && isValidTranscriptText(sanitizedText, speaker)) {
                    messages.push({
                        index: index,
                        speaker: speaker,
                        text: sanitizedText,
                        hash: generateHash(speaker, sanitizedText)
                    });
                }
            }
        } catch (error) {
            console.error(`❌ Error processing element ${index + 1}:`, error);
        }
    });

    console.log('🔍 [CONTENT] Scrape completed:', messages.length, 'messages');

    return {
        messages: messages,
        scrapedAt: new Date().toISOString(),
        meetingUrl: window.location.href
    };
}

function generateHash(speaker, text) {
    // Simple hash function for change detection
    const combined = `${speaker}:${text}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
}

function isLanguageSelectionText(text) {
    // Full language selection menu (very long text with many languages)
    if (text.includes('afrikaans (Republika Południowej Afryki)') &&
        text.includes('albański (Albania)') &&
        text.includes('polski (Polska)') &&
        text.length > 500) {
        return true;
    }

    // Short UI element texts
    const shortUIPatterns = [
        /^\s*format_size\s*$/i,
        /^\s*circle\s*$/i,
        /^\s*settings\s*$/i,
        /^\s*arrow_downward\s*$/i,
        /^\s*language\s*$/i,
        /^\s*Przejdź na koniec\s*$/i,
        /^\s*Domyślna\s*$/i,
        /^\s*Bardzo małe\s*$/i,
        /^\s*Małe\s*$/i,
        /^\s*Średni\s*$/i,
        /^\s*Duże\s*$/i,
        /^\s*Wielkie\s*$/i,
        /^\s*Olbrzymie\s*$/i
    ];

    return shortUIPatterns.some(pattern => pattern.test(text));
}

function isValidTranscriptText(text, speaker) {
    if (text.length === 0) return false;
    if (isLanguageSelectionText(text)) return false;
    if (/^[\d\s\-\(\)\[\]]+$/.test(text)) return false;
    if (text.length < 20 && /^(settings|arrow_downward|circle|format_size)$/i.test(text)) return false;
    return true;
}

function sanitizeTranscriptText(text) {
    // Usuń znaki specjalne i ikony
    text = text.replace(/[\u{1F600}-\u{1F6FF}]/gu, ''); // Emotikony
    text = text.replace(/[\u{2600}-\u{26FF}]/gu, ''); // Symbole
    text = text.replace(/[\u{2700}-\u{27BF}]/gu, ''); // Znaki specjalne
    
    // Usuń wielokrotne spacje
    text = text.replace(/\s+/g, ' ');
    
    // Usuń fragmenty menu językowego jeśli się przedostały
    text = text.replace(/\b(afrikaans|albański|amharski|angielski|arabski|azerski|baskijski|bengalski|birmański|chiński|czeski|estoński|filipiński|fiński|francuski|galicyjski|grecki|gruziński|gudźarati|hebrajski|hindi|hiszpański|indonezyjski|islandzki|japoński|jawajski|kannada|kataloński|kazachski|khmerski|koreański|laotański|litewski|łotewski|macedoński|malajalam|malajski|marathi|mongolski|nepalski|niderlandzki|niemiecki|norweski|ormiański|perski|polski|portugalski|rosyjski|rumuński|serbski|słowacki|słoweński|suahili|szwedzki|tajski|tamilski|telugu|turecki|ukraiński|urdu|uzbecki|węgierski|wietnamski|włoski|xhosa|zulu)\s*\([^)]+\)\s*BETA?\s*/gi, '');
    
    // Usuń fragmenty UI
    text = text.replace(/\b(format_size|circle|settings|arrow_downward|Przejdź na koniec|Domyślna|Bardzo małe|Małe|Średni|Duże|Wielkie|Olbrzymie|Biały|Czarny|Niebieski|Zielony|Czerwony|Żółty|Błękitny|Fuksja)\b/gi, '');
    
    // Usuń pozostałe artefakty
    text = text.replace(/\bBETA\b/gi, '');
    text = text.replace(/^\s*-\s*/, ''); // Usuń myślniki na początku
    text = text.replace(/\s*-\s*$/, ''); // Usuń myślniki na końcu
    
    return text.trim();
}

// ============================================================================
// SELF-SCANNING LOOP (runs in content script, immune to service worker kill)
// ============================================================================

let _isScanning = false;
let _scanInterval = null;
let _scanningSessionId = null;
let _scanCount = 0;

/**
 * Get the current tab ID from the extension framework
 * @returns {Promise<number|null>}
 */
function _getOwnTabId() {
    return new Promise((resolve) => {
        try {
            chrome.runtime.sendMessage({ action: 'getOwnTabId' }, (response) => {
                if (chrome.runtime.lastError) {
                    resolve(null);
                    return;
                }
                resolve(response?.tabId || null);
            });
        } catch {
            resolve(null);
        }
    });
}

/**
 * Start scanning transcript at 3-second intervals.
 * Data is saved to chrome.storage.local and optionally pushed to the popup.
 * @param {string} sessionId - Current recording session ID
 */
async function startScanning(sessionId) {
    if (_isScanning) {
        console.log('⚠️ [CONTENT SCAN] Already scanning, stopping previous before restart');
        await stopScanning();
    }

    _isScanning = true;
    _scanningSessionId = sessionId;
    _scanCount = 0;

    const tabId = await _getOwnTabId();
    console.log('🟢 [CONTENT SCAN] Starting scanning, sessionId:', sessionId, 'tabId:', tabId);

    // Persist scanning state for auto-resume on tab refresh
    try {
        await chrome.storage.local.set({
            scanningState: { isScanning: true, sessionId, tabId }
        });
    } catch (e) {
        console.error('❌ [CONTENT SCAN] Failed to persist scanning state:', e);
    }

    // Cache the resolved tab ID so we don't re-query every tick
    let resolvedTabId = tabId;

    _scanInterval = setInterval(async () => {
        if (!_isScanning) {
            clearInterval(_scanInterval);
            _scanInterval = null;
            return;
        }

        _scanCount++;

        try {
            const result = scrapeTranscript();
            if (!result?.messages?.length) return;

            console.log(`🔶 [CONTENT SCAN] Scan #${_scanCount}:`, result.messages.length, 'messages');

            if (!resolvedTabId) {
                resolvedTabId = await _getOwnTabId();
            }
            const storageKey = resolvedTabId ? `backgroundScan_${resolvedTabId}` : 'backgroundScan_unknown';

            await chrome.storage.local.set({
                [storageKey]: {
                    data: result,
                    timestamp: Date.now(),
                    sequenceNumber: _scanCount,
                    meetingUrl: result.meetingUrl
                }
            });

            // Create checkpoint every 10 scans
            if (_scanCount % 10 === 0 && resolvedTabId) {
                await _createCheckpoint(resolvedTabId, result, _scanCount);
            }

            // Try to notify popup (silently fail if popup is closed)
            try {
                chrome.runtime.sendMessage({
                    action: 'backgroundScanUpdate',
                    data: result
                });
            } catch {
                // Popup not open — data already saved to storage
            }
        } catch (error) {
            console.error('❌ [CONTENT SCAN] Scan error:', error);
            // Do NOT stop scanning on transient errors — the tab is still alive
        }
    }, 3000);
}

/**
 * Stop the scanning loop and clear persisted state
 */
async function stopScanning() {
    console.log('🔴 [CONTENT SCAN] Stopping scanning');
    _isScanning = false;
    _scanningSessionId = null;
    _scanCount = 0;

    if (_scanInterval) {
        clearInterval(_scanInterval);
        _scanInterval = null;
    }

    try {
        await chrome.storage.local.remove('scanningState');
    } catch (e) {
        console.error('❌ [CONTENT SCAN] Failed to clear scanning state:', e);
    }
}

/**
 * Create checkpoint backup of scan data. Keeps last 3 checkpoints.
 * @param {number} tabId
 * @param {Object} data
 * @param {number} scanCount
 */
async function _createCheckpoint(tabId, data, scanCount) {
    try {
        const now = Date.now();
        const checkpointKey = `checkpoint_${tabId}_${now}`;
        await chrome.storage.local.set({
            [checkpointKey]: {
                data,
                timestamp: now,
                scanCount,
                type: 'CHECKPOINT'
            }
        });
        console.log(`💾 [CONTENT SCAN] Checkpoint: ${checkpointKey} (${data.messages.length} messages)`);
        await _cleanupOldCheckpoints(tabId);
    } catch (error) {
        console.error('❌ [CONTENT SCAN] Checkpoint failed:', error);
    }
}

/**
 * Remove old checkpoints, keeping only the last 3
 * @param {number} tabId
 */
async function _cleanupOldCheckpoints(tabId) {
    try {
        const allData = await chrome.storage.local.get(null);
        const checkpointKeys = Object.keys(allData)
            .filter(k => k.startsWith(`checkpoint_${tabId}_`))
            .sort();

        if (checkpointKeys.length > 3) {
            const toRemove = checkpointKeys.slice(0, -3);
            await chrome.storage.local.remove(toRemove);
            console.log(`🧹 [CONTENT SCAN] Cleaned up ${toRemove.length} old checkpoints`);
        }
    } catch (error) {
        console.error('❌ [CONTENT SCAN] Checkpoint cleanup failed:', error);
    }
}

/**
 * Auto-resume scanning on content script load (handles tab refresh)
 */
async function _autoResumeScanning() {
    try {
        const result = await chrome.storage.local.get('scanningState');
        const state = result.scanningState;

        if (state?.isScanning && state.sessionId) {
            console.log('🔄 [CONTENT SCAN] Auto-resuming scanning for session:', state.sessionId);
            await startScanning(state.sessionId);
        }
    } catch (error) {
        console.error('❌ [CONTENT SCAN] Auto-resume failed:', error);
    }
}

// Automatyczne wykrywanie początku spotkania
function detectMeetingStart() {
    // Sprawdź co 2 sekundy czy pojawiły się napisy
    const checkInterval = setInterval(() => {
        const captionsButton = document.querySelector('[aria-label*="napisy"], [aria-label*="captions"], [aria-label*="subtitles"]');
        const transcriptElements = document.querySelectorAll('.a4cQT, [jscontroller="MZnM8e"]');

        if (captionsButton || transcriptElements.length > 0) {
            console.log('🎬 Meeting started, captions available');
            clearInterval(checkInterval);
        }
    }, 2000);

    // Zatrzymaj sprawdzanie po 5 minutach
    setTimeout(() => clearInterval(checkInterval), 300000);
}

// Rozpocznij wykrywanie spotkania
detectMeetingStart();

// Auto-resume scanning if it was active before tab refresh
_autoResumeScanning();