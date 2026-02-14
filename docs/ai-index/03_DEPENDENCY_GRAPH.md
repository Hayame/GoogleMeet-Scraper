# Dependency Graph

> Module loading order and inter-module dependencies.

## Loading Order (popup.html)

```
1. debug-config.js          (global console override)
2. js/utils/constants.js     (AppConstants)
3. js/core/transaction-coordinator.js (TransactionCoordinator)
4. js/core/storage-manager.js (StorageManager → AppConstants, TransactionCoordinator)
5. js/core/state-manager.js  (StateManager → StorageManager, AppConstants)
6. js/core/ui-manager.js     (UIManager → StateManager, SessionUIManager)
7. js/core/timer-manager.js  (TimerManager → StateManager)
8. js/utils/formatters.js    (Formatters)
9. js/utils/dom-helpers.js   (DOMHelpers)
10. js/utils/data-integrity.js (DataIntegrityManager → StorageManager, AppConstants)
11. js/utils/session-utils.js  (SessionUtils → Formatters)
12. js/utils/debug-manager.js  (DebugManager → all modules)
13. js/features/modal-manager.js (ModalManager → SessionHistoryManager)
14. js/features/settings-manager.js (SettingsManager → StorageManager, ModalManager, UIManager, GoogleUserDetector)
15. js/features/theme-manager.js (ThemeManager)
16. js/features/recording.js   (RecordingManager → StateManager, StorageManager, UIManager, TimerManager, TransactionCoordinator, BackgroundScanner)
17. js/features/background-scanner.js (BackgroundScanner → StateManager, StorageManager, TranscriptManager, TransactionCoordinator)
18. js/features/session-history.js (SessionHistoryManager → StateManager, StorageManager, UIManager, TimerManager, TransactionCoordinator, SessionUIManager, TranscriptManager)
19. js/features/session-ui.js  (SessionUIManager → SessionHistoryManager, SearchFilterManager, TranscriptManager)
20. js/features/transcript.js  (TranscriptManager → DOMHelpers, SearchFilterManager, StorageManager)
21. js/features/export.js      (ExportManager → SettingsManager, ModalManager, UIManager)
22. js/features/search-filter.js (SearchFilterManager → TranscriptManager, StateManager)
23. js/features/transcript-refresh.js (TranscriptRefreshManager → StorageManager, TranscriptManager, BackgroundScanner, UIManager)
24. popup.js                   (orchestrator → all modules)
```

## Content Script Context

```
content.js (injected into meet.google.com)
  ← chrome.runtime.onMessage (from popup.js / background.js)
  → scrapeTranscript(), detectGoogleUserNameFallback()
```

## Background Script Context

```
background.js (service worker)
  ← chrome.runtime.onMessage (from popup.js)
  → chrome.tabs.sendMessage (to content.js)
  → chrome.storage.local (scan data persistence)
```

## Key Data Flows

```
Content Script ──scrape──→ Background Scanner ──merge──→ StateManager ──persist──→ StorageManager
                                                              ↓
                                                    TranscriptManager ──render──→ DOM
                                                              ↓
                                                    SearchFilterManager ──filter──→ Filtered DOM
```
