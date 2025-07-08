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

// Nasłuchuj wiadomości z popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Received message:', request);
    
    if (request.action === 'scrapeTranscript') {
        try {
            const transcriptData = scrapeTranscript();
            console.log('📝 Scraped data:', transcriptData);
            sendResponse({ success: true, data: transcriptData });
        } catch (error) {
            console.error('❌ Scraping error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    return true; // Wskazuje, że odpowiedź będzie asynchroniczna
});

function scrapeTranscript() {
    const entries = [];
    
    // Szukamy różnych możliwych selektorów dla transkrypcji
    const selectors = [
        // Główny kontener transkrypcji
        '.a4cQT', // Kontener transkrypcji
        '.yEicIe.VbkSUe', // Bloki transkrypcji
        '[jscontroller="MZnM8e"]', // Alternatywny selektor
        '[jscontroller="bzaDVe"]', // Kolejny możliwy selektor
    ];
    
    let transcriptElements = null;
    
    // Próbuj znaleźć elementy transkrypcji używając różnych selektorów
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            transcriptElements = elements;
            console.log(`Znaleziono transkrypcję używając selektora: ${selector}`);
            break;
        }
    }
    
    if (!transcriptElements || transcriptElements.length === 0) {
        // Próba znalezienia po atrybutach jsname
        transcriptElements = document.querySelectorAll('[jsname="hJNqvr"]');
        if (transcriptElements.length === 0) {
            console.log('Nie znaleziono elementów transkrypcji');
            return {
                entries: [],
                scrapedAt: new Date().toISOString(),
                meetingUrl: window.location.href
            };
        }
    }
    
    // Przetwarzaj każdy element transkrypcji
    transcriptElements.forEach((element) => {
        try {
            // Próbuj znaleźć najbliższy kontener zawierający całą wypowiedź
            let container = element.closest('.yEicIe.VbkSUe') || 
                           element.closest('[jscontroller]') || 
                           element.parentElement;
            
            if (!container) return;
            
            // Pobierz nazwę osoby mówiącej
            let speaker = '';
            const speakerElements = container.querySelectorAll('[jsname="hJNqvr"], .MBpOc, .NeplSy');
            speakerElements.forEach(el => {
                const text = el.textContent.trim();
                if (text && !speaker) {
                    speaker = text;
                }
            });
            
            // Jeśli nie znaleziono, szukaj w rodzicu
            if (!speaker) {
                const parentSpeaker = container.parentElement?.querySelector('[jsname="hJNqvr"]');
                if (parentSpeaker) {
                    speaker = parentSpeaker.textContent.trim();
                }
            }
            
            // Pobierz tekst wypowiedzi
            let text = '';
            const textSelectors = [
                '[jsname="YSAhf"]',
                '[jsname="MBpOc"]', 
                '[jsname="NeplSy"]',
                '.VbkSUe',
                'span[jsname]'
            ];
            
            for (const selector of textSelectors) {
                const textElements = container.querySelectorAll(selector);
                textElements.forEach(el => {
                    // Sprawdź czy element nie jest nazwą osoby
                    if (el.textContent.trim() && el.textContent.trim() !== speaker) {
                        text += el.textContent.trim() + ' ';
                    }
                });
                if (text) break;
            }
            
            // Jeśli nadal nie ma tekstu, pobierz cały tekst kontenera
            if (!text) {
                text = container.textContent.trim();
                // Usuń nazwę osoby z tekstu
                if (speaker && text.startsWith(speaker)) {
                    text = text.substring(speaker.length).trim();
                }
            }
            
            // Pobierz timestamp jeśli istnieje
            let timestamp = '';
            const timestampElement = container.querySelector('.frX31c-vlczkd, .P5KVFf, [jsname="r2fjRf"]');
            if (timestampElement) {
                timestamp = timestampElement.textContent.trim();
            }
            
            // Dodaj wpis tylko jeśli ma tekst
            if (text && text.trim()) {
                entries.push({
                    speaker: speaker || 'Nieznany',
                    text: text.trim(),
                    timestamp: timestamp
                });
            }
        } catch (error) {
            console.error('Błąd przetwarzania elementu:', error);
        }
    });
    
    // Jeśli pierwsza metoda nie zadziałała, spróbuj alternatywną
    if (entries.length === 0) {
        entries.push(...scrapeAlternativeMethod());
    }
    
    // Usuń duplikaty
    const uniqueEntries = removeDuplicates(entries);
    
    return {
        entries: uniqueEntries,
        scrapedAt: new Date().toISOString(),
        meetingUrl: window.location.href
    };
}

function scrapeAlternativeMethod() {
    const entries = [];
    
    // Szukaj wszystkich elementów z tekstem transkrypcji
    const allTextElements = document.querySelectorAll('[jsname], [jscontroller]');
    
    let currentSpeaker = '';
    let currentText = '';
    
    allTextElements.forEach(element => {
        const jsname = element.getAttribute('jsname');
        const text = element.textContent.trim();
        
        if (!text) return;
        
        // Rozpoznaj nazwę osoby mówiącej
        if (jsname === 'hJNqvr' || element.classList.contains('MBpOc') || element.classList.contains('NeplSy')) {
            // Jeśli mamy poprzedni wpis, dodaj go
            if (currentSpeaker && currentText) {
                entries.push({
                    speaker: currentSpeaker,
                    text: currentText,
                    timestamp: ''
                });
            }
            currentSpeaker = text;
            currentText = '';
        } 
        // Rozpoznaj tekst wypowiedzi
        else if (jsname === 'YSAhf' || jsname === 'MBpOc' || element.classList.contains('VbkSUe')) {
            currentText += text + ' ';
        }
    });
    
    // Dodaj ostatni wpis
    if (currentSpeaker && currentText) {
        entries.push({
            speaker: currentSpeaker,
            text: currentText.trim(),
            timestamp: ''
        });
    }
    
    return entries;
}

function removeDuplicates(entries) {
    const seen = new Set();
    return entries.filter(entry => {
        const key = `${entry.speaker}:${entry.text}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
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