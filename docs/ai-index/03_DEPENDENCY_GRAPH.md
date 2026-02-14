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
15. js/features/theme-manager.js (S022)
16. js/features/recording.js     (S013 → S001, S002, S003, S004, S005, S014)
17. js/features/background-scanner.js (S014 → S001, S002, S005, S015, S017, S020)
18. js/features/session-history.js (S015 → S001, S002, S003, S004, S005, S016, S017, S020)
19. js/features/session-ui.js    (S016 → S015, S017, S020)
20. js/features/transcript.js    (S017 → S008, S020)
21. js/features/export.js        (S019 → S023, S021, S003)
22. js/features/search-filter.js (S020 → S001, S017)
23. js/features/transcript-refresh.js (S018 → S002, S014, S017, S003)
24. popup.js                     (S067 → all modules)
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
S023 —[USES]→ S002  (SettingsManager → chrome.storage.sync)
S023 —[USES]→ S003  (SettingsManager → UIManager.updateStatus)
S023 —[USES]→ S009  (SettingsManager → GoogleUserDetector for name cleaning)
S023 —[USES]→ S015  (SettingsManager → SessionHistoryManager.clearAllSessionsFromHistory)
S023 —[USES]→ S021  (SettingsManager → ModalManager.showModal)
```

### Cross-Context Communication (Chrome Messaging)

```
popup.js —[SENDS: startBackgroundScanning]→ background.js
popup.js —[SENDS: stopBackgroundScanning]→ background.js
popup.js —[SENDS: getScanningStatus]→ background.js
popup.js —[LISTENS: backgroundScanUpdate]← background.js
popup.js —[LISTENS: updateGoogleUserName]← background.js
background.js —[SENDS: scrapeTranscript]→ content.js
background.js —[SENDS: backgroundScanUpdate]→ popup.js
content.js —[LISTENS: scrapeTranscript]← popup/background
content.js —[LISTENS: updateUserDisplayName]← popup
content.js —[LISTENS: manualDetectGoogleName]← popup
content.js —[LISTENS: enableCaptions]← popup
GoogleUserDetector —[SENDS: updateGoogleUserName]→ background.js
```

### Key Data Flows

```
Content Script ──scrape──→ Background Worker ──store──→ chrome.storage.local
                                                              ↓
Popup opens → StateManager.restoreStateFromStorage() → BackgroundScanner.reactivateAfterRestore()
                                                              ↓
                                                    merge accumulated data
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
| SettingsManager | S023 | 0 | 5 | 5 | Settings service |
| ExportManager | S019 | 0 | 3 | 3 | Export service |

## Circular Dependencies
- ⚠️ S015 ↔ S016 (SessionHistoryManager ↔ SessionUIManager — mutual references via window)
- ⚠️ S017 ↔ S020 (TranscriptManager ↔ SearchFilterManager — mutual display/filter calls)
- Note: These are resolved at runtime via late-binding through `window.*` globals, not true circular imports.

## Orphan Symbols (no relations to other modules)
- S022 ThemeManager — standalone (reads/writes localStorage and data-theme attribute only)
- S012 DebugManager — standalone (introspects all modules but none depend on it)
- S010 SessionUtils — low connectivity (only used by Formatters reference)
