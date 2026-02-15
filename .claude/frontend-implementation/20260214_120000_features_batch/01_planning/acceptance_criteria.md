# Acceptance Criteria -- Features Batch 2026-02-14

---

## US-1: Markdown Export

### AC-1.1: Markdown file download with correct formatting

**Given** a session with 3+ transcript entries from speakers "Jan Kowalski" and "Anna Nowak",
**When** the user opens the export modal and clicks the Markdown export button,
**Then** a `.md` file is downloaded containing:
- A level-1 heading `# Transkrypcja Google Meet`
- Metadata block with date, URL, and message count
- Each entry formatted as `**Jan Kowalski** _[14:32]_:` followed by the text on a new line
- Entries separated by blank lines

**Linked to:** US-1
**Testable:** Yes
**Type:** Happy Path

### AC-1.2: Markdown export with LLM prompt wrapping

**Given** the "Eksportuj jako prompt dla LLM" toggle is enabled and the user has a custom prompt selected,
**When** the user clicks the Markdown export button,
**Then** the downloaded `.md` file contains the selected prompt text above the Markdown-formatted transcript, separated by `---`.

**Linked to:** US-1
**Testable:** Yes
**Type:** Happy Path

### AC-1.3: Markdown export button visible in export modal

**Given** the user has transcript data loaded (at least 1 entry),
**When** the user clicks the export button to open the export modal,
**Then** the modal shows three export options: "Eksportuj do pliku (TXT)", "Eksportuj do pliku (MD)", and "Kopiuj do schowka".

**Linked to:** US-1
**Testable:** Yes
**Type:** Happy Path

### AC-1.4: Markdown export with empty transcript

**Given** no transcript data is loaded (transcriptData is null or messages array is empty),
**When** the user attempts to export as Markdown,
**Then** a status message "Brak danych do eksportu" is shown with error styling and no file is downloaded.

**Linked to:** US-1
**Testable:** Yes
**Type:** Error Case

---

## US-2: Auto-Save on Meeting Close

### AC-2.1: Session saved when meeting ends naturally

**Given** an active recording session with 15 transcript entries on meet.google.com/abc-defg-hij,
**When** the Google Meet meeting ends (user is returned to the post-meeting screen or the meeting URL changes away from the active call),
**Then** the session is auto-saved to session history with all 15 entries, the recording state is deactivated, and a toast notification "Spotkanie zakonczone - sesja zapisana automatycznie" is shown when the popup is next opened.

**Linked to:** US-2
**Testable:** Yes
**Type:** Happy Path

### AC-2.2: Auto-save when tab is closed during recording

**Given** an active recording session with 8 transcript entries,
**When** the user closes the Google Meet tab,
**Then** the background script detects the tab removal via `chrome.tabs.onRemoved`, triggers auto-save of the current session to storage, and sets `realtimeMode` to `false`.

**Linked to:** US-2
**Testable:** Yes
**Type:** Happy Path

### AC-2.3: No auto-save when recording is already stopped

**Given** a stopped/paused recording session (realtimeMode is false),
**When** the Google Meet tab is closed or navigated away,
**Then** no additional save operation occurs and the existing session history remains unchanged.

**Linked to:** US-2
**Testable:** Yes
**Type:** Edge Case

### AC-2.4: Auto-save with zero transcript entries

**Given** an active recording that was just started (0 transcript entries captured),
**When** the meeting ends immediately,
**Then** no empty session is saved to history (sessions with 0 entries are discarded) and the recording state is cleaned up.

**Linked to:** US-2
**Testable:** Yes
**Type:** Edge Case

---

## US-3: Caption Warning

### AC-3.1: Warning displayed when captions are off during recording

**Given** an active recording session (realtimeMode is true),
**When** the content script detects that captions are disabled (caption container DOM elements are absent or hidden),
**Then** a persistent warning banner appears at the top of the transcript area with the text "Napisy sa wylaczone! Wlacz napisy, aby kontynuowac nagrywanie transkrypcji." and an "Wlacz napisy" action button.

**Linked to:** US-3
**Testable:** Yes
**Type:** Happy Path

### AC-3.2: Warning dismissed when captions are re-enabled

**Given** the caption warning banner is displayed,
**When** the content script detects that captions have been re-enabled (caption container DOM elements become visible),
**Then** the warning banner is hidden automatically within 2 seconds (one scan cycle).

**Linked to:** US-3
**Testable:** Yes
**Type:** Happy Path

### AC-3.3: Enable captions button triggers auto-enable

