# Google Meet Transcript Scraper

Rozszerzenie do Chrome/Edge umożliwiające nagrywanie, pobieranie i eksportowanie transkrypcji z Google Meet w czasie rzeczywistym.

## Funkcje

- 🔴 **Nagrywanie transkrypcji w czasie rzeczywistym** - automatyczne przechwytywanie napisów podczas spotkania
- 📚 **Historia sesji** - przechowywanie do 50 sesji z możliwością przeglądania
- 🔍 **Wyszukiwanie w transkrypcji** - szybkie znajdowanie fraz z podświetlaniem wyników w czasie rzeczywistym
- 👥 **Filtrowanie według uczestników** - wyświetlanie wiadomości wybranych osób
- 💾 **Eksport do pliku TXT i kopiowanie do schowka** - pobieranie transkrypcji oraz szybkie kopiowanie z opcją opakowania w prompt LLM
- 🌓 **Tryb jasny/ciemny** - dostosowanie interfejsu do preferencji
- ⏱️ **Śledzenie czasu** - pomiar czasu trwania spotkania i nagrywania
- 🎨 **Kolorowe oznaczenia** - wizualne rozróżnienie uczestników
- 💾 **Auto-zapis** - automatyczne zapisywanie sesji co 30 sekund
- 🔗 **Wykrywanie użytkownika Google** - automatyczna personalizacja nazw uczestników
- 📊 **Statystyki** - liczba wypowiedzi, uczestników i czas trwania
- ⚙️ **Ustawienia użytkownika** - personalizacja nazwy twórcy konwersacji z wykrywaniem konta Google
- 🗑️ **Zarządzanie danymi** - możliwość usunięcia wszystkich sesji jednocześnie
- 📑 **Interfejs z zakładkami** - intuicyjny system tabów w ustawieniach

## Instalacja

### Krok 1: Przygotowanie plików
1. Utwórz nowy folder na komputerze, np. `google-meet-transcript-scraper`
2. Skopiuj wszystkie pliki do tego folderu:
   - `manifest.json`
   - `popup.html`
   - `popup.js`
   - `content.js`
   - `background.js`
   - `debug-config.js`
   - `prompt.md`
   - `style.css`
   - `session-history.css`
   - folder `js/core/` ze wszystkimi modułami podstawowymi
   - folder `js/utils/` ze wszystkimi modułami pomocniczymi
   - folder `js/features/` ze wszystkimi modułami funkcjonalnymi

### Krok 2: Dodanie ikon (opcjonalne)
Utwórz proste ikony PNG o wymiarach:
- `icon16.png` (16x16 px)
- `icon48.png` (48x48 px)  
- `icon128.png` (128x128 px)

Możesz użyć dowolnego generatora ikon online lub utworzyć proste ikony z emoji 📝.

### Krok 3: Instalacja w przeglądarce

#### Chrome:
1. Otwórz Chrome i wejdź na stronę: `chrome://extensions/`
2. Włącz "Tryb dewelopera" (przełącznik w prawym górnym rogu)
3. Kliknij "Załaduj rozpakowane"
4. Wybierz folder z rozszerzeniem
5. Rozszerzenie zostanie zainstalowane

#### Edge:
1. Otwórz Edge i wejdź na stronę: `edge://extensions/`
2. Włącz "Tryb dewelopera" (przełącznik po lewej stronie)
3. Kliknij "Załaduj rozpakowane"
4. Wybierz folder z rozszerzeniem
5. Rozszerzenie zostanie zainstalowane

## Użytkowanie

### Nagrywanie transkrypcji w czasie rzeczywistym
1. **Dołącz do spotkania Google Meet**
2. **Włącz napisy** - kliknij przycisk "CC" lub "Włącz napisy" w dolnym pasku narzędzi
3. **Kliknij ikonę rozszerzenia** w pasku narzędzi przeglądarki
4. **Kliknij "Rozpocznij nagrywanie"** - rozszerzenie zacznie automatycznie przechwytywać napisy
5. **Podczas nagrywania możesz**:
   - Wyszukiwać w transkrypcji (ikona lupy)
   - Filtrować według uczestników (ikona filtra)
   - Przeglądać transkrypcję w czasie rzeczywistym
