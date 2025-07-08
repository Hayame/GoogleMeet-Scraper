# Google Meet Transcript Scraper

Rozszerzenie do Chrome/Edge umożliwiające pobieranie i eksportowanie transkrypcji z Google Meet.

## Funkcje

- 📝 Pobieranie transkrypcji ze spotkań Google Meet
- 💾 Eksport do formatu TXT
- 📋 Eksport do formatu JSON
- 👀 Podgląd transkrypcji przed eksportem
- 📊 Statystyki (liczba wypowiedzi i uczestników)

## Instalacja

### Krok 1: Przygotowanie plików
1. Utwórz nowy folder na komputerze, np. `google-meet-transcript-scraper`
2. Skopiuj wszystkie pliki do tego folderu:
   - `manifest.json`
   - `popup.html`
   - `popup.js`
   - `content.js`
   - `style.css`

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

1. **Dołącz do spotkania Google Meet**
2. **Włącz napisy** - kliknij przycisk "CC" lub "Włącz napisy" w dolnym pasku narzędzi
3. **Poczekaj** aż pojawią się pierwsze napisy
4. **Kliknij ikonę rozszerzenia** w pasku narzędzi przeglądarki
5. **Kliknij "Pobierz transkrypcję"**
6. **Wybierz format eksportu**:
   - TXT - prosty format tekstowy
   - JSON - format strukturalny z metadanymi

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

### Format JSON
```json
{
  "entries": [
    {
      "speaker": "Jan Kowalski",
      "text": "Dzień dobry wszystkim, witam na spotkaniu.",
      "timestamp": "15:25"
    },
    {
      "speaker": "Anna Nowak", 
      "text": "Cześć! Dziękuję za zaproszenie.",
      "timestamp": "15:26"
    }
  ],
  "scrapedAt": "2024-01-20T15:30:00.000Z",
  "meetingUrl": "https://meet.google.com/xxx-xxxx-xxx"
}
```

## Ograniczenia

- Działa tylko z napisami Google Meet (nie z zewnętrznymi napisami)
- Pobiera tylko aktualnie widoczną transkrypcję
- Wymaga włączonych napisów w spotkaniu
- Nie zapisuje transkrypcji automatycznie (wymaga ręcznego kliknięcia)

## Prywatność

Rozszerzenie:
- Działa lokalnie w przeglądarce
- Nie wysyła danych na zewnętrzne serwery
- Nie przechowuje transkrypcji po zamknięciu okna
- Wymaga tylko niezbędnych uprawnień

## Licencja

To rozszerzenie jest darmowe do użytku prywatnego i komercyjnego.