**Given** the caption warning banner is displayed with the "Wlacz napisy" button,
**When** the user clicks the "Wlacz napisy" button,
**Then** a message is sent to the content script to programmatically click the captions toggle button, and if successful, the warning banner is hidden.

**Linked to:** US-3
**Testable:** Yes
**Type:** Happy Path

### AC-3.4: No warning when not recording

**Given** the extension popup is open with a historical session loaded (realtimeMode is false),
**When** the content script reports captions are off,
**Then** no warning banner is displayed.

**Linked to:** US-3
**Testable:** Yes
**Type:** Edge Case

### AC-3.5: Warning on recording start if captions already off

**Given** the user is on a Google Meet page where captions are currently disabled,
**When** the user clicks "Rozpocznij nagrywanie",
**Then** the auto-enable captions attempt fires first, and if it fails, the caption warning banner appears immediately.

**Linked to:** US-3
**Testable:** Yes
**Type:** Edge Case

---

## US-4: Transcript Pagination

### AC-4.1: Pagination appears for large transcripts

**Given** a loaded session with 523 transcript entries,
**When** the transcript is displayed,
**Then** only the first 100 entries are rendered, and a pagination bar appears below the transcript showing "Strona 1 z 6" with next/previous buttons and page number indicators.

**Linked to:** US-4
**Testable:** Yes
**Type:** Happy Path

### AC-4.2: Page navigation updates displayed entries

**Given** page 1 of a 523-entry transcript is displayed (entries 1-100),
**When** the user clicks the "next page" button,
**Then** entries 101-200 are displayed, the pagination shows "Strona 2 z 6", and the transcript container scrolls to top.

**Linked to:** US-4
**Testable:** Yes
**Type:** Happy Path

### AC-4.3: No pagination for small transcripts

**Given** a session with 85 transcript entries (below the 500-entry threshold),
**When** the transcript is displayed,
**Then** all 85 entries are rendered without pagination controls.

**Linked to:** US-4
**Testable:** Yes
**Type:** Edge Case

### AC-4.4: Search works across all pages

**Given** a paginated transcript with 600 entries, currently viewing page 1,
**When** the user types "budzet" in the search input,
**Then** the search filters across ALL 600 entries (not just the current page), pagination recalculates based on filtered results, and the search results count shows the total matches across all pages.

**Linked to:** US-4
**Testable:** Yes
**Type:** Happy Path

### AC-4.5: Participant filter works with pagination

**Given** a paginated transcript with 600 entries from 4 participants,
**When** the user deselects 2 participants in the filter dropdown,
**Then** pagination recalculates based on the filtered entries (e.g., 280 entries from 2 participants = 3 pages), and page 1 shows the first 100 filtered entries.

**Linked to:** US-4
**Testable:** Yes
**Type:** Happy Path

### AC-4.6: Realtime recording appends to last page

**Given** an active recording with 510 entries (currently paginated, page 6 with entries 501-510),
**When** new entries arrive from the background scanner,
**Then** new entries are appended to the last page, the user stays on the last page if already viewing it, and pagination page count updates if a new page threshold is crossed.

**Linked to:** US-4
**Testable:** Yes
**Type:** Edge Case

---

## US-5: Quick Copy with LLM Prompt

### AC-5.1: Quick copy button in transcript actions bar

**Given** a session with transcript data loaded,
**When** the transcript view is displayed,
**Then** a "Szybkie kopiowanie" button (clipboard icon with a sparkle/AI indicator) is visible in the transcript actions bar (action-group-right), between the export button and delete button.

**Linked to:** US-5
**Testable:** Yes
**Type:** Happy Path

### AC-5.2: One-click copies transcript with default prompt

**Given** a session with 10 transcript entries and the default LLM prompt configured,
**When** the user clicks the "Szybkie kopiowanie" button,
**Then** the clipboard contains the full transcript wrapped in the default prompt template, and a toast notification "Skopiowano z promptem do schowka!" is shown.

**Linked to:** US-5
**Testable:** Yes
**Type:** Happy Path

### AC-5.3: Quick copy uses active prompt selection

**Given** the user has 3 custom prompts configured with "Notatki ze spotkania" set as default,
**When** the user clicks the quick copy button,
**Then** the transcript is wrapped with the "Notatki ze spotkania" prompt (not the built-in fallback).

**Linked to:** US-5
**Testable:** Yes
**Type:** Happy Path

### AC-5.4: Quick copy with empty transcript

