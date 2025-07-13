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

// Try to detect Google user name from page elements
function detectGoogleUserName() {
    // Try different selectors to find user name in Google Meet
    const selectors = [
        '[aria-label*="Google Account"]',
        '[aria-label*="Konto Google"]',
        '.gb_db', // Google bar user name
        '[data-name]', // Some Google Meet elements have data-name
        '.VfPpkd-Bz112c-LgbsSe', // Material Design button with account info
    ];
    
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            let userName = null;
            
            // Try to extract name from aria-label
            if (element.getAttribute('aria-label')) {
                const ariaLabel = element.getAttribute('aria-label');
                if (ariaLabel.includes('Google Account:')) {
                    userName = ariaLabel.replace('Google Account:', '').trim();
                } else if (ariaLabel.includes('Konto Google:')) {
                    userName = ariaLabel.replace('Konto Google:', '').trim();
                }
            }
            
            // Try to extract from text content
            if (!userName && element.textContent) {
                const text = element.textContent.trim();
                if (text.length > 0 && text.length < 50 && !text.includes('@')) {
                    userName = text;
                }
            }
            
            if (userName) {
                console.log('👤 [CONTENT] Detected Google user name:', userName);
                userSettings.googleUserName = userName;
                
                // Send to popup
                chrome.runtime.sendMessage({
                    action: 'updateGoogleUserName',
                    userName: userName
                });
                
                return userName;
            }
        }
    }
    
    return null;
}

// Initialize user settings
loadUserSettings();

// Try to detect Google user name after page loads
setTimeout(() => {
    detectGoogleUserName();
}, 2000);

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