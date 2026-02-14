# Analiza brakujących funkcjonalności — Google Meet Transcript Scraper

## Kontekst

Rozszerzenie jest już dojrzałe — posiada 38+ kategorii funkcji: nagrywanie w tle, zarządzanie sesjami, eksport TXT z promptami LLM, wyszukiwanie, filtrowanie, motywy, modalne okna, przywracanie stanu. Poniżej propozycje nowych funkcji pogrupowane od krytycznych do opcjonalnych.

---

## MUST HAVE (Krytyczne braki)

### 1. Eksport do formatu Markdown
**Dlaczego:** TXT jest płaski i nie zachowuje struktury. Markdown jest natywnie wspierany przez ChatGPT, Claude, Notion, Obsidian — co czyni go idealnym formatem do dalszej pracy z transkryptem.
- Nagłówki z metadanymi spotkania
- Pogrubione nazwy mówców
- Zachowanie timestampów
- Kompatybilność z LLM-ami

**Pliki do modyfikacji:**
- `js/features/export.js` — dodać `generateMdContent()` obok istniejącego `generateTxtContent()`
- `js/utils/constants.js` — dodać `MD: 'md'` do `EXPORT_FORMATS`
- `popup.html` — dodać przycisk eksportu MD w `exportModal` (obok istniejących `exportTxtBtn` i `exportClipboardBtn`)
- `style.css` — styling nowego przycisku

**Zakres zmian:** Niski. Logika eksportu jest dobrze wydzielona w `ExportManager`. Nowy format to nowa metoda generująca string + nowy przycisk UI.

---

### 2. Auto-zapis sesji przy zamknięciu spotkania
**Dlaczego:** Użytkownik może zapomnieć wyeksportować lub zapisać sesję. Jeśli zamknie kartę Meet — dane giną.
- Wykrywanie końca spotkania (zmiana URL, zamknięcie karty)
- Automatyczny zapis do historii sesji
- Opcjonalnie: auto-eksport do pliku

**Pliki do modyfikacji:**
- `content.js` — dodać nasłuchiwanie na `beforeunload` i zmianę URL (MutationObserver lub Navigation API). Przy wykryciu końca spotkania wysłać wiadomość do background.js
- `background.js` — obsłużyć nową akcję `meetingEnded`, zapisać ostatni stan transkryptu do `chrome.storage`
- `js/features/background-scanner.js` — rozszerzyć `flushPendingData()` o auto-save do session history
- `js/core/storage-manager.js` — ewentualnie dodać dedykowaną metodę `autoSaveOnMeetingEnd()`

**Zakres zmian:** Średni. Wymaga koordynacji między content.js (detekcja), background.js (relay), i storage (zapis). Kluczowe: content.js musi wykryć koniec spotkania niezależnie od tego czy popup jest otwarty.

---

### 3. Powiadomienie o braku włączonych napisów
**Dlaczego:** Rozszerzenie jest bezużyteczne bez włączonych captions. Użytkownik może nie wiedzieć, że napisy są wyłączone i nagrywać "pustą" sesję.
- Detekcja czy napisy są aktywne
- Wizualne ostrzeżenie w popup jeśli brak napisów
- Opcja automatycznego włączenia napisów

**Pliki do modyfikacji:**
- `content.js` — już istnieje `areCaptionsEnabled()` (linia 244). Dodać periodyczne sprawdzanie stanu CC i raportowanie do popup via message
- `js/features/recording.js` — po `activateRealtimeMode()` sprawdzić status CC. Jeśli wyłączone → pokazać ostrzeżenie
- `js/features/background-scanner.js` — rozszerzyć `handleBackgroundScanUpdate()` o informację o stanie CC
- `popup.html` — dodać banner ostrzegawczy (np. pod `recordingStatus`)
- `style.css` — styling bannera

**Zakres zmian:** Niski. Detekcja CC już istnieje w content.js. Trzeba dodać komunikat zwrotny i UI ostrzeżenia.

---

### 4. Obsługa długich spotkań (>1h) — paginacja/wirtualizacja transkryptu
**Dlaczego:** Przy 500+ wpisach popup może się zacinać. Brak wirtualizacji = problemy z wydajnością.
- Virtual scrolling lub paginacja
- Lazy rendering wpisów
- Indykator liczby wpisów poza widokiem

