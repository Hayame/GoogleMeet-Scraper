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
    let usedSelector = null;
    
    // Próbuj znaleźć elementy transkrypcji używając różnych selektorów
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            transcriptElements = elements;
            usedSelector = selector;
            console.log(`🔍 Znaleziono transkrypcję używając selektora: ${selector}`);
            console.log(`📊 Liczba znalezionych elementów: ${elements.length}`);
            
            // Debug: Sprawdź strukturę pierwszego elementu
            if (elements.length > 0) {
                console.log(`🔍 DOM struktura pierwszego elementu:`);
                console.log(elements[0]);
                console.log(`📄 innerHTML pierwszego elementu:`);
                console.log(elements[0].innerHTML);
                console.log(`📝 textContent pierwszego elementu:`);
                console.log(elements[0].textContent);
            }
            break;
        }
    }
    
    if (!transcriptElements || transcriptElements.length === 0) {
        console.log(`\n⚠️ Nie znaleziono elementów przy użyciu podstawowych selektorów`);
        
        // Próba znalezienia po atrybutach jsname
        transcriptElements = document.querySelectorAll('[jsname="hJNqvr"]');
        console.log(`🔍 Spróba z [jsname="hJNqvr"]: ${transcriptElements.length} elementów`);
        
        if (transcriptElements.length === 0) {
            console.log(`❌ Nie znaleziono żadnych elementów transkrypcji`);
            
            // Ostatnia próba - znajdź wszystkie elementy zawierające tekst
            console.log(`🔍 Ostatnia próba - szukam wszystkich elementów z tekstem...`);
            const allElements = document.querySelectorAll('*');
            const potentialTranscriptElements = [];
            
            for (const element of allElements) {
                const text = element.textContent?.trim();
                if (text && text.length > 20 && text.length < 1000 && 
                    !element.querySelector('*') && // Elementy liściowe
                    isValidTranscriptText(text, '')) {
                    potentialTranscriptElements.push(element);
                }
            }
            
            console.log(`🔍 Znaleziono ${potentialTranscriptElements.length} potencjalnych elementów`);
            
            if (potentialTranscriptElements.length === 0) {
                return {
                    entries: [],
                    scrapedAt: new Date().toISOString(),
                    meetingUrl: window.location.href
                };
            }
            
            transcriptElements = potentialTranscriptElements;
        }
    }
    
    // Przetwarzaj każdy element transkrypcji
    console.log(`🔄 Rozpoczynam przetwarzanie ${transcriptElements.length} elementów`);
    
    transcriptElements.forEach((element, index) => {
        console.log(`\n🔍 Przetwarzam element ${index + 1}/${transcriptElements.length}:`);
        console.log(`📄 Element HTML:`, element.outerHTML.substring(0, 200) + '...');
        
        try {
            // Próbuj znaleźć najbliższy kontener zawierający całą wypowiedź
            let container = element.closest('.yEicIe.VbkSUe') || 
                           element.closest('.ygiCle.VbkSUe') ||
                           element.closest('[jscontroller]') || 
                           element.parentElement;
            
            console.log(`📦 Znaleziony kontener:`, container?.tagName, container?.className);
            
            if (!container) {
                console.log(`❌ Brak kontenera dla elementu ${index + 1}`);
                return;
            }
            
            // Sprawdź czy kontener nie jest menu lub lista wyboru
            const hasMenuRole = container.getAttribute('role') === 'menu' || 
                container.getAttribute('role') === 'listbox' ||
                container.querySelector('[role="menu"], [role="listbox"]') ||
                container.closest('[role="menu"], [role="listbox"]');
                
            if (hasMenuRole) {
                console.log(`⚠️ Pomijam element ${index + 1} - jest menu/listbox`);
                return;
            }
            
            // Pobierz nazwę osoby mówiącej - ULEPSZONE z .NWpY1d
            let speaker = '';
            const speakerSelectors = ['[jsname="hJNqvr"]', '.MBpOc', '.NeplSy', '.NWpY1d'];
            
            console.log(`👤 Szukam nazwy osoby mówiącej...`);
            
            // Sprawdź wszystkie selektory dla speaker
            for (const selector of speakerSelectors) {
                const speakerElements = container.querySelectorAll(selector);
                console.log(`🔍 Selektor '${selector}' znalazł ${speakerElements.length} elementów`);
                
                speakerElements.forEach((el, idx) => {
                    const text = el.textContent.trim();
                    console.log(`  - Element ${idx + 1}: "${text}"`);
                    if (text && !speaker) {
                        speaker = text;
                        console.log(`✅ Znaleziono osobę mówiącą: "${speaker}"`);
                    }
                });
                
                if (speaker) break;
            }
            
            // Jeśli nie znaleziono, szukaj w rodzicu i sąsiadach
            if (!speaker) {
                console.log(`🔍 Szukam w rodzicu...`);
                const parentSpeaker = container.parentElement?.querySelector('[jsname="hJNqvr"], .NWpY1d');
                if (parentSpeaker) {
                    speaker = parentSpeaker.textContent.trim();
                    console.log(`✅ Znaleziono osobę mówiącą w rodzicu: "${speaker}"`);
                }
            }
            
            // Jeśli nadal nie znaleziono, szukaj w poprzednim elemencie (nazwa może być oddzielnie)
            if (!speaker) {
                console.log(`🔍 Szukam w poprzednim elemencie...`);
                const previousElement = container.previousElementSibling;
                if (previousElement) {
                    const prevSpeaker = previousElement.querySelector('[jsname="hJNqvr"], .NWpY1d, .MBpOc, .NeplSy');
                    if (prevSpeaker) {
                        speaker = prevSpeaker.textContent.trim();
                        console.log(`✅ Znaleziono osobę mówiącą w poprzednim elemencie: "${speaker}"`);
                    }
                }
            }
            
            if (!speaker) {
                console.log(`❌ Nie znaleziono nazwy osoby mówiącej`);
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
            
            console.log(`💬 Szukam tekstu wypowiedzi...`);
            
            for (const selector of textSelectors) {
                const textElements = container.querySelectorAll(selector);
                console.log(`🔍 Selektor '${selector}' znalazł ${textElements.length} elementów`);
                
                textElements.forEach((el, idx) => {
                    const elementText = el.textContent.trim();
                    console.log(`  - Element ${idx + 1}: "${elementText}"`);
                    
                    // Sprawdź czy element nie jest nazwą osoby
                    if (elementText && elementText !== speaker) {
                        text += elementText + ' ';
                        console.log(`✅ Dodano tekst: "${elementText}"`);
                    } else if (elementText === speaker) {
                        console.log(`⚠️ Pomijam - to nazwa osoby mówiącej`);
                    }
                });
                
                if (text.trim()) {
                    console.log(`✅ Znaleziono tekst z selektorem '${selector}': "${text.trim()}"`);
                    break;
                }
            }
            
            // Jeśli nadal nie ma tekstu, pobierz cały tekst kontenera
            if (!text.trim()) {
                console.log(`🔍 Próbuję pobrać cały tekst kontenera...`);
                text = container.textContent.trim();
                console.log(`📄 Pełny tekst kontenera: "${text}"`);
                
                // Usuń nazwę osoby z tekstu
                if (speaker && text.startsWith(speaker)) {
                    text = text.substring(speaker.length).trim();
                    console.log(`✅ Tekst po usunięciu nazwy osoby: "${text}"`);
                }
            }
            
            if (!text.trim()) {
                console.log(`❌ Nie znaleziono tekstu wypowiedzi`);
            }
            
            // Pobierz timestamp jeśli istnieje
            let timestamp = '';
            const timestampElement = container.querySelector('.frX31c-vlczkd, .P5KVFf, [jsname="r2fjRf"]');
            if (timestampElement) {
                timestamp = timestampElement.textContent.trim();
            }
            
            // Dodaj wpis tylko jeśli ma tekst i jest prawidłowy
            console.log(`\n🔍 Walidacja wpisu:`);
            console.log(`👤 Speaker: "${speaker || 'Nieznany'}"`);
            console.log(`💬 Text: "${text.trim()}"`);
            console.log(`⏰ Timestamp: "${timestamp}"`);
            
            if (text && text.trim()) {
                const isValid = isValidTranscriptText(text.trim(), speaker);
                console.log(`✅ Walidacja isValidTranscriptText: ${isValid}`);
                
                if (isValid) {
                    const sanitizedText = sanitizeTranscriptText(text.trim());
                    console.log(`🧹 Tekst po czyszczeniu: "${sanitizedText}"`);
                    
                    const isValidAfterSanitization = isValidTranscriptText(sanitizedText, speaker);
                    console.log(`✅ Walidacja po czyszczeniu: ${isValidAfterSanitization}`);
                    
                    if (sanitizedText && isValidAfterSanitization) {
                        const entry = {
                            speaker: speaker || 'Nieznany',
                            text: sanitizedText,
                            timestamp: timestamp
                        };
                        entries.push(entry);
                        console.log(`✅ Dodano wpis:`, entry);
                    } else {
                        console.log(`❌ Odrzucono wpis - nieprawidłowy po czyszczeniu`);
                    }
                } else {
                    console.log(`❌ Odrzucono wpis - nieprawidłowy tekst`);
                }
            } else {
                console.log(`❌ Odrzucono wpis - brak tekstu`);
            }
        } catch (error) {
            console.error('❌ Błąd przetwarzania elementu:', error);
        }
    });
    
    // Jeśli pierwsza metoda nie zadziałała, spróbuj alternatywną
    if (entries.length === 0) {
        console.log(`\n⚠️ Podstawowa metoda nie dała wyników, próbuję alternatywną...`);
        const alternativeEntries = scrapeAlternativeMethod();
        entries.push(...alternativeEntries);
    }
    
    console.log(`\n📊 Podsumowanie skrobania:`);
    console.log(`🔍 Użyty selektor: ${usedSelector}`);
    console.log(`📝 Znalezionych wpisów przed deduplikacją: ${entries.length}`);
    
    // Usuń duplikaty
    const uniqueEntries = removeDuplicates(entries);
    console.log(`📝 Unikalnych wpisów: ${uniqueEntries.length}`);
    
    if (uniqueEntries.length > 0) {
        console.log(`✅ Przykładowy wpis:`, uniqueEntries[0]);
    } else {
        console.log(`❌ Brak wpisów do zwrócenia`);
    }
    
    const result = {
        entries: uniqueEntries,
        scrapedAt: new Date().toISOString(),
        meetingUrl: window.location.href
    };
    
    console.log(`📤 Zwracam rezultat:`, result);
    return result;
}


