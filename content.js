// Override console.log to respect DEBUG_ENABLED setting
const originalConsoleLog = console.log;
console.log = function(...args) {
    if (window.DEBUG_ENABLED) {
        originalConsoleLog.apply(console, args);
    }
};

// Potwierdzenie załadowania content script
console.log('🚀 Google Meet Recorder - Content script loaded at:', window.location.href);

// Sprawdź czy jesteśmy na właściwej stronie
if (!window.location.href.includes('meet.google.com')) {
    console.error('❌ Not on Google Meet page');
} else {
    console.log('✅ On Google Meet page');
}

// Test Chrome API
if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.error('❌ Chrome API not available');
} else {
    console.log('✅ Chrome API available');
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
    console.log('🔄 [CONTENT] === STARTING FALLBACK DETECTION ===');
    console.log('🔄 [CONTENT] Page URL:', window.location.href);
    console.log('🔄 [CONTENT] Document ready state:', document.readyState);
    
    try {
        // Method 1: Try script tag detection first
        console.log('🔄 [CONTENT] === METHOD 1: SCRIPT TAG DETECTION ===');
        const scriptName = detectFromScriptTagsFallback();
        if (scriptName) {
            console.log('✅ [CONTENT] Fallback script tag detection successful:', scriptName);
            return scriptName;
        }
        
        // Method 2: Fallback to basic DOM detection (simplified)
        console.log('🔄 [CONTENT] === METHOD 2: DOM DETECTION ===');
        const domName = detectFromDOMFallback();
        if (domName) {
            console.log('✅ [CONTENT] Fallback DOM detection successful:', domName);
            return domName;
        }
        
        console.log('❌ [CONTENT] === ALL FALLBACK METHODS FAILED ===');
        return null;
        
    } catch (error) {
        console.error('❌ [CONTENT] CRITICAL ERROR in fallback detection:', error);
        console.error('❌ [CONTENT] Error stack:', error.stack);
        return null;
    }
}

// Script tag detection fallback (simplified version)
function detectFromScriptTagsFallback() {
    console.log('📜 [CONTENT] === STARTING SCRIPT TAG ANALYSIS ===');
    
    try {
        // Test basic DOM access
        console.log('📜 [CONTENT] Testing document access...');
        if (!document) {
            console.error('❌ [CONTENT] Document not available!');
            return null;
        }
        
        console.log('📜 [CONTENT] Querying for script tags...');
        const scriptTags = document.querySelectorAll('script');
        console.log(`📜 [CONTENT] Found ${scriptTags.length} script tags to analyze`);
        
        if (scriptTags.length === 0) {
            console.warn('⚠️ [CONTENT] No script tags found on page!');
            return null;
        }
        
        let scriptsWithCallback = 0;
        let accessibleScripts = 0;
        
        for (let i = 0; i < scriptTags.length; i++) {
            try {
                const script = scriptTags[i];
                console.log(`📜 [CONTENT] Analyzing script ${i + 1}/${scriptTags.length}...`);
                
                // Test script access
                let content;
                try {
                    content = script.textContent || script.innerHTML;
                    accessibleScripts++;
                } catch (accessError) {
                    console.warn(`⚠️ [CONTENT] Cannot access script ${i + 1} content:`, accessError.message);
                    continue;
                }
                
                if (!content) {
                    console.log(`📜 [CONTENT] Script ${i + 1} has no content, skipping`);
                    continue;
                }
                
                console.log(`📜 [CONTENT] Script ${i + 1} content length: ${content.length}`);
                
                if (content.includes('AF_initDataCallback')) {
                    scriptsWithCallback++;
                    console.log(`📜 [CONTENT] ✅ Found AF_initDataCallback in script ${i + 1} (${scriptsWithCallback} total found)`);
                    
                    // Try direct name extraction (most reliable)
                    console.log(`📜 [CONTENT] Attempting name extraction from script ${i + 1}...`);
                    const userName = extractNameDirectlyFromScriptFallback(content);
                    if (userName) {
                        console.log(`✅ [CONTENT] Direct extraction successful from script ${i + 1}: "${userName}"`);
                        const cleanedName = cleanUserNameFallback(userName);
                        console.log(`✅ [CONTENT] Final cleaned name: "${cleanedName}"`);
                        return cleanedName;
                    } else {
                        console.log(`📜 [CONTENT] No valid name found in script ${i + 1}`);
                    }
                } else {
                    console.log(`📜 [CONTENT] Script ${i + 1} does not contain AF_initDataCallback`);
                }
                
            } catch (scriptError) {
                console.error(`❌ [CONTENT] Error processing script ${i + 1}:`, scriptError);
                continue;
            }
        }
        
        console.log(`📜 [CONTENT] === SCRIPT ANALYSIS COMPLETE ===`);
        console.log(`📜 [CONTENT] Total scripts: ${scriptTags.length}`);
        console.log(`📜 [CONTENT] Accessible scripts: ${accessibleScripts}`);
        console.log(`📜 [CONTENT] Scripts with AF_initDataCallback: ${scriptsWithCallback}`);
        console.log('📜 [CONTENT] No valid user name found in any script tag');
        return null;
        
    } catch (error) {
        console.error('❌ [CONTENT] CRITICAL ERROR in script tag detection:', error);
        console.error('❌ [CONTENT] Error stack:', error.stack);
        return null;
    }
}