**Pliki do modyfikacji:**
- `js/features/transcript.js` — refaktor `displayTranscript()` i `handleIncrementalUpdate()`. Dodać mechanizm paginacji (np. render max 100 wpisów, "Załaduj więcej" button) lub virtual scroll (render tylko widocznych elementów + bufor)
- `style.css` — styling paginacji / "load more" button
- `popup.html` — ewentualnie dodać kontener na kontrolki paginacji

**Zakres zmian:** Średni-Wysoki. `displayTranscript()` jest kluczową funkcją wywoływaną z wielu miejsc. Virtual scroll to większy refaktor, paginacja ("pokaż więcej") jest prostsza.

**Rekomendacja:** Zacznij od paginacji (pokaż 100 wpisów + "Załaduj więcej") zamiast pełnego virtual scroll — mniejszy risk regresji.

---

## SHOULD HAVE (Znacząco podnoszą wartość)

### 5. Bezpośrednia integracja z LLM (kopiuj do schowka z promptem)
**Dlaczego:** Obecnie eksport z promptem trafia do pliku TXT. Ale główny use case to wklejenie do ChatGPT/Claude. Szybsza ścieżka: "Kopiuj z promptem" → schowek → wklej do LLM.

**Status: CZĘŚCIOWO ZAIMPLEMENTOWANE.** W `exportModal` istnieje już przycisk `exportClipboardBtn` "Kopiuj do schowka" z obsługą promptu LLM (checkbox `exportAsLLMPrompt` + selektor promptu). Funkcja `copyToClipboard()` w `ExportManager` jest w pełni działająca.

**Brakuje:**
- Bezpośredni przycisk "Kopiuj z promptem" w głównym UI (poza modalem eksportu) — np. w `transcript-actions` obok search/filter/export
- Toast potwierdzający skopiowanie (już istnieje w `ExportManager.showToast()`)

**Pliki do modyfikacji:**
- `popup.html` — dodać przycisk quick-copy w `action-group-right` (obok exportBtn)
- `js/features/export.js` — dodać metodę `quickCopyWithPrompt()` która kopiuje bez otwierania modala
- `style.css` — styling nowego przycisku

**Zakres zmian:** Niski. Infrastruktura (prompt wrapping, clipboard, toast) już istnieje.

---

### 6. Tagowanie / etykietowanie sesji
**Dlaczego:** Przy wielu sesjach trudno je odnaleźć. Tagi (np. "standup", "1on1", "planowanie") umożliwiają szybką kategoryzację.
- Dodawanie tagów do sesji
- Filtrowanie historii po tagach
- Predefiniowane + custom tagi

**Pliki do modyfikacji:**
- `js/features/session-history.js` — rozszerzyć obiekt sesji o pole `tags: []`, dodać metody `addTag()`, `removeTag()`
- `js/features/session-ui.js` — renderować tagi w liście sesji, dodać UI edycji tagów
- `js/utils/constants.js` — dodać `PREDEFINED_TAGS` i `STORAGE_KEYS.SESSION_TAGS`
- `popup.html` — dodać filtr tagów w sidebar (nad/pod listą sesji)
- `style.css` / `session-history.css` — styling tagów (chips/badges)

**Zakres zmian:** Średni. Wymaga modyfikacji struktury danych sesji + UI filtrów w sidebar.

---

### 7. Wyszukiwanie w historii sesji
**Dlaczego:** Obecne wyszukiwanie działa tylko w aktywnej sesji. Przy 50 zapisanych sesjach nie można znaleźć konkretnej rozmowy.
- Globalne wyszukiwanie po tekście transkryptu
- Wyszukiwanie po nazwie spotkania / uczestnikach
- Wyniki z podglądem kontekstu

**Pliki do modyfikacji:**
- `js/features/search-filter.js` — rozszerzyć o tryb "global search" przeszukujący `window.sessionHistory`
- `js/features/session-ui.js` — dodać pole wyszukiwania w sidebar, renderować wyniki z kontekstem
- `popup.html` — dodać input szukania w sidebar (`.sidebar-header` lub `.sidebar-actions`)
- `style.css` / `session-history.css` — styling wyników wyszukiwania z podglądem

**Zakres zmian:** Średni. Istniejący `SearchFilterManager` obsługuje tylko aktualną sesję. Globalne przeszukiwanie wymaga iteracji po `sessionHistory[].transcript.messages`.

---

### 8. Scalanie sesji
**Dlaczego:** Jeśli nagrywanie zostanie przerwane i wznowione, powstają 2 osobne sesje z tego samego spotkania.
- Wybierz 2+ sesje → scal w jedną
- Automatyczna deduplication wpisów
- Zachowanie chronologicznej kolejności

