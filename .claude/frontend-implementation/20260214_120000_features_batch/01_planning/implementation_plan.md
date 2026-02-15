# Implementation Plan: 10-Feature Batch for Google Meet Transcript Scraper

**Date:** 2026-02-14
**Scope:** 10 new features across the Chrome extension popup, content script, and background service worker
**Architecture:** Vanilla JS modules using `window.ModuleName = { initialize() {} }` pattern

---

## User Stories

### US-1: Markdown Export

**As a** meeting participant,
**I want** to export my transcript in Markdown format,
**so that** I can paste it into tools like Notion, Obsidian, or GitHub with proper formatting preserved.

**Priority:** HIGH
**Complexity:** S
**Related Architecture:** ExportManager (js/features/export.js), constants.js, popup.html, style.css

---

### US-2: Quick Copy with Prompt

**As a** meeting participant,
**I want** a one-click button to copy the transcript with an LLM prompt to my clipboard,
**so that** I can immediately paste it into ChatGPT or Claude without opening the export modal.

**Priority:** HIGH
**Complexity:** S
**Related Architecture:** ExportManager (js/features/export.js), popup.html, popup.js

---

### US-3: Caption Warning

**As a** meeting participant,
**I want** to see a clear warning when captions are not enabled in Google Meet,
**so that** I understand why no transcript data is being captured and can fix it.

**Priority:** HIGH
**Complexity:** S
**Related Architecture:** content.js, BackgroundScanner (background-scanner.js), RecordingManager (recording.js), popup.html

---

### US-4: Import Sessions

**As a** meeting organizer,
**I want** to import previously exported session files (JSON) back into the extension,
**so that** I can restore sessions on a different device or after clearing data.

**Priority:** MEDIUM
**Complexity:** M
**Related Architecture:** New ImportManager (js/features/import-manager.js), popup.html, constants.js

---

### US-5: Meeting Statistics

**As a** workspace admin,
**I want** to see detailed statistics about a meeting (speaking time per participant, word count, message distribution),
**so that** I can analyze participation patterns and meeting effectiveness.

**Priority:** MEDIUM
**Complexity:** M
**Related Architecture:** New MeetingStats (js/features/meeting-stats.js), popup.html, style.css

---

### US-6: Transcript Pagination

**As a** meeting participant reviewing a long session,
**I want** the transcript to be paginated,
**so that** the popup remains performant even with hundreds of messages.

**Priority:** MEDIUM
**Complexity:** M
**Related Architecture:** New PaginationManager (js/features/pagination.js), TranscriptManager (transcript.js), popup.html, constants.js

---

### US-7: Session Search

**As a** meeting participant with many saved sessions,
**I want** to search through my session history by title, date, or participant name,
**so that** I can quickly find a specific past meeting.

**Priority:** MEDIUM
**Complexity:** M
**Related Architecture:** New SessionSearchManager (js/features/session-search.js), SessionUIManager (session-ui.js), popup.html

---

### US-8: Auto-Save on Meeting Close

**As a** meeting participant,
**I want** my transcript to be automatically saved when the Google Meet tab closes or I leave the meeting,
**so that** I never lose my transcript data even if I forget to manually stop recording.

**Priority:** HIGH
**Complexity:** M
**Related Architecture:** New AutoSaveManager (js/features/auto-save-manager.js), content.js, background.js

---

### US-9: Keyboard Shortcuts

**As a** power user,
**I want** keyboard shortcuts for common actions (start/stop recording, export, copy),
**so that** I can operate the extension quickly without mouse clicks.

**Priority:** LOW
**Complexity:** M
**Related Architecture:** New KeyboardShortcutsManager (js/features/keyboard-shortcuts.js), manifest.json, background.js

---

### US-10: Session Merging

**As a** meeting organizer,
**I want** to merge two or more session histories into a single session,
**so that** I can combine transcripts from reconnected meetings or multi-part sessions.

**Priority:** MEDIUM
**Complexity:** L
**Related Architecture:** New SessionMergeManager (js/features/session-merge.js), SessionUIManager (session-ui.js), popup.html

---

## Acceptance Criteria

### AC-1: Markdown file export
**Given** a transcript with 5+ messages from 2 speakers,
**When** the user clicks "Eksportuj" then selects a new Markdown export button,
**Then** a `.md` file is downloaded containing the transcript formatted with `## Speaker Name`, `> quote blocks` for text, and `*timestamp*` for times.

