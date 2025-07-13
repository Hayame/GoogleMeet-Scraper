# Google Meet Transcript Scraper

Rozszerzenie do Chrome/Edge umożliwiające nagrywanie, pobieranie i eksportowanie transkrypcji z Google Meet w czasie rzeczywistym.

## Funkcje

- 🔴 **Nagrywanie transkrypcji w czasie rzeczywistym** - automatyczne przechwytywanie napisów podczas spotkania
- 📚 **Historia sesji** - przechowywanie do 50 sesji z możliwością przeglądania
- 🔍 **Wyszukiwanie w transkrypcji** - szybkie znajdowanie fraz z podświetlaniem wyników
- 👥 **Filtrowanie według uczestników** - wyświetlanie wiadomości wybranych osób
- 💾 **Eksport do pliku TXT i kopiowanie do schowka** - pobieranie transkrypcji oraz szybkie kopiowanie z opcją opakowania w prompt LLM
- 🌓 **Tryb jasny/ciemny** - dostosowanie interfejsu do preferencji
- ⏱️ **Śledzenie czasu** - pomiar czasu trwania spotkania i nagrywania
- 🎨 **Kolorowe oznaczenia** - wizualne rozróżnienie uczestników
- 💾 **Auto-zapis** - automatyczne zapisywanie sesji co 30 sekund
- 🔗 **Wykrywanie użytkownika Google** - personalizacja nazw uczestników
- 📊 **Statystyki** - liczba wypowiedzi, uczestników i czas trwania

## Instalacja

### Krok 1: Przygotowanie plików
1. Utwórz nowy folder na komputerze, np. `google-meet-transcript-scraper`
2. Skopiuj wszystkie pliki do tego folderu:
   - `manifest.json`
   - `popup.html`
   - `popup.js`
   - `content.js`
   - `background.js`
   - `style.css`
   - `session-history.css`
   - folder `js/` ze wszystkimi modułami

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

Rozszerzenie wykorzystuje modułową architekturę JavaScript z następującymi komponentami:

### Moduły podstawowe (Core)
- **StateManager** - zarządzanie stanem aplikacji
- **StorageManager** - operacje na Chrome Storage API
- **UIManager** - zarządzanie interfejsem użytkownika
- **TimerManager** - śledzenie czasu trwania

### Moduły funkcjonalne (Features)
- **RecordingManager** - nagrywanie transkrypcji
- **BackgroundScanner** - skanowanie w tle co 2 sekundy
- **SessionHistoryManager** - zarządzanie historią sesji
- **TranscriptManager** - wyświetlanie transkrypcji
- **SearchFilterManager** - wyszukiwanie i filtrowanie
- **ExportManager** - eksport do pliku TXT i kopiowanie do schowka z opcją promptu LLM
- **ThemeManager** - obsługa motywów jasny/ciemny

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
- Wymaga tylko niezbędnych uprawnień
- Dane są usuwane po odinstalowaniu rozszerzenia

## Wsparcie

Jeśli napotkasz problemy lub masz sugestie:
- Zgłoś issue na GitHub
- Sprawdź konsolę deweloperską (F12) w razie błędów
- Upewnij się, że masz najnowszą wersję rozszerzenia

## Licencja

To rozszerzenie jest darmowe do użytku prywatnego i komercyjnego.