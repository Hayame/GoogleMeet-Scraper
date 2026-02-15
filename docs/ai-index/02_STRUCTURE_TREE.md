# Module Hierarchy

## Layer Architecture

```
Google Meet Recorder Extension
│
├── Popup Context (popup.html loads all modules)
│   │
│   ├── Infrastructure Layer
│   │   ├── debug-config.js              (S074) — Global logging toggle
│   │   └── js/utils/constants.js        (S006) — AppConstants
│   │
│   ├── Core Layer (foundation services)
│   │   ├── js/core/transaction-coordinator.js (S005) — Atomic storage writes
│   │   ├── js/core/storage-manager.js         (S002) — Chrome storage CRUD
│   │   ├── js/core/state-manager.js           (S001) — Global state + restoration
│   │   ├── js/core/ui-manager.js              (S003) — Button/status/sidebar UI
│   │   └── js/core/timer-manager.js           (S004) — Duration tracking
│   │
│   ├── Utility Layer (pure helpers)
│   │   ├── js/utils/formatters.js         (S007) — Date/duration/text formatters
│   │   ├── js/utils/dom-helpers.js        (S008) — DOM element creation, effects
│   │   ├── js/utils/data-integrity.js     (S011) — Storage integrity checks
│   │   ├── js/utils/session-utils.js      (S010) — Session ID/title generation
│   │   └── js/utils/debug-manager.js      (S012) — Dev console tools
│   │
│   ├── Feature Layer (business logic modules)
│   │   ├── js/features/modal-manager.js       (S021) — Modal dialog system
│   │   ├── js/features/settings-manager.js    (S023) — User preferences + tabs
│   │   ├── js/features/theme-manager.js       (S022) — Light/dark theme
│   │   ├── js/features/recording.js           (S013) — Record start/stop/resume
│   │   ├── js/features/background-scanner.js  (S014) — Merge queue + data recovery
│   │   ├── js/features/auto-save-manager.js   (S106) — Auto-save on tab close
│   │   ├── js/features/session-search.js      (S105) — Session search + grouped results view
│   │   ├── js/features/session-history.js     (S015) — Session CRUD + auto-save
│   │   ├── js/features/session-merge.js       (S110) — Session merging + dedup
│   │   ├── js/features/session-ui.js          (S016) — Session list rendering
│   │   ├── js/features/pagination.js          (S109) — Transcript pagination
│   │   ├── js/features/transcript.js          (S017) — Transcript display + stats
│   │   ├── js/features/transcript-refresh.js  (S018) — Manual refresh
│   │   ├── js/features/export.js              (S019) — TXT/MD/clipboard export
│   │   ├── js/features/import-manager.js      (S107) — JSON session import
│   │   ├── js/features/search-filter.js       (S020) — Search + participant filter
│   │   ├── js/features/session-filter.js      (S113) — Session date/participant filter
│   │   ├── js/features/meeting-stats.js       (S108) — Meeting statistics
│   │   └── js/features/keyboard-shortcuts.js  (S111) — Keyboard shortcuts
│   │
│   └── Entry Point
│       └── popup.js                        (S067–S073) — Orchestrator
│
├── Content Script Context (injected into meet.google.com)
│   ├── debug-config.js                     (S074)
│   ├── js/utils/google-user-detector.js    (S009) — Auto-starts detection
│   └── content.js                          (S051–S062) — DOM scraping
│
└── Service Worker Context (background)
    └── background.js                       (S063–S066) — Background scanning
```

## Module Detail

### S001 — StateManager
- **Depends on**: StorageManager (S002), AppConstants (S006)
- **Methods**: 28 getter/setter pairs + restoreStateFromStorage, saveUIState, restoreUIState, exposeGlobalVariables
- **State held**: transcriptData, realtimeMode, currentSessionId, expandedEntries, sessionState object
- **Key behavior**: Restoration priority: active recording > paused > historical > none

### S005 — TransactionCoordinator
- **Depends on**: StorageManager (S002), AppConstants (S006)
- **Methods**: executeTransaction, saveRecordingState, recoverIncompleteTransactions
- **Key behavior**: Read-before-write for rollback, verification after write, timeout protection, crash recovery

### S014 — BackgroundScanner
- **Depends on**: StateManager (S001), StorageManager (S002), TranscriptManager (S017), TransactionCoordinator (S005)
- **Methods**: scheduleMerge, detectChanges, reactivateAfterRestore, retrieveAccumulatedScanData
- **Key behavior**: Priority merge queue (100=restoration, 10=manual, 1=background), multi-path data recovery

### S013 — RecordingManager
- **Depends on**: StateManager (S001), StorageManager (S002), UIManager (S003), TimerManager (S004), TransactionCoordinator (S005), BackgroundScanner (S014)
- **Methods**: activateRealtimeMode, deactivateRealtimeMode, handleRecordButtonClick, autoEnableCaptions
- **Key behavior**: Atomic state save on start, data loss prevention on stop (reads latest from storage)

### S015 — SessionHistoryManager
- **Depends on**: StateManager (S001), StorageManager (S002), UIManager (S003), TimerManager (S004), TransactionCoordinator (S005), SessionUIManager (S016), TranscriptManager (S017)
- **Methods**: autoSaveCurrentSession, loadSessionFromHistory, performDeleteSession, clearAllSessionsFromHistory
- **Key behavior**: Auto-save during recording, max 50 sessions, stop-recording confirmation before session switch