**Linked to:** US-1
**Testable:** Yes
**Type:** Happy Path

### AC-2: Markdown clipboard copy
**Given** a transcript is loaded,
**When** the user copies Markdown to clipboard,
**Then** the clipboard contains valid Markdown with headers and quote blocks.

**Linked to:** US-1
**Testable:** Yes
**Type:** Happy Path

### AC-3: Markdown export with no data
**Given** no transcript is loaded (empty state),
**When** the user attempts Markdown export,
**Then** an error toast "Brak danych do eksportu" is displayed and no file is generated.

**Linked to:** US-1
**Testable:** Yes
**Type:** Error Case

### AC-4: Markdown with LLM prompt wrapping
**Given** the "Eksportuj jako prompt dla LLM" toggle is enabled,
**When** the user exports as Markdown,
**Then** the prompt template is prepended before the Markdown-formatted transcript.

**Linked to:** US-1
**Testable:** Yes
**Type:** Happy Path

---

### AC-5: Quick copy button visible during active session
**Given** a transcript with at least 1 message is loaded,
**When** the user views the transcript area,
**Then** a "Kopiuj z promptem" button is visible in the transcript actions bar next to the export button.

**Linked to:** US-2
**Testable:** Yes
**Type:** Happy Path

### AC-6: Quick copy performs clipboard write
**Given** a transcript with 3 messages and the default prompt configured,
**When** the user clicks the "Kopiuj z promptem" button,
**Then** the clipboard contains the default prompt followed by the TXT-formatted transcript, and a success toast "Skopiowano z promptem!" appears.

**Linked to:** US-2
**Testable:** Yes
**Type:** Happy Path

### AC-7: Quick copy with no transcript
**Given** no transcript data exists,
**When** the user clicks the "Kopiuj z promptem" button,
**Then** an error toast "Brak danych do skopiowania" is shown.

**Linked to:** US-2
**Testable:** Yes
**Type:** Error Case

---

### AC-8: Caption warning shown during recording
**Given** the user starts recording,
**When** the content script detects captions are disabled (no `[jsname="dsyhDe"]` element),
**Then** a yellow warning banner appears in the popup below the recording controls: "Napisy nie sa wlaczone w Google Meet. Wlacz napisy aby nagrywac transkrypcje."

**Linked to:** US-3
**Testable:** Yes
**Type:** Happy Path

### AC-9: Caption warning dismissed when captions enabled
**Given** the caption warning banner is visible,
**When** captions become enabled (auto-enable succeeds or user manually enables),
**Then** the warning banner disappears within 5 seconds.

**Linked to:** US-3
**Testable:** Yes
**Type:** Happy Path

### AC-10: Caption status check on each scan cycle
**Given** background scanning is active,
**When** each 3-second scan cycle completes,
**Then** the caption status (enabled/disabled) is included in the scan result message sent to the popup.

**Linked to:** US-3
**Testable:** Yes
**Type:** Edge Case

---

### AC-11: Import JSON session file
**Given** the user has a previously exported JSON session file,
**When** the user clicks "Importuj" in settings/data tab and selects the JSON file,
**Then** the session appears in the session history sidebar with all transcript messages, metadata, and participant data intact.

**Linked to:** US-4
**Testable:** Yes
**Type:** Happy Path

### AC-12: Import invalid file format
**Given** the user selects a non-JSON or corrupt file,
**When** the import is attempted,
**Then** an error toast "Nieprawidlowy format pliku. Wymagany format JSON." is shown and no data is modified.

**Linked to:** US-4
**Testable:** Yes
**Type:** Error Case

### AC-13: Import duplicate session
**Given** a session with the same ID already exists in history,
**When** the user imports a JSON file containing that session,
**Then** a confirm dialog asks "Sesja o tej nazwie juz istnieje. Czy chcesz ja zastapic?" with Zastap/Anuluj buttons.

**Linked to:** US-4
**Testable:** Yes
**Type:** Edge Case

### AC-14: Import session export format (JSON with entries array)
**Given** a JSON file exported by the extension's existing JSON export,
**When** the user imports it,
**Then** the importer correctly parses the `entries[]` array and maps it to the internal `messages[]` format.

**Linked to:** US-4
**Testable:** Yes
**Type:** Happy Path

---