function scrapeAlternativeMethod() {
    console.log(`\n🔄 Próba alternatywnej metody skrobania...`);
    const entries = [];
    
    // Uproszczona metoda - skup się na .a4cQT kontenerach
    const transcriptContainers = document.querySelectorAll('.a4cQT:not([role="menu"]):not([role="listbox"])');
    console.log(`🔍 Znaleziono ${transcriptContainers.length} kontenerów .a4cQT`);
    
    if (transcriptContainers.length === 0) {
        console.log(`❌ Brak kontenerów .a4cQT - kopuły inne selektory`);
        return entries;
    }
    
    // Spróbuj bardzo prostą metodę - znajdź wszystkie elementy zawierające tekst
    transcriptContainers.forEach((container, index) => {
        console.log(`\n🔍 Analizuję kontener ${index + 1}:`);
        console.log(`📄 Zawartość: "${container.textContent.trim()}"`);
        
        // Sprawdź czy kontener ma jakieś dzieci
        const children = container.children;
        console.log(`👶 Liczba dzieci: ${children.length}`);
        
        // Spróbuj znaleźć strukturę wpisów
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childText = child.textContent.trim();
            
            console.log(`  - Dziecko ${i + 1}: "${childText}" (${child.tagName}.${child.className})`);
            
            if (childText && childText.length > 10 && isValidTranscriptText(childText, '')) {
                // Próba wyodrębnienia nazwy i tekstu
                const lines = childText.split('\n').filter(line => line.trim());
                console.log(`    Lińe tekstu:`, lines);
                
                if (lines.length >= 2) {
                    const potentialSpeaker = lines[0].trim();
                    const potentialText = lines.slice(1).join(' ').trim();
                    
                    console.log(`    Potencjalna osoba: "${potentialSpeaker}"`);
                    console.log(`    Potencjalny tekst: "${potentialText}"`);
                    
                    if (potentialText && isValidTranscriptText(potentialText, potentialSpeaker)) {
                        const sanitizedText = sanitizeTranscriptText(potentialText);
                        if (sanitizedText && isValidTranscriptText(sanitizedText, potentialSpeaker)) {
                            const entry = {
                                speaker: potentialSpeaker || 'Nieznany',
                                text: sanitizedText,
                                timestamp: ''
                            };
                            entries.push(entry);
                            console.log(`✅ Dodano wpis z alternatywnej metody:`, entry);
                        }
                    }
                }
            }
        }
    });
    
    console.log(`📊 Alternatywna metoda znalazła ${entries.length} wpisów`);
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
    // Sprawdź czy tekst to CAŁE menu językowe (bardzo długi tekst z wieloma językami)
    const isFullLanguageMenu = text.includes('afrikaans (Republika Południowej Afryki)') && 
                              text.includes('albański (Albania)') && 
                              text.includes('polski (Polska)') && 
                              text.length > 500; // Menu językowe jest bardzo długie
    
    if (isFullLanguageMenu) {
        console.log('🔍 Wykryto pełne menu językowe (długie)');
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
        console.log('🔍 Wykryto krótki tekst UI:', text);
        return true;
    }
    
    console.log('✅ Tekst przeszedł walidację jako potencjalna transkrypcja');
    return false;
}