// Direct name extraction from script content (fallback version)
function extractNameDirectlyFromScriptFallback(scriptContent) {
    console.log('📜 [CONTENT] Attempting direct name extraction...');
    console.log('📜 [CONTENT] Script content length:', scriptContent.length);
    
    try {
        // Pattern 1: Look for email followed by name pattern (flexible URL handling)
        // Example: "szlachtowski.lukasz@gmail.com","https://lh3.googleusercontent.com/a/ACg8ocJAZPiPB_Sgx9kdDHb_wZuS3PZZTGajVLsVfyHoqQh5uVs6HQ\u003ds192-c-mo","Łukasz Szlachtowski"
        const emailNamePattern = /"([^"]+@[^"]+)","[^"]*","([^"]{2,50})"/g;
        let match;
        let patternAttempts = 0;
        
        console.log('📜 [CONTENT] Trying Pattern 1: Email-URL-Name pattern...');
        while ((match = emailNamePattern.exec(scriptContent)) !== null && patternAttempts < 20) {
            patternAttempts++;
            const email = match[1];
            const name = match[2];
            
            console.log(`📜 [CONTENT] Pattern 1 match ${patternAttempts}: "${email}" -> "${name}"`);
            
            if (isValidUserNameFallback(name)) {
                console.log(`📜 [CONTENT] Pattern 1 success: "${name}"`);
                return name;
            } else {
                console.log(`📜 [CONTENT] Pattern 1 rejected: "${name}" (failed validation)`);
            }
        }
        
        // Pattern 2: More flexible email-name pattern (skip middle part)
        // Look for email, then any content, then a name-like string
        console.log('📜 [CONTENT] Trying Pattern 2: Flexible email...name pattern...');
        const flexibleEmailPattern = /"([^"]+@gmail\.com)"[^"]*"[^"]*"([A-ZĄŻĆĘŁŃÓŚŹŻ][^"]{2,49})"/g;
        patternAttempts = 0;
        
        while ((match = flexibleEmailPattern.exec(scriptContent)) !== null && patternAttempts < 20) {
            patternAttempts++;
            const email = match[1];
            const name = match[2];
            
            console.log(`📜 [CONTENT] Pattern 2 match ${patternAttempts}: "${email}" -> "${name}"`);
            
            if (isValidUserNameFallback(name)) {
                console.log(`📜 [CONTENT] Pattern 2 success: "${name}"`);
                return name;
            } else {
                console.log(`📜 [CONTENT] Pattern 2 rejected: "${name}" (failed validation)`);
            }
        }
        
        // Pattern 3: Look for Polish names with special characters anywhere
        console.log('📜 [CONTENT] Trying Pattern 3: Polish names...');
        const polishNamePattern = /"([A-ZĄŻĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\s+[A-ZĄŻĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)"/g;
        patternAttempts = 0;
        
        while ((match = polishNamePattern.exec(scriptContent)) !== null && patternAttempts < 20) {
            patternAttempts++;
            const name = match[1];
            
            console.log(`📜 [CONTENT] Pattern 3 match ${patternAttempts}: "${name}"`);
            
            if (isValidUserNameFallback(name)) {
                console.log(`📜 [CONTENT] Pattern 3 success: "${name}"`);
                return name;
            } else {
                console.log(`📜 [CONTENT] Pattern 3 rejected: "${name}" (failed validation)`);
            }
        }
        
        // Pattern 4: Very broad name pattern - look for any quoted string that looks like a name
        console.log('📜 [CONTENT] Trying Pattern 4: Broad name pattern...');
        const broadNamePattern = /"([A-ZĄŻĆĘŁŃÓŚŹŻ][A-Za-ząćęłńóśźż\s]{2,48}[a-ząćęłńóśźżA-Za-z])"/g;
        patternAttempts = 0;
        
        while ((match = broadNamePattern.exec(scriptContent)) !== null && patternAttempts < 50) {
            patternAttempts++;
            const name = match[1];
            
            // Only log promising candidates to avoid spam
            if (name.includes('ł') || name.includes('Ł') || name.includes(' ')) {
                console.log(`📜 [CONTENT] Pattern 4 match ${patternAttempts}: "${name}"`);
                
                if (isValidUserNameFallback(name)) {
                    console.log(`📜 [CONTENT] Pattern 4 success: "${name}"`);
                    return name;
                }
            }
        }
        
        console.log('📜 [CONTENT] All patterns failed - no valid name found');
        return null;
        
    } catch (error) {
        console.error('❌ [CONTENT] Error in direct extraction:', error);
        return null;
    }
}