### AC-15: Statistics modal opens from transcript stats area
**Given** a transcript with 10+ messages from 3 speakers is loaded,
**When** the user clicks a new "Statystyki" button in the transcript stats bar,
**Then** a modal opens showing: total messages, messages per speaker (bar chart), total word count, words per speaker, and estimated speaking time.

**Linked to:** US-5
**Testable:** Yes
**Type:** Happy Path

### AC-16: Statistics with single speaker
**Given** a transcript where all messages are from one speaker,
**When** the statistics modal is opened,
**Then** the modal shows 100% for that speaker across all metrics without errors.

**Linked to:** US-5
**Testable:** Yes
**Type:** Edge Case

### AC-17: Statistics with empty transcript
**Given** no transcript data,
**When** the user clicks the statistics button,
**Then** a toast "Brak danych do analizy" is shown and the modal does not open.

**Linked to:** US-5
**Testable:** Yes
**Type:** Error Case

---

### AC-18: Pagination controls appear for long transcripts
**Given** a transcript with 60 messages and a page size of 50,
**When** the transcript is displayed,
**Then** only the first 50 messages are rendered, and "Strona 1 z 2" pagination controls appear at the bottom of the transcript container with Previous/Next buttons.

**Linked to:** US-6
**Testable:** Yes
**Type:** Happy Path

### AC-19: Page navigation
**Given** the user is on page 1 of a 3-page transcript,
**When** the user clicks "Nastepna",
**Then** page 2 is rendered (messages 51-100), the scroll position resets to top, and "Poprzednia" button becomes enabled.

**Linked to:** US-6
**Testable:** Yes
**Type:** Happy Path

### AC-20: Pagination with fewer than page size messages
**Given** a transcript with 30 messages and page size of 50,
**When** the transcript is displayed,
**Then** all 30 messages are shown and no pagination controls appear.

**Linked to:** US-6
**Testable:** Yes
**Type:** Edge Case

### AC-21: Pagination preserves search and filter state
**Given** a search query "spotkanie" is active and participant filter is set,
**When** the user navigates pages,
**Then** only filtered/searched messages are paginated and page counts reflect the filtered result set.

**Linked to:** US-6
**Testable:** Yes
**Type:** Edge Case

---

### AC-22: Session search input appears in sidebar
**Given** the user has 5+ saved sessions,
**When** the sidebar is visible (not collapsed),
**Then** a search input field appears above the session list with placeholder "Szukaj sesji...".

**Linked to:** US-7
**Testable:** Yes
**Type:** Happy Path

### AC-23: Session search filters by title
**Given** sessions named "Standup poniedzialkowy", "Retrospektywa Q1", "Planowanie sprintu",
**When** the user types "stan" in the session search,
**Then** only "Standup poniedzialkowy" is shown in the sidebar.

**Linked to:** US-7
**Testable:** Yes
**Type:** Happy Path

### AC-24: Session search clears
**Given** a session search is active showing 1 result,
**When** the user clicks the clear (X) button,
**Then** all sessions are visible again and the search input is empty.

**Linked to:** US-7
**Testable:** Yes
**Type:** Happy Path

### AC-25: Session search with no results
**Given** the user types "xyz123" in session search,
**When** no sessions match,
**Then** "Nie znaleziono sesji" message appears in the session list area.

**Linked to:** US-7
**Testable:** Yes
**Type:** Edge Case

---

### AC-26: Auto-save on tab close
**Given** recording is active with 20 captured messages,
**When** the user closes the Google Meet tab,
**Then** the transcript is automatically saved to session history before the tab unloads.

**Linked to:** US-8
**Testable:** Yes
**Type:** Happy Path

### AC-27: Auto-save on meeting end (navigation)
**Given** recording is active,
**When** the user leaves the meeting (Google Meet redirects to the post-meeting page),
**Then** the transcript is saved and the recording state is set to stopped.

**Linked to:** US-8
**Testable:** Yes
**Type:** Happy Path

### AC-28: Auto-save with empty transcript
**Given** recording was started but no captions were captured (0 messages),
**When** the tab closes,
**Then** no empty session is saved to history.

**Linked to:** US-8
**Testable:** Yes
**Type:** Edge Case

---