**Pliki do modyfikacji:**
- `js/features/session-history.js` — dodać metodę `mergeSessions(sessionIds[])` z deduplication po hash
- `js/features/session-ui.js` — dodać UI selekcji wielu sesji (checkboxy) i przycisk "Scal"
- `popup.html` — ewentualnie modal potwierdzenia scalenia
- `session-history.css` — styling trybu selekcji

**Zakres zmian:** Średni. Deduplication jest prosta dzięki istniejącemu polowi `hash` w wiadomościach. UI selekcji wielu sesji to nowy tryb interakcji.

---

### 9. Skróty klawiaturowe
**Dlaczego:** Power userzy chcą szybko start/stop nagrywania bez klikania w popup.
- Globalny skrót Chrome do start/stop nagrywania
- Skróty w popup (Ctrl+E eksport, Ctrl+S zapisz, Ctrl+F szukaj)
- Konfigurowalne przez użytkownika

**Pliki do modyfikacji:**
- `manifest.json` — dodać sekcję `commands` z globalnym skrótem (np. `Alt+Shift+R` dla toggle recording)
- `background.js` — obsłużyć `chrome.commands.onCommand` → toggle nagrywania
- `popup.js` — dodać `document.addEventListener('keydown', ...)` dla skrótów popup
- `js/features/settings-manager.js` — opcjonalnie: UI konfiguracji skrótów w ustawieniach

**Zakres zmian:** Niski-Średni. Chrome Commands API jest proste. Skróty w popup to kilka event listenerów.

---

## NICE TO HAVE (Dodatkowa wartość)

### 10. Statystyki spotkania
**Dlaczego:** Analiza kto mówił ile — przydatne w retro i ocenie zaangażowania.
- Procent wypowiedzi per uczestnik
- Wykres kołowy/słupkowy (CSS-only lub Chart.js)
- Najaktywniejszy mówca
- Średnia długość wypowiedzi

**Pliki do modyfikacji:**
- Nowy moduł: `js/features/meeting-stats.js`
- `popup.html` — dodać modal/panel statystyk
- `style.css` — styling wykresów i statystyk

**Zakres zmian:** Średni. Dane są dostępne w `transcriptData.messages`. Obliczenia proste, UI wymaga projektowania.

---

### 11. Podsumowanie AI (lokalne)
**Dlaczego:** Zamiast ręcznie kopiować do LLM — automatyczne podsumowanie.
- Integracja z API OpenAI/Claude (klucz użytkownika)
- Podsumowanie, action items, decyzje
- Zapisywanie podsumowań przy sesji
- Wymaga klucza API = nie dla wszystkich

**Pliki do modyfikacji:**
- Nowy moduł: `js/features/ai-summary.js`
- `js/features/settings-manager.js` — dodać pole API key w ustawieniach
- `js/features/session-history.js` — rozszerzyć obiekt sesji o pole `summary`
- `popup.html` — UI podsumowania + modal konfiguracji API
- `manifest.json` — dodać `host_permissions` dla API endpoints

**Zakres zmian:** Wysoki. Wymaga zarządzania kluczami API, obsługi błędów sieciowych, UI podsumowania.

---

### 12. Eksport do Google Docs / Notion
**Dlaczego:** Bezpośredni eksport do narzędzi, w których użytkownik pracuje.
- OAuth z Google Docs
- Tworzenie dokumentu z transkryptem
- Opcjonalnie Notion API
- Złożoność integracji OAuth

**Zakres zmian:** Wysoki. OAuth flow, zarządzanie tokenami, API integration.

---

### 13. Import sesji
**Dlaczego:** Backup/restore lub przenoszenie między urządzeniami.
- Import z pliku JSON
- Walidacja struktury danych
- Merge z istniejącymi sesjami

**Pliki do modyfikacji:**
- `js/features/export.js` — dodać `importFromJSON()` z walidacją
- `popup.html` — dodać przycisk import w ustawieniach (data-tab) + hidden file input
- `js/features/settings-manager.js` — obsługa UI importu

**Zakres zmian:** Niski-Średni. Walidacja JSON + merge z istniejącą historią.

---

### 14. Automatyczne rozpoznawanie języka
**Dlaczego:** Spotkania w różnych językach — prompt LLM powinien być dopasowany.
- Detekcja języka transkryptu
- Auto-wybór odpowiedniego prompta
- Przydatne w środowiskach wielojęzycznych