6. **Kliknij "Zatrzymaj nagrywanie"** gdy skończysz

### Eksport transkrypcji
1. **Kliknij przycisk eksportu** (ikona pobierania)
2. **Opcjonalnie włącz "Eksportuj jako prompt dla LLM"** (domyślnie włączone):
   - Gdy włączone: transkrypcja zostanie opakowana w szablon promptu do generowania podsumowania przez AI
   - Gdy wyłączone: eksportowana będzie surowa transkrypcja
3. **Wybierz sposób eksportu**:
   - Eksportuj do pliku - pobieranie pliku TXT na dysk
   - Kopiuj do schowka - szybkie kopiowanie z powiadomieniem toast

### Historia sesji
- **Panel boczny** pokazuje wszystkie zapisane sesje
- **Kliknij na sesję** aby ją załadować
- **Edytuj nazwę** klikając na tytuł sesji
- **Usuń sesję** używając ikony kosza

### Wyszukiwanie i filtrowanie
- **Ctrl+F** lub ikona lupy - szybkie wyszukiwanie
- **Ikona filtra** - filtrowanie według uczestników
- **ESC** - zamknięcie paneli wyszukiwania/filtrowania

### Ustawienia
1. **Kliknij ikonę ustawień** (ikona koła zębatego) w prawym górnym rogu
2. **Zakładka Profil**:
   - **Personalizuj nazwę** - ustaw własną nazwę wyświetlaną jako autor konwersacji
   - **Wykryj nazwę Google** - automatycznie pobierz nazwę z konta Google
   - Przyciski Zapisz/Anuluj pojawią się tylko gdy dokonasz zmian
3. **Zakładka Dane**:
   - **Wyczyść wszystkie sesje** - usuń całą historię sesji (nieodwracalne!)
   - Wyświetla aktualną liczbę zapisanych sesji

## Rozwiązywanie problemów

### "Nie znaleziono transkrypcji"
- Upewnij się, że napisy są włączone w Google Meet
- Poczekaj, aż ktoś zacznie mówić i pojawią się napisy
- Odśwież stronę i spróbuj ponownie

### Rozszerzenie nie działa
- Upewnij się, że jesteś na stronie meet.google.com
- Sprawdź, czy rozszerzenie ma uprawnienia do tej strony
- Otwórz konsolę deweloperską (F12) i sprawdź błędy

### Brakujące wypowiedzi
- Rozszerzenie pobiera tylko widoczną transkrypcję
- Starsze wypowiedzi mogą być niedostępne, jeśli przewinęły się poza widok

## Format danych

### Format TXT
```
Transkrypcja Google Meet
Data eksportu: 2024-01-20 15:30:00
URL spotkania: https://meet.google.com/xxx-xxxx-xxx
=====================================

Jan Kowalski [15:25]:
Dzień dobry wszystkim, witam na spotkaniu.

Anna Nowak [15:26]:
Cześć! Dziękuję za zaproszenie.
```

### Format z promptem LLM
Gdy opcja "Eksportuj jako prompt dla LLM" jest włączona, transkrypcja zostanie opakowana w szablon promptu:
```
## 🧠 Prompt: Stwórz szczegółowe podsumowanie konwersacji

Na podstawie poniższej transkrypcji stwórz szczegółowe podsumowanie w formacie Markdown.

### 📎 Input

Transkrypcja Google Meet
Data eksportu: 2024-01-20 15:30:00
URL spotkania: https://meet.google.com/xxx-xxxx-xxx
=====================================

Jan Kowalski [15:25]:
Dzień dobry wszystkim, witam na spotkaniu.

Anna Nowak [15:26]:
Cześć! Dziękuję za zaproszenie.
```