### AC-29: Keyboard shortcut starts/stops recording
**Given** the popup is open and focused,
**When** the user presses `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac),
**Then** the recording toggles (starts if stopped, stops if recording).

**Linked to:** US-9
**Testable:** Yes
**Type:** Happy Path

### AC-30: Keyboard shortcut exports to clipboard
**Given** a transcript is loaded and the popup is focused,
**When** the user presses `Ctrl+Shift+C`,
**Then** the transcript (with default prompt) is copied to clipboard and a success toast appears.

**Linked to:** US-9
**Testable:** Yes
**Type:** Happy Path

### AC-31: Keyboard shortcut with no active data
**Given** no transcript data exists,
**When** the user presses `Ctrl+Shift+C`,
**Then** an error toast is shown and no clipboard write occurs.

**Linked to:** US-9
**Testable:** Yes
**Type:** Error Case

---

### AC-32: Merge two sessions
**Given** two sessions exist: "Standup cz.1" (15 messages) and "Standup cz.2" (10 messages),
**When** the user selects both sessions and clicks "Polacz sesje",
**Then** a new session "Standup cz.1 + Standup cz.2" is created with 25 messages sorted by timestamp, and the original two sessions remain unchanged.

**Linked to:** US-10
**Testable:** Yes
**Type:** Happy Path

### AC-33: Merge session selection UI
**Given** 4 sessions exist,
**When** the user clicks "Polacz sesje" button,
**Then** a merge modal opens with checkboxes next to each session, a "Polacz" button (disabled until 2+ selected), and a "Anuluj" button.

**Linked to:** US-10
**Testable:** Yes
**Type:** Happy Path

### AC-34: Merge with fewer than 2 sessions selected
**Given** the merge modal is open with 1 session checked,
**When** the user attempts to click "Polacz",
**Then** the button remains disabled with tooltip "Wybierz co najmniej 2 sesje".

**Linked to:** US-10
**Testable:** Yes
**Type:** Error Case

### AC-35: Merge handles duplicate messages
**Given** two sessions that overlap (5 identical messages in both),
**When** merged,
**Then** the resulting session contains unique messages only (deduplication by hash).

**Linked to:** US-10
**Testable:** Yes
**Type:** Edge Case

---

## Task Definitions

### T-1: Add Markdown Export Format to Constants

**Priority:** 1
**Complexity:** Low
**Estimated Effort:** S
**Files to create/modify:**
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/utils/constants.js` - modify

**Dependencies:** None
**Linked ACs:** AC-1, AC-4

**Description:**
Add `MD: 'md'` to the `EXPORT_FORMATS` object in constants.js. Add `PAGINATION_PAGE_SIZE: 50` and `CAPTION_CHECK_INTERVAL: 5000` to the `TIMING` object. Add `AUTO_SAVE_STATE: 'autoSaveState'` and `SESSION_SEARCH_QUERY: 'sessionSearchQuery'` to `STORAGE_KEYS`. These constants will be used by multiple features in later batches.

---

### T-2: Implement Markdown Generation in ExportManager

**Priority:** 2
**Complexity:** Low
**Estimated Effort:** S
**Files to create/modify:**
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/export.js` - modify

**Dependencies:** T-1
**Linked ACs:** AC-1, AC-2, AC-3, AC-4

**Description:**
Add a `generateMdContent(dataSnapshot)` method to ExportManager that formats transcript data as Markdown. Format: `# Transkrypcja Google Meet` header, metadata block, then for each message: `## Speaker Name` (or `**Speaker Name** *[timestamp]*:`) followed by `> message text` as blockquotes. Update `setupExportButtonHandlers()` to add handlers for the new Markdown export button (exportMdBtn) and Markdown clipboard button. The existing `prepareExportContent` should accept a format parameter. Update the download handler to support `.md` filename and `text/markdown` MIME type.

---

### T-3: Add Markdown Export UI Elements to Popup

**Priority:** 3
**Complexity:** Low
**Estimated Effort:** S
**Files to create/modify:**
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/style.css` - modify

**Dependencies:** T-2
**Linked ACs:** AC-1, AC-2

**Description:**
In the `#exportModal .export-options` div, add a new button `#exportMdBtn` with a Markdown icon (M-down-arrow SVG) and label "Eksportuj Markdown". Style it identically to the existing `exportTxtBtn`. Also add an `#exportMdClipboardBtn` button "Kopiuj Markdown". Add corresponding CSS for the new buttons, keeping the export modal grid layout consistent (2x2 grid of export options).

