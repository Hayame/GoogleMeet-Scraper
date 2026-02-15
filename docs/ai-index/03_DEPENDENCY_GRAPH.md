# Dependency Graph

## Relations Format: SUBJECT —[RELATION]→ OBJECT

### Script Loading Order (popup.html)
```
1.  debug-config.js              (S074)
2.  js/utils/constants.js        (S006 — AppConstants)
3.  js/core/transaction-coordinator.js (S005 → S002, S006)
4.  js/core/storage-manager.js   (S002 → S006)
5.  js/core/state-manager.js     (S001 → S002, S006)
6.  js/core/ui-manager.js        (S003 → S001, S016, S020)
7.  js/core/timer-manager.js     (S004 → S001, S002)
8.  js/utils/formatters.js       (S007)
9.  js/utils/dom-helpers.js      (S008)
10. js/utils/data-integrity.js   (S011 → S002, S006)
11. js/utils/session-utils.js    (S010 → S007)
12. js/utils/debug-manager.js    (S012 → all modules)
13. js/features/modal-manager.js (S021 → S015)
14. js/features/settings-manager.js (S023 → S002, S003, S009, S021)
15. js/features/theme-manager.js (S022 → S003)
16. js/features/recording.js     (S013 → S001, S002, S003, S004, S005, S014)
17. js/features/background-scanner.js (S014 → S001, S002, S005, S015, S017, S020)
18. js/features/auto-save-manager.js (S106 → S002, S019)
19. js/features/session-search.js (S105 → S016)
20. js/features/session-history.js (S015 → S001, S002, S003, S004, S005, S016, S017, S020)
21. js/features/session-merge.js (S110 → S002, S016, S019, S021)
22. js/features/session-ui.js    (S016 → S015, S017, S020, S105)
23. js/features/pagination.js    (S109 → S006, S017)
24. js/features/transcript.js    (S017 → S008, S020, S109)
25. js/features/export.js        (S019 → S023, S021, S003)
26. js/features/import-manager.js (S107 → S002, S006, S016, S019)
27. js/features/search-filter.js (S020 → S001, S017, S109)
28. js/features/meeting-stats.js (S108 → S019, S021)
29. js/features/transcript-refresh.js (S018 → S002, S014, S017, S003)
30. js/features/keyboard-shortcuts.js (S111 → S013, S019, S021)
31. popup.js                     (S067 → all modules)
```

### Module Dependency Relations