**Given** no transcript data is loaded,
**When** the user clicks the quick copy button,
**Then** a toast notification "Brak danych do skopiowania" is shown with error styling, and no clipboard write occurs.

**Linked to:** US-5
**Testable:** Yes
**Type:** Error Case

### AC-5.5: Quick copy button disabled during empty state

**Given** no transcript data and the empty state placeholder is showing,
**When** the user views the transcript actions bar,
**Then** the quick copy button is visually disabled (greyed out) and non-clickable.

**Linked to:** US-5
**Testable:** Yes
**Type:** Edge Case

---

## US-6: Session Search

### AC-6.1: Search input visible in sidebar

**Given** the sidebar is expanded,
**When** the user views the session history panel,
**Then** a search input with placeholder "Szukaj w sesjach..." is visible between the "Nowa sesja" button and the session list.

**Linked to:** US-6
**Testable:** Yes
**Type:** Happy Path

### AC-6.2: Search filters sessions by title

**Given** 5 saved sessions with titles "Standup poranny", "Planowanie sprintu", "Retrospektywa Q4", "1:1 z Janem", "Standup popludniowy",
**When** the user types "standup" in the session search input,
**Then** only "Standup poranny" and "Standup popludniowy" are shown in the session list.

**Linked to:** US-6
**Testable:** Yes
**Type:** Happy Path

### AC-6.3: Search filters sessions by transcript content

**Given** 3 saved sessions where only session "Planowanie sprintu" contains the word "deployment" in its transcript messages,
**When** the user types "deployment" in the session search input,
**Then** only "Planowanie sprintu" is shown in the session list.

**Linked to:** US-6
**Testable:** Yes
**Type:** Happy Path

### AC-6.4: No results state

**Given** 5 saved sessions,
**When** the user types "xyznonexistent" in the session search input,
**Then** the session list shows "Brak wynikow wyszukiwania" placeholder text and no session cards.

**Linked to:** US-6
**Testable:** Yes
**Type:** Edge Case

### AC-6.5: Search with debouncing

**Given** 20 saved sessions,
**When** the user rapidly types "spr" in the session search input,
**Then** the session list is filtered only once after 300ms of typing inactivity (not on each keystroke).

**Linked to:** US-6
**Testable:** Yes
**Type:** Edge Case

### AC-6.6: Clear session search

**Given** the session search has active query "standup" filtering 2 results,
**When** the user clicks the clear button (X) in the session search input,
**Then** the search input is cleared and all 5 sessions are shown again.

**Linked to:** US-6
**Testable:** Yes
**Type:** Happy Path

---

## US-7: Session Merging

### AC-7.1: Merge selection UI

**Given** 5 saved sessions in the history,
**When** the user clicks "Polacz sesje" button in the sidebar actions,
**Then** the session list enters multi-select mode with checkboxes next to each session, and a floating action bar shows "Wybrano: 0 sesji" with a disabled "Polacz" button.

**Linked to:** US-7
**Testable:** Yes
**Type:** Happy Path

### AC-7.2: Merge two sessions with no duplicates

**Given** two sessions selected for merging:
- Session A: messages with hashes ["h1", "h2", "h3"]
- Session B: messages with hashes ["h4", "h5", "h6"],
**When** the user clicks "Polacz",
**Then** a new merged session is created containing all 6 messages sorted chronologically, the original 2 sessions remain unchanged, and the merged session title is "Polaczone: [Session A title] + [Session B title]".

**Linked to:** US-7
**Testable:** Yes
**Type:** Happy Path

### AC-7.3: Merge with hash-based deduplication

**Given** two sessions selected for merging:
- Session A: messages with hashes ["h1", "h2", "h3"]
- Session B: messages with hashes ["h2", "h3", "h4", "h5"],
**When** the user clicks "Polacz",
**Then** the merged session contains exactly 5 unique messages (h1, h2, h3, h4, h5), duplicates h2 and h3 appear only once, and a toast shows "Polaczono 2 sesje. Usunieto 2 duplikaty."

**Linked to:** US-7
**Testable:** Yes
**Type:** Happy Path

### AC-7.4: Cannot merge fewer than 2 sessions

**Given** multi-select mode is active with only 1 session selected,
**When** the user looks at the action bar,
**Then** the "Polacz" button remains disabled with tooltip "Wybierz co najmniej 2 sesje".

**Linked to:** US-7
**Testable:** Yes
**Type:** Error Case

### AC-7.5: Merge respects session limit