function isValidTranscriptText(text, speaker) {
    console.log(`🔍 Walidacja tekstu: "${text}"`);
    
    // Sprawdź czy tekst nie jest z menu wyboru języka
    if (isLanguageSelectionText(text)) {
        console.log(`❌ Odrzucono - tekst z menu wyboru języka`);
        return false;
    }
    
    // Sprawdź czy tekst nie jest zbyt krótki (prawdopodobnie UI)
    if (text.length < 5) {
        console.log(`❌ Odrzucono - tekst zbyt krótki (${text.length} znaków)`);
        return false;
    }
    
    // Sprawdź czy tekst nie składa się tylko z cyfr i znaków specjalnych
    if (/^[\d\s\-\(\)\[\]]+$/.test(text)) {
        console.log(`❌ Odrzucono - tylko cyfry i znaki specjalne`);
        return false;
    }
    
    // Sprawdź czy tekst to pojedyncze słowa UI (ale nie odrzucaj jeśli są częścią dłuższego tekstu)
    if (text.length < 20 && /^(settings|arrow_downward|circle|format_size)$/i.test(text)) {
        console.log(`❌ Odrzucono - ikona lub przycisk`);
        return false;
    }
    
    // Bardziej restrykcyjnie sprawdź czy to menu językowe - tylko jeśli zawiera wiele języków
    if (text.includes('polski (Polska)') && text.includes('afrikaans (Republika') && text.length > 200) {
        console.log(`❌ Odrzucono - długa lista języków`);
        return false;
    }
    
    console.log(`✅ Tekst jest prawidłowy`);
    return true;
}

function sanitizeTranscriptText(text) {
    console.log(`🧹 Czyszczenie tekstu: "${text}"`);
    const originalText = text;
    
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
    
    const cleanedText = text.trim();
    
    if (originalText !== cleanedText) {
        console.log(`🧹 Tekst po czyszczeniu: "${cleanedText}"`);
    } else {
        console.log(`✅ Tekst nie wymagał czyszczenia`);
    }
    
    return cleanedText;
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