```
S005 —[USES]→ S002  (TransactionCoordinator → StorageManager for reads/writes)
S005 —[USES]→ S006  (TransactionCoordinator → AppConstants.TIMING)
S002 —[USES]→ S006  (StorageManager → AppConstants.STORAGE_KEYS)
S001 —[USES]→ S002  (StateManager → StorageManager for persistence)
S001 —[USES]→ S006  (StateManager → AppConstants.STORAGE_KEYS, TIMING)
S003 —[USES]→ S001  (UIManager → StateManager.saveUIState)
S003 —[USES]→ S002  (UIManager → StorageManager for session name persist)
S003 —[USES]→ S016  (UIManager → SessionUIManager.updateSessionTooltips)
S003 —[USES]→ S020  (UIManager → SearchFilterManager for filter state)
S004 —[USES]→ S001  (TimerManager → StateManager getters/setters)
S004 —[USES]→ S002  (TimerManager → StorageManager.saveSessionState)
S010 —[USES]→ S007  (SessionUtils → Formatters.formatSessionTime)
S011 —[USES]→ S002  (DataIntegrity → StorageManager)
S011 —[USES]→ S006  (DataIntegrity → AppConstants.STORAGE_KEYS)
S013 —[USES]→ S001  (RecordingManager → StateManager state setters)
S013 —[USES]→ S002  (RecordingManager → StorageManager for data recovery)
S013 —[USES]→ S003  (RecordingManager → UIManager.updateStatus/ButtonVisibility)
S013 —[USES]→ S004  (RecordingManager → TimerManager start/stop/accumulate)
S013 —[USES]→ S005  (RecordingManager → TransactionCoordinator.executeTransaction)
S013 —[USES]→ S014  (RecordingManager → starts BackgroundScanner via chrome.runtime)
S014 —[USES]→ S001  (BackgroundScanner → StateManager.getRecordingStopped)
S014 —[USES]→ S002  (BackgroundScanner → StorageManager for scan data)
S014 —[USES]→ S005  (BackgroundScanner → TransactionCoordinator.saveRecordingState)
S014 —[USES]→ S015  (BackgroundScanner → SessionHistoryManager.autoSaveCurrentSession)
S014 —[USES]→ S017  (BackgroundScanner → displayTranscript, updateStats)
S014 —[USES]→ S020  (BackgroundScanner → SearchFilterManager.completePendingRestoration)
S015 —[USES]→ S001  (SessionHistoryManager → StateManager setters)
S015 —[USES]→ S002  (SessionHistoryManager → StorageManager)
S015 —[USES]→ S003  (SessionHistoryManager → UIManager)
S015 —[USES]→ S004  (SessionHistoryManager → TimerManager)
S015 —[USES]→ S005  (SessionHistoryManager → TransactionCoordinator)
S015 —[USES]→ S016  (SessionHistoryManager → SessionUIManager.renderSessionHistory)
S015 —[USES]→ S017  (SessionHistoryManager → displayTranscript/updateStats)
S015 —[USES]→ S020  (SessionHistoryManager → SearchFilterManager reset/complete)
S016 —[USES]→ S015  (SessionUIManager → SessionHistoryManager for click handlers)
S016 —[USES]→ S017  (SessionUIManager → getSpeakerColorMap)
S016 —[USES]→ S020  (SessionUIManager → SearchFilterManager via reinitialize)
S017 —[USES]→ S008  (TranscriptManager → DOMHelpers pattern, but reimplements)
S017 —[USES]→ S020  (TranscriptManager → SearchFilterManager.applyFilters)
S018 —[USES]→ S002  (TranscriptRefreshManager → StorageManager)
S018 —[USES]→ S003  (TranscriptRefreshManager → UIManager.updateStatus)
S018 —[USES]→ S014  (TranscriptRefreshManager → restarts background scanner)
S018 —[USES]→ S017  (TranscriptRefreshManager → displayTranscript/updateStats)
S019 —[USES]→ S003  (ExportManager → UIManager.updateStatus)
S019 —[USES]→ S021  (ExportManager → ModalManager.hideModal)
S019 —[USES]→ S023  (ExportManager → SettingsManager for prompt settings)
S020 —[USES]→ S001  (SearchFilterManager → StateManager.saveUIState)
S020 —[USES]→ S017  (SearchFilterManager → TranscriptManager.displayTranscript)
S021 —[USES]→ S015  (ModalManager → SessionHistoryManager.performDeleteSession)
S022 —[USES]→ S003  (ThemeManager → UIManager.saveCurrentUIState for persistence)
S003 —[USES]→ S022  (UIManager → ThemeManager.updateThemeToggleIcon on restore)
S023 —[USES]→ S002  (SettingsManager → chrome.storage.sync)
S023 —[USES]→ S003  (SettingsManager → UIManager.updateStatus)
S023 —[USES]→ S015  (SettingsManager → SessionHistoryManager.clearAllSessionsFromHistory)
S023 —[USES]→ S019  (SettingsManager → ExportManager.showToast for prompt CRUD feedback)
S023 —[USES]→ S021  (SettingsManager → ModalManager.showModal)

S105 —[USES]→ S016  (SessionSearchManager → SessionUIManager.renderSessionHistory)
S016 —[USES]→ S105  (SessionUIManager → SessionSearchManager.getFilteredSessions)
S106 —[USES]→ S002  (AutoSaveManager → chrome.storage.local for auto-save data)
S106 —[USES]→ S019  (AutoSaveManager → ExportManager.showToast)
S107 —[USES]→ S002  (ImportManager → StorageManager.setStorageData)
S107 —[USES]→ S006  (ImportManager → AppConstants.IMPORT_LIMITS)
S107 —[USES]→ S016  (ImportManager → SessionUIManager.renderSessionHistory)
S107 —[USES]→ S019  (ImportManager → ExportManager.showToast)
S108 —[USES]→ S019  (MeetingStatsManager → ExportManager.showToast)
S108 —[USES]→ S021  (MeetingStatsManager → ModalManager.showModal)
S109 —[USES]→ S006  (PaginationManager → AppConstants.TIMING.PAGINATION_PAGE_SIZE)
S017 —[USES]→ S109  (TranscriptManager → PaginationManager for page slicing)
S020 —[USES]→ S109  (SearchFilterManager → PaginationManager.resetToFirstPage)
S110 —[USES]→ S002  (SessionMergeManager → StorageManager.setStorageData)
S110 —[USES]→ S016  (SessionMergeManager → SessionUIManager.renderSessionHistory)
S110 —[USES]→ S019  (SessionMergeManager → ExportManager.showToast)
S110 —[USES]→ S021  (SessionMergeManager → ModalManager.showModal/hideModal)
S111 —[USES]→ S013  (KeyboardShortcutsManager → RecordingManager.handleRecordButtonClick)
S111 —[USES]→ S019  (KeyboardShortcutsManager → ExportManager.quickCopyWithPrompt)
S111 —[USES]→ S021  (KeyboardShortcutsManager → ModalManager.hideModal via DOM query)
S014 —[USES]→ S003  (BackgroundScanner → UIManager.updateButtonVisibility on merge)
S070 —[USES]→ S021  (setupMainEventListeners → ModalManager.showModal for helpModal)
S014 —[UPDATES]→ DOM  (BackgroundScanner → caption warning visibility, checked BEFORE early return on empty messages)
```

