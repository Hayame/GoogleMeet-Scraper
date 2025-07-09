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
    
    // Szukamy różnych możliwych selektorów dla transkrypcji - bardziej specyficzne
    const selectors = [
        // Główny kontener transkrypcji - bardziej specyficzne selektory
        '.a4cQT:not([role="menu"]):not([role="listbox"])', // Kontener transkrypcji, ale nie menu
        '.yEicIe.VbkSUe:not([role="menu"]):not([role="listbox"])', // Bloki transkrypcji - oryginalny selektor
        '.ygiCle.VbkSUe:not([role="menu"]):not([role="listbox"])', // Nowy selektor z obrazka
        '[jscontroller="MZnM8e"]:not([role="menu"]):not([role="listbox"])', // Alternatywny selektor
        '[jscontroller="bzaDVe"]:not([role="menu"]):not([role="listbox"])', // Kolejny możliwy selektor
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
                           element.closest('.ygiCle.VbkSUe') ||
                           element.closest('[jscontroller]') || 
                           element.parentElement;
            
            if (!container) return;
            
            // Sprawdź czy kontener nie jest menu lub lista wyboru
            if (container.getAttribute('role') === 'menu' || 
                container.getAttribute('role') === 'listbox' ||
                container.querySelector('[role="menu"], [role="listbox"]') ||
                container.closest('[role="menu"], [role="listbox"]')) {
                return;
            }
            
            // Pobierz nazwę osoby mówiącej - ULEPSZONE z .NWpY1d
            let speaker = '';
            const speakerElements = container.querySelectorAll('[jsname="hJNqvr"], .MBpOc, .NeplSy, .NWpY1d');
            speakerElements.forEach(el => {
                const text = el.textContent.trim();
                if (text && !speaker) {
                    speaker = text;
                }
            });
            
            // Jeśli nie znaleziono, szukaj w rodzicu i sąsiadach
            if (!speaker) {
                const parentSpeaker = container.parentElement?.querySelector('[jsname="hJNqvr"], .NWpY1d');
                if (parentSpeaker) {
                    speaker = parentSpeaker.textContent.trim();
                }
            }
            
            // Jeśli nadal nie znaleziono, szukaj w poprzednim elemencie (nazwa może być oddzielnie)
            if (!speaker) {
                const previousElement = container.previousElementSibling;
                if (previousElement) {
                    const prevSpeaker = previousElement.querySelector('[jsname="hJNqvr"], .NWpY1d, .MBpOc, .NeplSy');
                    if (prevSpeaker) {
                        speaker = prevSpeaker.textContent.trim();
                    }
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
            
            // Dodaj wpis tylko jeśli ma tekst i jest prawidłowy
            if (text && text.trim() && isValidTranscriptText(text.trim(), speaker)) {
                const sanitizedText = sanitizeTranscriptText(text.trim());
                if (sanitizedText && isValidTranscriptText(sanitizedText, speaker)) {
                    entries.push({
                        speaker: speaker || 'Nieznany',
                        text: sanitizedText,
                        timestamp: timestamp
                    });
                }
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
    
    // Bardziej specyficzne selektory - unikaj menu i listy wyboru
    const speakerSelectors = [
        '[jsname="hJNqvr"]:not([role="menu"]):not([role="listbox"])',
        '.MBpOc:not([role="menu"]):not([role="listbox"])',
        '.NeplSy:not([role="menu"]):not([role="listbox"])',
        '.NWpY1d:not([role="menu"]):not([role="listbox"])'
    ];
    
    const textSelectors = [
        '[jsname="YSAhf"]:not([role="menu"]):not([role="listbox"])',
        '[jsname="MBpOc"]:not([role="menu"]):not([role="listbox"])',
        '.VbkSUe:not([role="menu"]):not([role="listbox"])'
    ];
    
    // Znajdź elementy tylko w kontenerach transkrypcji
    const transcriptContainers = document.querySelectorAll('.a4cQT, .yEicIe.VbkSUe, .ygiCle.VbkSUe');
    
    let currentSpeaker = '';
    let currentText = '';
    
    // Przeszukaj tylko elementy w kontenerach transkrypcji
    transcriptContainers.forEach(container => {
        // Sprawdź czy kontener nie jest menu
        if (container.getAttribute('role') === 'menu' || 
            container.getAttribute('role') === 'listbox' ||
            container.querySelector('[role="menu"], [role="listbox"]')) {
            return;
        }
        
        // Znajdź elementy nazwisk
        speakerSelectors.forEach(selector => {
            const speakerElements = container.querySelectorAll(selector);
            speakerElements.forEach(element => {
                const text = element.textContent.trim();
                if (text && isValidTranscriptText(text, '')) {
                    // Jeśli mamy poprzedni wpis, dodaj go
                    if (currentSpeaker && currentText && isValidTranscriptText(currentText.trim(), currentSpeaker)) {
                        const sanitizedText = sanitizeTranscriptText(currentText.trim());
                        if (sanitizedText && isValidTranscriptText(sanitizedText, currentSpeaker)) {
                            entries.push({
                                speaker: currentSpeaker,
                                text: sanitizedText,
                                timestamp: ''
                            });
                        }
                    }
                    currentSpeaker = text;
                    currentText = '';
                }
            });
        });
        
        // Znajdź elementy tekstu
        textSelectors.forEach(selector => {
            const textElements = container.querySelectorAll(selector);
            textElements.forEach(element => {
                const text = element.textContent.trim();
                if (text && text !== currentSpeaker && isValidTranscriptText(text, currentSpeaker)) {
                    currentText += text + ' ';
                }
            });
        });
    });
    
    // Dodaj ostatni wpis
    if (currentSpeaker && currentText && isValidTranscriptText(currentText.trim(), currentSpeaker)) {
        const sanitizedText = sanitizeTranscriptText(currentText.trim());
        if (sanitizedText && isValidTranscriptText(sanitizedText, currentSpeaker)) {
            entries.push({
                speaker: currentSpeaker,
                text: sanitizedText,
                timestamp: ''
            });
        }
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

function isLanguageSelectionText(text) {
    // Wzorce charakterystyczne dla menu wyboru języka
    const languagePatterns = [
        /^\s*polski\s*\(Polska\)/i,
        /^\s*afrikaans\s*\(Republika Południowej Afryki\)/i,
        /^\s*albański\s*\(Albania\)/i,
        /^\s*amharski\s*\(Etiopia\)/i,
        /^\s*angielski\s*\(Australia\)/i,
        /^\s*arabski\s*\(Egipt\)/i,
        /^\s*azerski\s*\(Azerbejdżan\)/i,
        /^\s*baskijski\s*\(Hiszpania\)/i,
        /^\s*bengalski\s*\(Bangladesz\)/i,
        /^\s*birmański\s*\(Mjanma\)/i,
        /^\s*chiński[,\s]*mandaryński/i,
        /^\s*czeski\s*\(Czechy\)/i,
        /^\s*francuski\s*\(Kanada\)/i,
        /^\s*grecki\s*\(Grecja\)/i,
        /^\s*hiszpański\s*\(Hiszpania\)/i,
        /^\s*japoński/i,
        /^\s*koreański/i,
        /^\s*niemiecki/i,
        /^\s*rosyjski/i,
        /^\s*włoski/i,
        /BETA\s*$/i,
        /^\s*format_size\s+/i,
        /^\s*circle\s+/i,
        /^\s*settings\s+/i,
        /^\s*arrow_downward\s+/i,
        /Przejdź na koniec/i,
        /Domyślna\s+(Biały|Czarny|Niebieski|Zielony|Czerwony|Żółty)/i,
        /Bardzo małe|Małe|Średni|Duże|Wielkie|Olbrzymie/i
    ];
    
    // Sprawdź czy tekst pasuje do wzorców języków
    return languagePatterns.some(pattern => pattern.test(text));
}

function isValidTranscriptText(text, speaker) {
    // Sprawdź czy tekst nie jest z menu wyboru języka
    if (isLanguageSelectionText(text)) {
        return false;
    }
    
    // Sprawdź czy tekst nie jest zbyt krótki (prawdopodobnie UI)
    if (text.length < 3) {
        return false;
    }
    
    // Sprawdź czy tekst nie składa się tylko z cyfr i znaków specjalnych
    if (/^[\d\s\-\(\)\[\]]+$/.test(text)) {
        return false;
    }
    
    // Sprawdź czy tekst nie jest ikoną lub przyciskiem
    if (/^(settings|arrow_downward|circle|format_size)$/i.test(text)) {
        return false;
    }
    
    // Sprawdź czy tekst nie jest długą listą języków w jednej linii
    if (text.includes('polski (Polska)') || text.includes('afrikaans (Republika')) {
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