---

### T-4: Implement Quick Copy with Prompt Button

**Priority:** 2
**Complexity:** Low
**Estimated Effort:** S
**Files to create/modify:**
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/export.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.js` - modify

**Dependencies:** None
**Linked ACs:** AC-5, AC-6, AC-7

**Description:**
Add a `#quickCopyBtn` button in the `.action-group-right` div in popup.html, positioned before the export button. Use a clipboard+sparkle SVG icon with title "Kopiuj z promptem". In ExportManager, add a `quickCopyWithPrompt()` method that: (1) checks `window.transcriptData` exists, (2) calls `prepareExportContent(true)` to get content with default prompt, (3) copies to clipboard, (4) shows toast. In popup.js `setupMainEventListeners()`, bind the click handler. The button should be visible via UIManager whenever transcript data exists (add to `updateButtonVisibility` RECORDING and NEW states).

---

### T-5: Implement Caption Warning System

**Priority:** 3
**Complexity:** Low
**Estimated Effort:** S
**Files to create/modify:**
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/content.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/background-scanner.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/recording.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/style.css` - modify

**Dependencies:** T-1
**Linked ACs:** AC-8, AC-9, AC-10

**Description:**
In content.js, modify `scrapeTranscript()` to include `captionsEnabled: areCaptionsEnabled()` in the returned object. In background-scanner.js `handleBackgroundScanUpdate()`, check `data.captionsEnabled` and if false, dispatch a UI update showing the warning. In popup.html, add a `#captionWarning` div (yellow warning banner) below `.recording-controls` with the message and a dismiss button. In recording.js `activateRealtimeMode()`, after starting the scanner, send a one-time caption check and show/hide warning accordingly. Add CSS for `.caption-warning` (yellow background, warning icon, dismissible). The warning auto-hides when `captionsEnabled` becomes true in subsequent scan updates.

---

### T-6: Create ImportManager Module

**Priority:** 4
**Complexity:** Medium
**Estimated Effort:** M
**Files to create/modify:**
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/import-manager.js` - create
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/utils/constants.js` - modify (already done in T-1)

**Dependencies:** T-1
**Linked ACs:** AC-11, AC-12, AC-13, AC-14

**Description:**
Create `window.ImportManager` module following the existing module pattern (see ExportManager as reference). Methods: `initialize()` - bind UI handlers; `handleImportClick()` - create hidden file input, trigger click; `processImportFile(file)` - read file, validate JSON structure; `validateImportData(data)` - check required fields (messages array, each with speaker/text); `importSession(sessionData)` - add to sessionHistory, save via StorageManager, re-render. Handle two import formats: (1) full session export `{entries[], scrapedAt, meetingUrl}` mapped to `{messages[], ...}`, (2) raw transcript `{messages[], ...}`. For duplicates, use ModalManager confirm dialog. Add "Importuj sesje" button in the settings modal Data tab, and also in the sidebar actions area. Add `<script src="js/features/import-manager.js"></script>` to popup.html before popup.js. Add `initModule('ImportManager')` in popup.js initialization sequence after ExportManager.

---

### T-7: Create MeetingStats Module

**Priority:** 5
**Complexity:** Medium
**Estimated Effort:** M
**Files to create/modify:**
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/meeting-stats.js` - create
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/style.css` - modify

**Dependencies:** T-1
**Linked ACs:** AC-15, AC-16, AC-17

**Description:**
Create `window.MeetingStatsManager` module. Methods: `initialize()` - bind stat button click; `calculateStats(transcriptData)` - compute per-speaker: message count, word count, character count, estimated speaking time (words / 150 wpm); `renderStatsModal(stats)` - build and populate `#statsModal` content with CSS bar charts (no external libs, pure CSS percentage bars). Add a `#statsBtn` icon button (bar-chart SVG) in the `.transcript-stats` div next to the existing stats. Add `#statsModal` markup to popup.html (modal with `.modal-content`, header "Statystyki spotkania", body with stats grid). Style the stats bars using CSS custom properties for speaker colors matching avatar palette. Add script tag in popup.html. Add `initModule('MeetingStatsManager')` after TranscriptManager in popup.js.

---

### T-8: Create PaginationManager Module

**Priority:** 6
**Complexity:** Medium
**Estimated Effort:** M
**Files to create/modify:**
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/pagination.js` - create
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/transcript.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/style.css` - modify