### Cross-Context Communication (Chrome Messaging)

```
popup.js —[SENDS: startBackgroundScanning]→ background.js —[RELAYS: startContentScanning]→ content.js
popup.js —[SENDS: stopBackgroundScanning]→ background.js —[RELAYS: stopContentScanning]→ content.js
popup.js —[SENDS: getScanningStatus]→ background.js —[RELAYS: getScanningStatus]→ content.js
popup.js —[LISTENS: backgroundScanUpdate]← content.js (via chrome.runtime.sendMessage)
popup.js —[LISTENS: updateGoogleUserName]← background.js
content.js —[SENDS: getOwnTabId]→ background.js (to learn own tab ID for storage keys)
content.js —[SELF-SCANS: scrapeTranscript]→ chrome.storage.local (no messaging needed)
content.js —[LISTENS: scrapeTranscript]← popup (manual refresh)
content.js —[LISTENS: startContentScanning]← background.js relay
content.js —[LISTENS: stopContentScanning]← background.js relay
content.js —[LISTENS: getScanningStatus]← background.js relay
content.js —[LISTENS: updateUserDisplayName]← popup
content.js —[LISTENS: manualDetectGoogleName]← popup
content.js —[LISTENS: enableCaptions]← popup
GoogleUserDetector —[SENDS: updateGoogleUserName]→ background.js
content.js —[AUTO-SAVE: beforeunload]→ chrome.storage.local (auto-save transcript on tab close)
background.js —[AUTO-SAVE: tabs.onRemoved]→ chrome.storage.local (auto-save from scan buffer)
background.js —[LISTENS: chrome.commands.onCommand]← Chrome (global keyboard shortcut)
```

### Key Data Flows

```
Content Script ──self-scrape──→ chrome.storage.local  (immune to SW termination)
       ↓                              ↓
  try notify popup            Popup opens → StateManager.restoreStateFromStorage()
  (silently fails                            ↓
   if closed)               BackgroundScanner.reactivateAfterRestore()
                                             ↓
                                   merge accumulated data from storage
                                             ↓
                              TranscriptManager.displayTranscript() → DOM
                                             ↓
                              SearchFilterManager.applyFilters() → Filtered DOM
```

## Dependency Matrix (top 15 most connected)

| Symbol | ID | In-degree | Out-degree | Total | Classification |
|--------|----|-----------|------------|-------|----------------|
| StorageManager | S002 | 10 | 1 | 11 | Infrastructure hub |
| StateManager | S001 | 7 | 2 | 9 | State hub |
| UIManager | S003 | 5 | 3 | 8 | UI hub |
| TranscriptManager | S017 | 6 | 2 | 8 | Display hub |
| SearchFilterManager | S020 | 5 | 2 | 7 | Filter hub |
| SessionHistoryManager | S015 | 3 | 8 | 11 | Core service |
| BackgroundScanner | S014 | 2 | 6 | 8 | Data pipeline |
| RecordingManager | S013 | 0 | 6 | 6 | Orchestrator |
| TransactionCoordinator | S005 | 3 | 2 | 5 | Safety layer |
| TimerManager | S004 | 2 | 2 | 4 | Timer service |
| AppConstants | S006 | 5 | 0 | 5 | Config |
| ModalManager | S021 | 3 | 1 | 4 | UI service |
| SessionUIManager | S016 | 2 | 3 | 5 | UI renderer |
| SettingsManager | S023 | 1 | 5 | 6 | Settings service |
| ExportManager | S019 | 1 | 3 | 4 | Export service |

## Circular Dependencies
- ⚠️ S015 ↔ S016 (SessionHistoryManager ↔ SessionUIManager — mutual references via window)
- ⚠️ S017 ↔ S020 (TranscriptManager ↔ SearchFilterManager — mutual display/filter calls)
- Note: These are resolved at runtime via late-binding through `window.*` globals, not true circular imports.

## Orphan Symbols (no relations to other modules)
- S022 ThemeManager — now connected (S022 ↔ S003 via UIManager persistence and icon restore)
- S012 DebugManager — standalone (introspects all modules but none depend on it)
- S010 SessionUtils — low connectivity (only used by Formatters reference)