## Architektura

Rozszerzenie wykorzystuje modułową architekturę JavaScript z 18+ wyspecjalizowanymi modułami:

### Moduły podstawowe (Core)
- **StateManager** - zarządzanie stanem aplikacji i przywracanie stanu
- **StorageManager** - operacje na Chrome Storage API
- **UIManager** - zarządzanie interfejsem użytkownika i widocznością przycisków
- **TimerManager** - śledzenie czasu trwania spotkania i nagrywania

### Moduły pomocnicze (Utils)
- **Constants** - stałe aplikacji i konfiguracja
- **Formatters** - formatowanie dat i czasu trwania
- **DOMHelpers** - pomocnicze funkcje do manipulacji DOM
- **GoogleUserDetector** - automatyczne wykrywanie nazwy użytkownika Google
- **DebugManager** - zarządzanie logowaniem debugowania
- **SessionUtils** - funkcje pomocnicze dla sesji

### Moduły funkcjonalne (Features)
- **RecordingManager** - nagrywanie transkrypcji start/stop
- **BackgroundScanner** - skanowanie w tle co 2 sekundy
- **SessionHistoryManager** - operacje CRUD na historii sesji
- **SessionUIManager** - renderowanie interfejsu historii sesji
- **TranscriptManager** - wyświetlanie i zarządzanie transkrypcją
- **SearchFilterManager** - wyszukiwanie i filtrowanie w czasie rzeczywistym
- **ExportManager** - eksport TXT/JSON i kopiowanie do schowka z opcją promptu LLM
- **ThemeManager** - obsługa motywów jasny/ciemny
- **ModalManager** - zarządzanie oknami dialogowymi
- **SettingsManager** - zarządzanie preferencjami użytkownika i ustawieniami

### Kolejność ładowania modułów
1. **Moduły podstawowe** (constants, storage-manager, state-manager, ui-manager, timer-manager)
2. **Moduły pomocnicze** (formatters, dom-helpers, google-user-detector, debug-manager, session-utils)
3. **Moduły funkcjonalne** (modal-manager, settings-manager, theme-manager, recording, background-scanner, session-history, session-ui, transcript, export, search-filter)
4. **Skrypt główny** (popup.js)

## Ograniczenia

- Działa tylko z napisami Google Meet (nie z zewnętrznymi napisami)
- Pobiera tylko aktualnie widoczną transkrypcję w trybie jednorazowego pobierania
- Wymaga włączonych napisów w spotkaniu
- Przechowuje maksymalnie 50 sesji w historii
- Nagrywanie w czasie rzeczywistym skanuje napisy co 2 sekundy

## Skróty klawiszowe

- **Ctrl+F** / **Cmd+F** - otwórz panel wyszukiwania
- **ESC** - zamknij aktywne panele (wyszukiwanie, filtry)
- **Enter** - zatwierdź edycję nazwy sesji
- **Delete** - usuń sesję (po potwierdzeniu)

## Prywatność

Rozszerzenie:
- Działa lokalnie w przeglądarce
- Nie wysyła danych na zewnętrzne serwery
- Przechowuje transkrypcje lokalnie w Chrome Storage
- Niestandardowe nazwy użytkowników są przechowywane w Chrome Sync Storage (synchronizowane między urządzeniami)
- Wymaga tylko niezbędnych uprawnień
- Dane są usuwane po odinstalowaniu rozszerzenia
- Wykrywanie nazwy Google odbywa się lokalnie bez wysyłania danych

## Wsparcie

Jeśli napotkasz problemy lub masz sugestie:
- Zgłoś issue na GitHub
- Sprawdź konsolę deweloperską (F12) w razie błędów
- Upewnij się, że masz najnowszą wersję rozszerzenia

## Licencja

To rozszerzenie jest darmowe do użytku prywatnego i komercyjnego.