**Dependencies:** T-1
**Linked ACs:** AC-18, AC-19, AC-20, AC-21

**Description:**
Create `window.PaginationManager` module. State: `currentPage`, `totalPages`, `pageSize` (from `TIMING.PAGINATION_PAGE_SIZE`). Methods: `initialize()` - bind pagination button listeners; `setTotalItems(count)` - calculate totalPages; `getCurrentPageItems(allItems)` - return slice for current page; `goToPage(n)` - update state, trigger re-render; `renderControls()` - show/hide pagination bar, update "Strona X z Y" text, enable/disable prev/next. Modify TranscriptManager.displayTranscript() to: (1) pass all filtered messages to PaginationManager, (2) only render the current page slice, (3) call PaginationManager.renderControls(). In popup.html, add `#paginationControls` div below `#transcriptContent` with prev/next buttons and page indicator. PaginationManager should integrate with SearchFilterManager so that filtering resets to page 1.

---

### T-9: Create SessionSearchManager Module

**Priority:** 5
**Complexity:** Medium
**Estimated Effort:** M
**Files to create/modify:**
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/session-search.js` - create
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/session-ui.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/style.css` - modify

**Dependencies:** None
**Linked ACs:** AC-22, AC-23, AC-24, AC-25

**Description:**
Create `window.SessionSearchManager` module. Methods: `initialize()` - bind input events with 300ms debounce; `search(query)` - filter `window.sessionHistory` by title (case-insensitive includes), participant names, or date string; `clearSearch()` - reset query and re-render; `getFilteredSessions()` - return current filtered list. Add `#sessionSearchInput` in `.sidebar-actions` div in popup.html (above the "Nowa sesja" button). Add clear button. Modify SessionUIManager.renderSessionHistory() to call `SessionSearchManager.getFilteredSessions()` instead of directly using `window.sessionHistory`. If no results, show "Nie znaleziono sesji" message. The search input should be hidden when sidebar is collapsed. Add script tag in popup.html before session-ui.js. Add `initModule('SessionSearchManager')` before SessionUIManager initialization.

---

### T-10: Create AutoSaveManager Module

**Priority:** 7
**Complexity:** Medium
**Estimated Effort:** M
**Files to create/modify:**
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/auto-save-manager.js` - create
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/content.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/background.js` - modify

**Dependencies:** T-1
**Linked ACs:** AC-26, AC-27, AC-28

**Description:**
Create `window.AutoSaveManager` module for the popup side with `initialize()` and `handleMeetingEndNotification(data)`. In content.js, add `beforeunload` and `visibilitychange` event listeners that: (1) detect tab close or navigation away from meet.google.com, (2) if `_isScanning`, perform a final `scrapeTranscript()`, (3) save data to `chrome.storage.local` under key `autoSaveData_{tabId}`, (4) send message to background: `{action: 'meetingEnded', tabId, data}`. In background.js, add handler for `meetingEnded` message that: (1) saves the transcript data with session metadata to `chrome.storage.local`, (2) marks the scanning state as stopped. Also add `chrome.tabs.onRemoved` listener that checks if the removed tab was a scanning Meet tab and triggers auto-save from the last checkpoint. The popup-side AutoSaveManager checks for `autoSaveData_*` on initialization and merges it into session history if found.

---

### T-11: Create KeyboardShortcutsManager Module

**Priority:** 8
**Complexity:** Medium
**Estimated Effort:** M
**Files to create/modify:**
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/keyboard-shortcuts.js` - create
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/manifest.json` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/background.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify

**Dependencies:** T-4
**Linked ACs:** AC-29, AC-30, AC-31

**Description:**
Create `window.KeyboardShortcutsManager` module. Methods: `initialize()` - register `keydown` listener on document; `handleKeyDown(event)` - match shortcuts and dispatch actions; `getShortcutMap()` - return current shortcut configuration. Shortcuts: `Ctrl+Shift+R` toggle recording (calls RecordingManager.handleRecordButtonClick()), `Ctrl+Shift+C` quick copy with prompt (calls ExportManager.quickCopyWithPrompt()), `Ctrl+Shift+E` open export modal, `Escape` close any open modal. In manifest.json, add `commands` section for the global toggle-recording shortcut: `"_execute_action"` is not needed since we handle shortcuts in the popup context. In background.js, add `chrome.commands.onCommand` listener for the global recording toggle command. Add script tag in popup.html. Add `initModule('KeyboardShortcutsManager')` after ExportManager in popup.js.