**Given** 49 sessions in history and 2 sessions selected for merging,
**When** the user clicks "Polacz",
**Then** the merged session is created (total becomes 50), and a warning is NOT shown because the limit is not exceeded (originals are kept, merged is added = 51 would exceed; so user is asked "Usunac oryginalne sesje po polaczeniu?" with Yes/No).

**Linked to:** US-7
**Testable:** Yes
**Type:** Edge Case

### AC-7.6: Cancel merge mode

**Given** multi-select merge mode is active with 3 sessions selected,
**When** the user clicks "Anuluj" in the floating action bar,
**Then** multi-select mode is deactivated, checkboxes are hidden, and the session list returns to normal view.

**Linked to:** US-7
**Testable:** Yes
**Type:** Happy Path

---

## US-8: Keyboard Shortcuts

### AC-8.1: Toggle recording shortcut

**Given** the user is on a Google Meet page with the extension installed,
**When** the user presses Alt+Shift+R (configurable in chrome://extensions/shortcuts),
**Then** recording starts if not active, or stops if currently recording, same as clicking the record button.

**Linked to:** US-8
**Testable:** Yes
**Type:** Happy Path

### AC-8.2: Quick copy shortcut

**Given** an active or paused session with transcript data,
**When** the user presses Alt+Shift+C,
**Then** the transcript is copied to clipboard with the default LLM prompt (same as clicking the quick copy button) and a desktop notification "Skopiowano transkrypcje z promptem" is shown.

**Linked to:** US-8
**Testable:** Yes
**Type:** Happy Path

### AC-8.3: Open popup shortcut

**Given** the user is on any page,
**When** the user presses Alt+Shift+M,
**Then** the extension popup opens (using `_execute_action` command).

**Linked to:** US-8
**Testable:** Yes
**Type:** Happy Path

### AC-8.4: Export shortcut

**Given** the extension popup is open with transcript data loaded,
**When** the user presses Alt+Shift+E,
**Then** the export modal opens (same as clicking the export button).

**Linked to:** US-8
**Testable:** Yes
**Type:** Happy Path

### AC-8.5: Shortcut with no active Meet tab

**Given** the user is on a non-Google-Meet page,
**When** the user presses Alt+Shift+R (toggle recording),
**Then** a desktop notification "Otwórz Google Meet, aby rozpoczac nagrywanie" is shown and no recording action is taken.

**Linked to:** US-8
**Testable:** Yes
**Type:** Error Case

---

## US-9: Meeting Statistics

### AC-9.1: Statistics section visible for sessions with data

**Given** a loaded session with messages from 3 participants: "Jan" (45 messages), "Anna" (30 messages), "Piotr" (25 messages),
**When** the user views the transcript stats area,
**Then** a "Statystyki" expandable section is available showing a horizontal CSS bar chart where Jan's bar is the widest (45%), Anna's bar is 30%, and Piotr's bar is 25%.

**Linked to:** US-9
**Testable:** Yes
**Type:** Happy Path

### AC-9.2: Speaker bars show message count and percentage

**Given** the statistics section is expanded,
**When** the user views each speaker's bar,
**Then** each bar displays the speaker name, message count, and percentage label (e.g., "Jan Kowalski -- 45 wypowiedzi (45%)") and bar colors match the speaker's avatar color.

**Linked to:** US-9
**Testable:** Yes
**Type:** Happy Path

### AC-9.3: Statistics update during active recording

**Given** an active recording with the statistics section expanded,
**When** new messages arrive from the background scanner,
**Then** the bar chart updates in real-time to reflect the new message counts and percentages without closing the statistics section.

**Linked to:** US-9
**Testable:** Yes
**Type:** Happy Path

### AC-9.4: No statistics for empty sessions

**Given** a new empty session with no transcript data,
**When** the user views the transcript stats area,
**Then** the statistics section/button is hidden or disabled.

**Linked to:** US-9
**Testable:** Yes
**Type:** Edge Case

### AC-9.5: Statistics use CSS-only rendering

**Given** the statistics feature is implemented,
**When** the meeting statistics are rendered,
**Then** all chart visuals use only CSS (width percentages, background colors, flexbox/grid) with no `<canvas>`, `<svg>` chart libraries, or external JS charting dependencies.

**Linked to:** US-9
**Testable:** Yes
**Type:** Accessibility

---

## US-10: Import Sessions

### AC-10.1: Import button accessible from settings

**Given** the user opens the settings modal and navigates to the "Dane" tab,
**When** the tab is displayed,
**Then** an "Importuj sesje z pliku JSON" button is visible above the "Wyczysc wszystkie sesje" danger zone.

**Linked to:** US-10
**Testable:** Yes
**Type:** Happy Path

### AC-10.2: Successful import of valid JSON file

**Given** a JSON file containing 3 sessions in the expected schema `[{id, title, date, participantCount, entryCount, transcript: {messages: [...], scrapedAt, meetingUrl}, totalDuration}]`,
**When** the user clicks "Importuj sesje z pliku JSON" and selects the file,
**Then** all 3 sessions are added to session history, the session list updates to show them, and a toast notification "Zaimportowano 3 sesje" is shown.

**Linked to:** US-10
**Testable:** Yes
**Type:** Happy Path

### AC-10.3: Import with duplicate detection

**Given** the session history already contains a session with id "session_1707900000000",
**When** the user imports a JSON file containing a session with the same id "session_1707900000000",
**Then** the duplicate session is skipped (not overwritten), a toast shows "Zaimportowano 2 sesje. Pominieto 1 duplikat.", and the existing session data is unchanged.

**Linked to:** US-10
**Testable:** Yes
**Type:** Edge Case

### AC-10.4: Import rejects invalid JSON structure

**Given** a JSON file that is valid JSON but does not match the session schema (e.g., `{"foo": "bar"}` or an array of strings),
**When** the user selects the file for import,
**Then** a toast notification "Nieprawidlowy format pliku. Oczekiwano tablicy sesji." is shown with error styling and no data is imported.

**Linked to:** US-10
**Testable:** Yes
**Type:** Error Case

### AC-10.5: Import rejects non-JSON files

**Given** a file with `.txt` extension or corrupted JSON content,
**When** the user selects the file for import,
**Then** a toast notification "Blad odczytu pliku. Upewnij sie, ze plik jest poprawnym JSON." is shown with error styling.

**Linked to:** US-10
**Testable:** Yes
**Type:** Error Case

### AC-10.6: Import respects 50-session limit

**Given** 45 sessions already in history,
**When** the user imports a file containing 10 sessions (6 new, 4 duplicates),
**Then** only 5 sessions are imported (to reach the 50-session limit), a toast shows "Zaimportowano 5 z 6 nowych sesji. Osiagnieto limit 50 sesji.", and the oldest sessions are NOT removed to make room.

**Linked to:** US-10
**Testable:** Yes
**Type:** Edge Case

### AC-10.7: Import validates individual session entries

**Given** a JSON file containing 4 sessions where 1 session is missing required `transcript.messages` array,
**When** the user imports the file,
**Then** 3 valid sessions are imported, the malformed session is skipped, and a toast shows "Zaimportowano 3 sesje. Pominieto 1 nieprawidlowa sesje."

**Linked to:** US-10
**Testable:** Yes
**Type:** Error Case

---

## Traceability Matrix

| User Story | Acceptance Criteria | Total ACs |
|------------|-------------------|-----------|
| US-1  | AC-1.1, AC-1.2, AC-1.3, AC-1.4 | 4 |
| US-2  | AC-2.1, AC-2.2, AC-2.3, AC-2.4 | 4 |
| US-3  | AC-3.1, AC-3.2, AC-3.3, AC-3.4, AC-3.5 | 5 |
| US-4  | AC-4.1, AC-4.2, AC-4.3, AC-4.4, AC-4.5, AC-4.6 | 6 |
| US-5  | AC-5.1, AC-5.2, AC-5.3, AC-5.4, AC-5.5 | 5 |
| US-6  | AC-6.1, AC-6.2, AC-6.3, AC-6.4, AC-6.5, AC-6.6 | 6 |
| US-7  | AC-7.1, AC-7.2, AC-7.3, AC-7.4, AC-7.5, AC-7.6 | 6 |
| US-8  | AC-8.1, AC-8.2, AC-8.3, AC-8.4, AC-8.5 | 5 |
| US-9  | AC-9.1, AC-9.2, AC-9.3, AC-9.4, AC-9.5 | 5 |
| US-10 | AC-10.1, AC-10.2, AC-10.3, AC-10.4, AC-10.5, AC-10.6, AC-10.7 | 7 |
| **Total** | | **53** |

### Coverage by Type

| Type | Count | Percentage |
|------|-------|-----------|
| Happy Path | 30 | 57% |
| Edge Case | 15 | 28% |
| Error Case | 7 | 13% |
| Accessibility | 1 | 2% |
