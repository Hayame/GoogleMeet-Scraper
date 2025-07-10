# Plan Refaktoryzacji Systemu Scrapowania Transkrypcji

## Cel
Uproszczenie mechanizmu scrapowania i odświeżania wiadomości poprzez:
- Usunięcie zbędnej złożoności (baseline, manual scanning, mutex)
- Jeden mechanizm background scanning
- Optymalizacja renderowania - tylko zmienione wiadomości
- Prostszy i bardziej wydajny kod

## Kluczowe założenia
1. **Wszystkie wiadomości są zawsze widoczne w DOM** - nie ma potrzeby różnicowego śledzenia
2. **Struktura DOM jest stała**:
   - Kontener: `div[aria-label="Napisy"]`
   - Speaker: `.NWpY1d`
   - Text: `.ygicle.VbkSUe`
3. **Zachowanie Google Meet**:
   - Jeśli ta sama osoba mówi dalej → aktualizacja ostatniej wiadomości
   - Nowa osoba → nowa wiadomość
   - Edge case: przy 2 osobach mówiących na przemian czasem aktualizacja zamiast nowej
4. **Background scanning tylko podczas nagrywania**
5. **Dane zawsze zapisywane do chrome.storage**

## Architektura docelowa

### Flow aplikacji
```
1. START NAGRYWANIA
   ↓
2. Scrape ALL messages → Save to storage
   ↓
3. Start background scan (every 2s)
   ↓
4. Compare with previous state → Update changes
   ↓
5. IF popup open → Update DOM
   IF popup closed → Only update storage
```

### Struktura danych
```javascript
{
  transcriptData: {
    messages: [
      {
        index: 0,                    // pozycja w DOM
        speaker: "Jan Kowalski",     
        text: "Treść wiadomości",
        hash: "speaker:text_hash"    // do wykrywania zmian
      }
    ],
    lastUpdated: timestamp,
    meetingUrl: "...",
    sessionId: "..."
  }
}
```

## Plan implementacji

### Faza 1: Usunięcie zbędnego kodu

#### popup.js - do usunięcia:
- [ ] `performRealtimeScrape()` - cała funkcja
- [ ] `takeBaselineSnapshot()` - cała funkcja
- [ ] `processingScan` - mutex i wszystkie referencje
- [ ] `baselineEntryCount`, `lastSeenEntry`, `isFirstUpdate`, `isFirstBackgroundScan`
- [ ] `getFilteredEntries()`, `getFilteredStatsData()` - już niepotrzebne
- [ ] Skomplikowana logika w `handleBackgroundScanUpdate()`

#### background.js - do zachowania:
- Mechanizm skanowania co 2 sekundy (już istnieje)

#### content.js - do uproszczenia:
- `scrapeTranscript()` - zachować ale uprościć

### Faza 2: Implementacja nowego mechanizmu

#### 1. Nowy `scrapeTranscript()` w content.js:
```javascript
function scrapeTranscript() {
  const messages = [];
  const captionElements = document.querySelectorAll('div[aria-label="Napisy"]');
  
  captionElements.forEach((element, index) => {
    const speaker = element.querySelector('.NWpY1d')?.textContent.trim() || 'Nieznany';
    const text = element.querySelector('.ygicle.VbkSUe')?.textContent.trim() || '';
    
    if (text && isValidTranscriptText(text, speaker)) {
      messages.push({
        index,
        speaker,
        text: sanitizeTranscriptText(text),
        hash: generateHash(speaker, text)
      });
    }
  });
  
  return { messages, scrapedAt: new Date().toISOString() };
}
```

#### 2. Uproszczony `handleBackgroundScanUpdate()` w popup.js:
```javascript
function handleBackgroundScanUpdate(newData) {
  // Porównaj z obecnym stanem
  const changes = detectChanges(transcriptData.messages, newData.messages);
  
  // Zaktualizuj dane
  transcriptData = newData;
  chrome.storage.local.set({ transcriptData });
  
  // Jeśli popup otwarty, zaktualizuj DOM
  if (document.visibilityState === 'visible') {
    updateDOM(changes);
  }
}
```

#### 3. Efektywne wykrywanie zmian:
```javascript
function detectChanges(oldMessages, newMessages) {
  const changes = {
    added: [],
    updated: [],
    removed: []
  };
  
  // Użyj hash do szybkiego porównania
  // Zwróć tylko zmienione elementy
  
  return changes;
}
```

#### 4. Optymalizacja renderowania:
```javascript
function updateDOM(changes) {
  const container = document.getElementById('transcriptContent');
  
  // Dodaj nowe
  changes.added.forEach(msg => {
    container.appendChild(createMessageElement(msg));
  });
  
  // Zaktualizuj zmienione
  changes.updated.forEach(msg => {
    const element = container.children[msg.index];
    updateMessageElement(element, msg);
  });
  
  // Usuń niepotrzebne
  changes.removed.forEach(index => {
    container.children[index]?.remove();
  });
}
```

### Faza 3: Optymalizacje

1. **Batch updates** - grupowanie zmian przed zapisem do storage
2. **Debouncing** - opóźnienie zapisu przy częstych zmianach
3. **Efficient diffing** - użycie hash/checksum do szybkiego porównania
4. **DOM updates** - tylko zmienione elementy, bez pełnego re-render

### Faza 4: Testowanie

1. Test z jedną osobą mówiącą
2. Test z wieloma osobami
3. Test edge case: 2 osoby na przemian
4. Test wydajności przy długich transkrypcjach
5. Test popup closed/open scenarios

## Harmonogram

1. **Dzień 1**: Usunięcie zbędnego kodu
2. **Dzień 2**: Implementacja nowego mechanizmu
3. **Dzień 3**: Optymalizacje i testy

## Metryki sukcesu

- Kod prostszy o ~50%
- Brak duplikacji logiki scrapowania
- Wydajność: <50ms na update przy 100 wiadomościach
- Zero flickeringu UI
- Poprawne działanie edge case'ów

## Ryzyka i mitygacje

1. **Ryzyko**: Utrata wiadomości przy edge case'ach
   **Mitygacja**: Dokładne testy, zachowanie walidacji

2. **Ryzyko**: Problemy z wydajnością przy długich transkrypcjach
   **Mitygacja**: Efficient diffing, batch updates

3. **Ryzyko**: Regresja funkcjonalności
   **Mitygacja**: Zachowanie interfejsu użytkownika bez zmian