**Pliki do modyfikacji:**
- `js/features/export.js` — dodać detekcję języka (heurystyka lub `Intl` API)
- `js/features/settings-manager.js` — powiązać język z promptem

**Zakres zmian:** Niski. Prosta heurystyka (analiza znaków/słów) + mapowanie język→prompt.

---

### 15. Notatki użytkownika przy sesji
**Dlaczego:** Dodanie własnych adnotacji do sesji — "omówiliśmy X", "TODO: Y".
- Pole tekstowe przy każdej sesji
- Zachowane w storage
- Widoczne w historii sesji

**Pliki do modyfikacji:**
- `js/features/session-history.js` — dodać pole `notes` do obiektu sesji
- `js/features/session-ui.js` — dodać UI notatek (textarea) w widoku sesji
- `session-history.css` — styling notatek

**Zakres zmian:** Niski. Prosty textarea + auto-save do storage.

---

### 16. Tryb "Follow speaker"
**Dlaczego:** Podczas długich spotkań śledzenie konkretnego mówcy.
- Kliknij na uczestnika → filtruj na żywo tylko jego wypowiedzi
- Podświetlanie wybranego mówcy
- Szybkie przełączanie

**Pliki do modyfikacji:**
- `js/features/search-filter.js` — rozszerzyć filtrowanie o tryb "follow single speaker"
- `js/features/transcript.js` — podświetlanie wybranego mówcy
- `style.css` — styling podświetlenia

**Zakres zmian:** Niski. Filtrowanie uczestników już istnieje w `SearchFilterManager`. Tryb "follow" to single-select zamiast multi-select + auto-scroll.

---

## FUTURE / EKSPERYMENTALNE

### 17. Tryb offline z synchronizacją
- IndexedDB jako primary storage
- Sync z Chrome storage gdy online
- Obsługa większej ilości danych

**Zakres zmian:** Wysoki.

### 18. Collaborative notes
- Współdzielenie transkryptu z innymi uczestnikami
- Link do udostępnienia sesji
- Wymaga backendu

**Zakres zmian:** Bardzo wysoki.

### 19. Integracja z kalendarzem
- Automatyczne powiązanie sesji z eventem z Google Calendar
- Nazwa spotkania, uczestnicy z kalendarza
- Timeline spotkań

**Zakres zmian:** Wysoki. Google Calendar API + OAuth.

### 20. Speech-to-text fallback
- Własne rozpoznawanie mowy gdy Meet captions niedostępne
- Web Speech API jako backup
- Jakość może być gorsza niż natywne captions

**Zakres zmian:** Wysoki.

---

## Podsumowanie priorytetów

| Priorytet | # | Funkcja | Wysiłek | Pliki |
|-----------|---|---------|---------|-------|
| MUST | 1 | Markdown export | Niski | export.js, constants.js, popup.html |
| MUST | 2 | Auto-zapis przy zamknięciu | Średni | content.js, background.js, background-scanner.js |
| MUST | 3 | Ostrzeżenie o napisach | Niski | content.js, recording.js, popup.html |
| MUST | 4 | Wydajność długich sesji | Średni-Wysoki | transcript.js |
| SHOULD | 5 | Kopiuj z promptem (quick) | Niski | export.js, popup.html |
| SHOULD | 6 | Tagi sesji | Średni | session-history.js, session-ui.js, constants.js |
| SHOULD | 7 | Szukanie w historii | Średni | search-filter.js, session-ui.js |
| SHOULD | 8 | Scalanie sesji | Średni | session-history.js, session-ui.js |
| SHOULD | 9 | Skróty klawiaturowe | Niski-Średni | manifest.json, background.js, popup.js |
| NICE | 10 | Statystyki spotkania | Średni | nowy moduł |
| NICE | 11 | AI summary | Wysoki | nowy moduł, settings, manifest |
| NICE | 12 | Google Docs export | Wysoki | OAuth, API |
| NICE | 13 | Import sesji | Niski-Średni | export.js, settings |
| NICE | 14 | Auto-język | Niski | export.js |
| NICE | 15 | Notatki przy sesji | Niski | session-history.js, session-ui.js |
| NICE | 16 | Follow speaker | Niski | search-filter.js |
| FUTURE | 17-20 | Offline, Collaborative, Calendar, STT | Wysoki | nowe moduły + backend |