// Simple validation for fallback detection
function isValidUserNameFallback(name) {
    if (!name || typeof name !== 'string') {
        console.log(`📜 [CONTENT] Validation failed: not a string`);
        return false;
    }
    
    const trimmed = name.trim();
    
    // Basic validation
    if (trimmed.length < 2 || trimmed.length > 50) {
        console.log(`📜 [CONTENT] Validation failed: invalid length ${trimmed.length}`);
        return false;
    }
    
    // Must contain letters
    if (!/[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(trimmed)) {
        console.log(`📜 [CONTENT] Validation failed: no letters found`);
        return false;
    }
    
    // Should not be email or URL
    if (trimmed.includes('@') || trimmed.includes('http') || trimmed.includes('://')) {
        console.log(`📜 [CONTENT] Validation failed: contains email/URL patterns`);
        return false;
    }
    
    // Enhanced blacklist for script tag content
    const blacklistedTerms = [
        // UI terms
        'settings', 'account', 'profile', 'zamknij', 'close', 'menu', 'more', 'camera', 'microphone',
        // Google services and APIs
        'apis.google.com', 'client.js', 'javascript', 'google.com', 'gstatic.com',
        'accounts.google.com', 'googleapis.com', 'googleusercontent.com',
        // Technical terms
        'undefined', 'null', 'true', 'false', 'callback', 'function', 'window', 'document',
        'script', 'src', 'type', 'text', 'application', 'json', 'css', 'html',
        // Common false positives from scripts
        'Meet', 'Hangouts', 'Chrome', 'Browser', 'Android', 'iOS',
        'Service', 'API', 'SDK', 'Library', 'Framework'
    ];
    
    const lowerName = trimmed.toLowerCase();
    for (const term of blacklistedTerms) {
        if (lowerName.includes(term.toLowerCase())) {
            console.log(`📜 [CONTENT] Validation failed: contains blacklisted term "${term}"`);
            return false;
        }
    }
    
    // Should look like a name (has space and proper capitalization)
    if (trimmed.includes(' ')) {
        const words = trimmed.split(' ');
        // Check if it looks like "FirstName LastName"
        const looksLikeName = words.length >= 2 && 
                             words.every(word => /^[A-ZĄŻĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+$/.test(word));
        
        if (looksLikeName) {
            console.log(`📜 [CONTENT] Validation passed: looks like proper name "${trimmed}"`);
            return true;
        }
    }
    
    // Single names are less reliable but allow them if they contain Polish characters
    if (/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(trimmed)) {
        console.log(`📜 [CONTENT] Validation passed: contains Polish characters "${trimmed}"`);
        return true;
    }
    
    console.log(`📜 [CONTENT] Validation failed: doesn't look like a name "${trimmed}"`);
    return false;
}

// Basic DOM detection fallback (very simple)
function detectFromDOMFallback() {
    console.log('🔍 [CONTENT] Starting basic DOM detection fallback...');
    
    // Only try a few safe selectors to avoid picking up "Zamknij"
    const safeSelectors = [
        '[aria-label*="Google Account"] .gb_Ab',
        '.gb_B [role="button"] span:not(.gb_D)',
        '.gb_b .gb_db'
    ];
    
    for (const selector of safeSelectors) {
        try {
            const elements = document.querySelectorAll(selector);
            console.log(`🔍 [CONTENT] Trying selector: "${selector}" - found ${elements.length} elements`);
            
            for (const element of elements) {
                const text = element.textContent?.trim();
                if (text && isValidUserNameFallback(text)) {
                    console.log(`🔍 [CONTENT] Found valid name: "${text}"`);
                    return cleanUserNameFallback(text);
                }
            }
        } catch (error) {
            console.warn(`⚠️ [CONTENT] Error with selector "${selector}":`, error);
        }
    }
    
    console.log('🔍 [CONTENT] Basic DOM detection failed');
    return null;
}

// Simple name cleaning for fallback
function cleanUserNameFallback(name) {
    if (!name) return null;
    
    // Basic cleaning
    let cleaned = name.trim();
    
    // Remove email in parentheses
    cleaned = cleaned.replace(/\s*\([^()]*@[^()]*\)\s*$/, '');
    
    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    console.log(`🧹 [CONTENT] Cleaned name: "${name}" -> "${cleaned}"`);
    
    if (cleaned.length >= 2 && cleaned.length <= 50) {
        return cleaned;
    }
    
    return null;
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

// Google user name detection is now automatically handled by GoogleUserDetector module
// The module starts continuous detection when it initializes

// Nasłuchuj wiadomości z popup
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
        // Manual Google name detection triggered from settings
        console.log('👤 [CONTENT] Manual Google name detection requested');
        console.log('👤 [CONTENT] Current page URL:', window.location.href);
        console.log('👤 [CONTENT] GoogleUserDetector available:', !!window.GoogleUserDetector);
        
        try {
            let userName = null;
            
            if (window.GoogleUserDetector) {
                console.log('👤 [CONTENT] Using GoogleUserDetector for manual detection');
                
                // Get debug info before detection
                const debugInfo = window.GoogleUserDetector.getDebugInfo();
                console.log('👤 [CONTENT] GoogleUserDetector debug info:', debugInfo);
                
                userName = window.GoogleUserDetector.manualDetect();
                console.log('👤 [CONTENT] GoogleUserDetector result:', userName);
                
                // Get additional debug info after detection
                const postDebugInfo = window.GoogleUserDetector.getDebugInfo();
                console.log('👤 [CONTENT] GoogleUserDetector post-detection info:', postDebugInfo);
                
            } else {
                console.log('👤 [CONTENT] Fallback to detectGoogleUserName function');
                userName = detectGoogleUserName();
                console.log('👤 [CONTENT] detectGoogleUserName result:', userName);
            }
            
            if (userName) {
                // Test the cleaning process
                console.log('👤 [CONTENT] Raw detected name:', userName);
                
                userSettings.googleUserName = userName;
                sendResponse({ success: true, userName: userName });
                console.log('✅ [CONTENT] Manual detection successful, final name:', userName);
            } else {
                // Provide more detailed error information
                const errorDetails = {
                    pageUrl: window.location.href,
                    detectorAvailable: !!window.GoogleUserDetector,
                    userSettings: userSettings,
                    detectorState: window.GoogleUserDetector ? window.GoogleUserDetector.state : null
                };
                
                console.log('❌ [CONTENT] Manual detection failed - debug details:', errorDetails);
                sendResponse({ 
                    success: false, 
                    error: 'No Google name detected',
                    debug: errorDetails
                });
            }
        } catch (error) {
            console.error('❌ [CONTENT] Manual detection error:', error);
            console.error('❌ [CONTENT] Error stack:', error.stack);
            
            sendResponse({
                success: false,
                error: error.message,
                stack: error.stack
            });
        }
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
    return true; // Wskazuje, że odpowiedź będzie asynchroniczna
});

function scrapeTranscript() {
    const messages = [];
    
    console.log('🔍 [CONTENT DEBUG] Starting transcript scrape at:', new Date().toISOString());
    
    // Szukaj głównego kontenera transkrypcji
    const mainContainer = document.querySelector('div[jscontroller="D1tHje"]');
    console.log('🔍 [CONTENT DEBUG] Main container found:', !!mainContainer);
    
    if (!mainContainer) {
        console.log('🔍 [CONTENT DEBUG] No main container, returning empty');
        return {
            messages: [],
            scrapedAt: new Date().toISOString(),
            meetingUrl: window.location.href
        };
    }
    
    // Znajdź kontener z napisami (główny kontener z aria-label="Napisy")
    const captionsContainer = mainContainer.querySelector('div[aria-label="Napisy"]') || 
                             mainContainer.querySelector('div[aria-label="Captions"]') || 
                             mainContainer.querySelector('[aria-label*="captions"], [aria-label*="napisy"]');
    
    console.log('🔍 [CONTENT DEBUG] Captions container found:', !!captionsContainer);
    
    if (!captionsContainer) {
        console.log('🔍 [CONTENT DEBUG] No captions container found, returning empty');
        return {
            messages: [],
            scrapedAt: new Date().toISOString(),
            meetingUrl: window.location.href
        };
    }
    
    // Znajdź wszystkie wiadomości w kontenerze - każda ma klasę nMcdL
    const messageElements = captionsContainer.querySelectorAll('.nMcdL');
    console.log('🔍 [CONTENT DEBUG] Message elements found:', messageElements.length);
    
    if (messageElements.length === 0) {
        console.log('🔍 [CONTENT DEBUG] No message elements found, returning empty');
        return {
            messages: [],
            scrapedAt: new Date().toISOString(),
            meetingUrl: window.location.href
        };
    }
    
    // Przetwarzaj każdy element z wiadomością
    messageElements.forEach((messageElement, index) => {
        try {
            // Wyciągnij nazwę osoby mówiącej
            const speakerElement = messageElement.querySelector('.NWpY1d');
            let speaker = speakerElement ? speakerElement.textContent.trim() : 'Nieznany';
            
            // Replace "Ty" with custom display name if set
            if (speaker === 'Ty') {
                speaker = userSettings.displayName;
                console.log('👤 [CONTENT] Replaced "Ty" with custom name:', speaker);
            }
            
            // Wyciągnij tekst transkrypcji
            const textElement = messageElement.querySelector('.ygicle.VbkSUe');
            const text = textElement ? textElement.textContent.trim() : '';
            
            console.log(`🔍 [CONTENT DEBUG] Element ${index}: speaker="${speaker}", text="${text.substring(0, 50)}..."`);
            
            // Waliduj i dodaj wpis
            if (text && isValidTranscriptText(text, speaker)) {
                const sanitizedText = sanitizeTranscriptText(text);
                
                if (sanitizedText && isValidTranscriptText(sanitizedText, speaker)) {
                    const message = {
                        index: index,
                        speaker: speaker,
                        text: sanitizedText,
                        hash: generateHash(speaker, sanitizedText)
                    };
                    messages.push(message);
                    console.log(`✅ [CONTENT DEBUG] Added message ${index}`);
                } else {
                    console.log(`❌ [CONTENT DEBUG] Rejected message ${index} after sanitization`);
                }
            } else {
                console.log(`❌ [CONTENT DEBUG] Rejected message ${index} - invalid text or too short`);
            }
        } catch (error) {
            console.error(`❌ Błąd przetwarzania elementu ${index + 1}:`, error);
        }
    });
    
    const result = {
        messages: messages,
        scrapedAt: new Date().toISOString(),
        meetingUrl: window.location.href
    };
    
    console.log('🔍 [CONTENT DEBUG] Scrape completed, messages found:', messages.length);
    if (messages.length > 0) {
        console.log('🔍 [CONTENT DEBUG] First message:', messages[0]);
    }
    
    return result;
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
    // Sprawdź czy tekst to CAŁE menu językowe (bardzo długi tekst z wieloma językami)
    const isFullLanguageMenu = text.includes('afrikaans (Republika Południowej Afryki)') && 
                              text.includes('albański (Albania)') && 
                              text.includes('polski (Polska)') && 
                              text.length > 500; // Menu językowe jest bardzo długie
    
    if (isFullLanguageMenu) {
        return true;
    }
    
    // Wzorce dla KRÓTKICH tekstów, które to definitywnie elementy UI
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
    
    // Sprawdź tylko krótkie teksty UI
    const isShortUI = shortUIPatterns.some(pattern => pattern.test(text));
    if (isShortUI) {
        return true;
    }
    
    return false;
}

function isValidTranscriptText(text, speaker) {
    // Sprawdź czy tekst nie jest z menu wyboru języka
    if (isLanguageSelectionText(text)) {
        return false;
    }
    
    // Sprawdź czy tekst nie jest pusty
    if (text.length === 0) {
        return false;
    }
    
    // Sprawdź czy tekst nie składa się tylko z cyfr i znaków specjalnych
    if (/^[\d\s\-\(\)\[\]]+$/.test(text)) {
        return false;
    }
    
    // Sprawdź czy tekst to pojedyncze słowa UI (ale nie odrzucaj jeśli są częścią dłuższego tekstu)
    if (text.length < 20 && /^(settings|arrow_downward|circle|format_size)$/i.test(text)) {
        return false;
    }
    
    // Bardziej restrykcyjnie sprawdź czy to menu językowe - tylko jeśli zawiera wiele języków
    if (text.includes('polski (Polska)') && text.includes('afrikaans (Republika') && text.length > 200) {
        return false;
    }
    
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