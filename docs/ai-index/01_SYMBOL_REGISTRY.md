# Symbol Registry

> Auto-generated index of public symbols exposed on `window.*` in this Chrome extension.

## Modules (window.* globals)

| ID | Symbol | File | Type | Description |
|----|--------|------|------|-------------|
| S001 | `window.StateManager` | js/core/state-manager.js | Module | Global state management and restoration |
| S002 | `window.StorageManager` | js/core/storage-manager.js | Module | Chrome storage operations and persistence |
| S003 | `window.UIManager` | js/core/ui-manager.js | Module | Button visibility and UI state management |
| S004 | `window.TimerManager` | js/core/timer-manager.js | Module | Duration tracking and timer logic |
| S005 | `window.TransactionCoordinator` | js/core/transaction-coordinator.js | Module | Atomic storage operations with rollback |
| S006 | `window.AppConstants` | js/utils/constants.js | Module | Application constants and configuration |
| S007 | `window.Formatters` | js/utils/formatters.js | Module | Date/duration formatting functions |
| S008 | `window.DOMHelpers` | js/utils/dom-helpers.js | Module | DOM manipulation utilities |
| S009 | `window.GoogleUserDetector` | js/utils/google-user-detector.js | Module | Google account name detection |
| S010 | `window.SessionUtils` | js/utils/session-utils.js | Module | Session ID/title generation utilities |
| S011 | `window.DataIntegrityManager` | js/utils/data-integrity.js | Module | Storage data integrity checks |
| S012 | `window.DebugManager` | js/utils/debug-manager.js | Module | Debug utilities and module testing |
| S013 | `window.RecordingManager` | js/features/recording.js | Module | Recording start/stop functionality |
| S014 | `window.BackgroundScanner` | js/features/background-scanner.js | Module | Background transcript scanning |
| S015 | `window.SessionHistoryManager` | js/features/session-history.js | Module | Session CRUD operations |
| S016 | `window.SessionUIManager` | js/features/session-ui.js | Module | Session history UI rendering |
| S017 | `window.TranscriptManager` | js/features/transcript.js | Module | Transcript display and management |
| S018 | `window.TranscriptRefreshManager` | js/features/transcript-refresh.js | Module | Transcript refresh button handling |
| S019 | `window.ExportManager` | js/features/export.js | Module | TXT/JSON export functionality |
| S020 | `window.SearchFilterManager` | js/features/search-filter.js | Module | Search and participant filtering |
| S021 | `window.ModalManager` | js/features/modal-manager.js | Module | Modal dialogs management |
| S022 | `window.ThemeManager` | js/features/theme-manager.js | Module | Light/dark theme switching |
| S023 | `window.SettingsManager` | js/features/settings-manager.js | Module | User settings and preferences |

## Global Function Aliases

| ID | Symbol | Delegated To | Description |
|----|--------|-------------|-------------|
| S024 | `window.displayTranscript` | TranscriptManager.displayTranscript | Display transcript data |
| S025 | `window.updateStats` | TranscriptManager.updateStats | Update stats display |
| S026 | `window.getSpeakerColorMap` | TranscriptManager.getSpeakerColorMap | Get speaker color assignments |
| S027 | `window.detectChanges` | BackgroundScanner.detectChanges | Detect transcript changes |
| S028 | `window.createNewSession` | SessionHistoryManager.createNewSession | Create new recording session |
| S029 | `window.showSettingsModal` | SettingsManager.showSettingsModal | Open settings modal |
| S030 | `window.getUserDisplayName` | SettingsManager.getUserDisplayName | Get user display name |
| S031 | `window.startDurationTimer` | TimerManager.startDurationTimer | Start duration timer |
| S032 | `window.stopDurationTimer` | TimerManager.stopDurationTimer | Stop duration timer |
| S033 | `window.updateDurationDisplay` | TimerManager.updateDurationDisplay | Update duration display |

## Global State Variables

| ID | Symbol | Description |
|----|--------|-------------|
| S034 | `window.transcriptData` | Current transcript data object |
| S035 | `window.sessionHistory` | Array of saved sessions |
| S036 | `window.currentSessionId` | Active session identifier |
| S037 | `window.expandedEntries` | Set of expanded transcript entry IDs |

## Content Script (content.js)

| ID | Symbol | Type | Description |
|----|--------|------|-------------|
| S038 | `scrapeTranscript()` | Function | DOM scraping of Google Meet captions |
| S039 | `detectGoogleUserNameFallback()` | Function | Detect logged-in user name |
| S040 | `findNameByPattern()` | Function | Helper for regex name matching |
| S041 | `isValidUserNameFallback()` | Function | Validate candidate user names |
| S042 | `isLanguageSelectionText()` | Function | Filter out language menu text |
| S043 | `isValidTranscriptText()` | Function | Validate transcript text entries |
| S044 | `NAME_BLACKLIST` | Constant | Blacklisted terms for name validation |

## Background Script (background.js)

| ID | Symbol | Type | Description |
|----|--------|------|-------------|
| S045 | `chrome.runtime.onMessage` | Listener | Message handler for popup/content communication |
| S046 | `chrome.tabs.onUpdated` | Listener | Tab URL change monitoring |

## Entry Point (popup.js)

| ID | Symbol | Type | Description |
|----|--------|------|-------------|
| S047 | `initializeApp()` | Function | Main application initialization |
| S048 | `requireModule()` | Function | Validate required module availability |
| S049 | `initModule()` | Function | Safe module initialization helper |
| S050 | `bindClick()` | Function | Element click handler binding helper |