---

### T-12: Create SessionMergeManager Module

**Priority:** 9
**Complexity:** High
**Estimated Effort:** L
**Files to create/modify:**
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/session-merge.js` - create
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/session-ui.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/style.css` - modify

**Dependencies:** T-9
**Linked ACs:** AC-32, AC-33, AC-34, AC-35

**Description:**
Create `window.SessionMergeManager` module. Methods: `initialize()` - bind merge button; `openMergeModal()` - populate `#mergeModal` with session checkboxes; `updateMergeButton()` - enable "Polacz" only when 2+ checked; `mergeSessions(sessionIds)` - load full transcript data for each session from sessionHistory, combine messages, deduplicate by hash, sort by timestamp or original order, generate new session with combined title "Session1 + Session2", save via SessionHistoryManager. Add `#mergeBtn` button in sidebar actions (near "Nowa sesja") with merge icon. Add `#mergeModal` markup to popup.html with session checklist, merge button, cancel button. Modify SessionUIManager to add merge-selection checkboxes when merge mode is active. CSS for merge modal, checkbox list, and merge button states.

---

## Dependency Graph

```
T-1 (constants)
 |
 +-- T-2 (MD export logic) --> T-3 (MD export UI)
 |
 +-- T-5 (caption warning)
 |
 +-- T-6 (import manager)
 |
 +-- T-8 (pagination)
 |
 +-- T-10 (auto-save)

T-4 (quick copy) --> T-11 (keyboard shortcuts)

T-9 (session search) --> T-12 (session merge)

T-7 (meeting stats) -- independent after T-1

Independent chains:
  T-4 is independent of T-1
  T-9 is independent of T-1
```

---

## Execution Batches

### Batch 1: Foundation and Independent Features (No dependencies)

| Task | Name | Effort | Dependencies |
|------|------|--------|--------------|
| T-1 | Constants updates | S | None |
| T-4 | Quick copy with prompt | S | None |
| T-9 | Session search | M | None |

**Rationale:** T-1 provides constants needed by 5+ later tasks. T-4 and T-9 are completely independent and can run in parallel. Limiting to 3 tasks avoids popup.html merge conflicts (T-4 and T-9 both touch popup.html but in different sections: action-group-right vs sidebar).

---

### Batch 2: Core Feature Modules (Depends on Batch 1)

| Task | Name | Effort | Dependencies |
|------|------|--------|--------------|
| T-2 | Markdown export logic | S | T-1 |
| T-5 | Caption warning system | S | T-1 |
| T-7 | Meeting statistics | M | T-1 |
| T-10 | Auto-save on meeting close | M | T-1 |

**Rationale:** All four depend on T-1 constants. T-2 touches export.js, T-5 touches content.js+recording.js, T-7 creates new module, T-10 touches content.js+background.js. Minimal file overlap between T-5 and T-10 on content.js (different sections: scrapeTranscript return value vs event listeners).

---

### Batch 3: UI Integration and Complex Features (Depends on Batches 1+2)

| Task | Name | Effort | Dependencies |
|------|------|--------|--------------|
| T-3 | Markdown export UI | S | T-2 |
| T-6 | Import manager | M | T-1 |
| T-8 | Pagination | M | T-1 |
| T-11 | Keyboard shortcuts | M | T-4 |

**Rationale:** T-3 needs T-2's Markdown generation. T-6 and T-8 need constants from T-1 and benefit from other Batch 2 modules being stable. T-11 depends on T-4's quickCopyWithPrompt method.

---

### Batch 4: Final Integration (Depends on Batches 1-3)

| Task | Name | Effort | Dependencies |
|------|------|--------|--------------|
| T-12 | Session merging | L | T-9 |

**Rationale:** Session merging is the most complex feature and depends on SessionSearchManager (T-9) for UI patterns in the sidebar. It also benefits from all other session-related features being stable.

---

### Batch 5: Integration Testing and popup.html Consolidation

After all batches complete, a final integration pass is needed to:
1. Verify all new `<script>` tags are in correct load order in popup.html
2. Verify `initModule()` calls are in correct sequence in popup.js
3. Test all features work together without conflicts
4. Verify keyboard shortcuts do not conflict with Chrome defaults
