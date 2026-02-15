# Business Rules & Invariants

## Recording Rules

| Rule ID | Rule | Source IDs | Enforced at |
|---------|------|------------|-------------|
| BR001 | Recording state is saved atomically (all-or-nothing) | S005, S013 | RecordingManager.activateRealtimeMode |
| BR002 | On recording stop, latest data is loaded from storage before deactivating (prevents data loss from worker failures) | S013 | RecordingManager.deactivateRealtimeMode |
| BR003 | Auto-enable captions only on NEW recordings (not continuations) | S013 | RecordingManager.activateRealtimeMode |
| BR004 | Recording generates a new sessionId if none exists | S013 | RecordingManager.activateRealtimeMode |
| BR005 | Recording cannot be deactivated until background scanner is stopped | S013 | RecordingManager.deactivateRealtimeMode |

## Session History Rules

| Rule ID | Rule | Source IDs | Enforced at |
|---------|------|------------|-------------|
| BR010 | Maximum 50 sessions in history (oldest dropped) | S015 | SessionHistoryManager._performAutoSave |
| BR011 | Auto-save skipped during state restoration | S015 | SessionHistoryManager.autoSaveCurrentSession |
| BR012 | Session load during active recording requires stop confirmation | S015 | SessionHistoryManager.loadSessionFromHistory |
| BR013 | Deleting the active session stops recording first | S015 | SessionHistoryManager.performDeleteSession |
| BR014 | Session titles auto-generated as "Spotkanie o HH:MM" (Polish locale) | S010 | SessionUtils.generateSessionTitle |
| BR015 | Session IDs follow format: `session_<timestamp>_<random9chars>` | S010 | SessionUtils.generateSessionId |

## Data Integrity Rules

| Rule ID | Rule | Source IDs | Enforced at |
|---------|------|------------|-------------|
| BR020 | Orphaned sessions (currentSessionId not in history) are auto-recreated | S011 | DataIntegrity.verifyStorageIntegrity |
| BR021 | Duplicate messages (same hash) are auto-deduplicated | S011 | DataIntegrity._deduplicateMessages |
| BR022 | Stale background scan data (>1 hour) is auto-cleaned | S011 | DataIntegrity.verifyStorageIntegrity |
| BR023 | Stale transaction markers (>5 minutes) are auto-cleaned | S005, S011 | TransactionCoordinator.recoverIncompleteTransactions |

## Transaction Rules

| Rule ID | Rule | Source IDs | Enforced at |
|---------|------|------------|-------------|
| BR030 | All multi-key writes use TransactionCoordinator (atomic) | S005 | TransactionCoordinator.executeTransaction |
| BR031 | Transaction timeout: 5 seconds (configurable via TIMING) | S005, S006 | TransactionCoordinator._executeWithTimeout |
| BR032 | Failed transactions trigger automatic rollback to pre-write state | S005 | TransactionCoordinator._rollback |
| BR033 | Transaction verification: read-after-write to confirm persistence | S005 | TransactionCoordinator._verifyTransaction |
| BR034 | Critical transaction failures are logged to chrome.storage for debugging | S005 | TransactionCoordinator._logCriticalFailure |

## Merge Queue Rules

| Rule ID | Rule | Source IDs | Enforced at |
|---------|------|------------|-------------|
| BR040 | Merge operations are serialized (no concurrent merges) | S014 | BackgroundScanner._processMergeQueue |
| BR041 | Priority: restoration=100, manual=10, background=1 | S014 | BackgroundScanner.scheduleMerge |
| BR042 | Queue max size: 50 operations (oldest low-priority dropped) | S014, S006 | BackgroundScanner.scheduleMerge |
| BR043 | Failed merges retry up to 3 times with decreased priority | S014 | BackgroundScanner._processMergeQueue |
| BR044 | Empty scan results are ignored when existing data exists (CC closed protection) | S014 | BackgroundScanner._performMerge |

## State Restoration Rules

| Rule ID | Rule | Source IDs | Enforced at |
|---------|------|------------|-------------|
| BR050 | Restoration priority: active recording > paused > historical > none | S001 | StateManager.restoreStateFromStorage |
| BR051 | Invalid recordingStartTime is regenerated from totalDuration or sessionStartTime | S001 | StateManager._restoreRecordingStartTime |
| BR052 | Restoration flag blocks auto-save until sessionHistory loads (max 10s) | S001 | StateManager.restoreStateFromStorage (finally block) |
| BR053 | Emergency fallback: expose globals + set light theme on critical failure | popup.js | applyEmergencyFallback |
| BR054 | Popup close during recording flushes pending data before unload | S014 | BackgroundScanner.flushPendingData (beforeunload) |

## Content Script Rules

| Rule ID | Rule | Source IDs | Enforced at |
|---------|------|------------|-------------|
| BR060 | User display name "Ty" is replaced with configured display name | content.js | scrapeTranscript |
| BR061 | Language selection menu text is filtered out of transcripts | S055 | isLanguageSelectionText |
| BR062 | Transcript text is sanitized (emojis, UI fragments, language artifacts removed) | S057 | sanitizeTranscriptText |
| BR063 | Caption auto-enable retries once after 250ms if first attempt fails | S059 | enableCaptionsIfNeeded |

## Background Scanner Rules

| Rule ID | Rule | Source IDs | Enforced at |
|---------|------|------------|-------------|
| BR070 | Scanning interval: 3 seconds, runs in content script (immune to SW termination) | S081 | content.js startScanning |
| BR071 | Checkpoints created every 10 scans, max 3 kept | S083, S084 | content.js _createCheckpoint, _cleanupOldCheckpoints |
| BR072 | Scanning auto-resumes on tab refresh via persisted scanningState in storage | S085 | content.js _autoResumeScanning |
| BR073 | Scanning stops only when explicitly stopped or tab is closed entirely | S082 | content.js stopScanning |
| BR074 | Accumulated data max age: 1 hour (older data rejected) | S014 | BackgroundScanner._MAX_DATA_AGE |
| BR075 | Data recovery tries: primary key → checkpoints → URL match | S014 | BackgroundScanner.retrieveAccumulatedScanData |
| BR076 | Background updates received before realtimeMode are queued (max 20), drained on reactivation | S089 | BackgroundScanner.processPendingUpdates |
| BR077 | Transient scan errors do NOT stop the scanning loop (content script stays alive) | S081 | content.js startScanning interval |
| BR078 | Service worker is a thin relay only — forwards start/stop/status to content script | S087, S088 | background.js message handler |

## Search & Filter Rules

| Rule ID | Rule | Source IDs | Enforced at |
|---------|------|------------|-------------|
| BR080 | Search debounce: 300ms | S020 | SearchFilterManager.handleSearchInput |
| BR081 | New participants auto-selected during recording | S020 | SearchFilterManager.updateParticipantFiltersList |
| BR082 | Filter state save debounce: 500ms | S020 | SearchFilterManager.saveFilterState |
| BR083 | Participant filters deferred until transcript data available | S020 | SearchFilterManager._pendingRestoreState |
| BR084 | saveUIState merges partial state with existing stored state (prevents field erasure) | S001 | StateManager.saveUIState |
| BR085 | Empty restored participant filters reset _hasBeenInitialized to allow auto-select-all recovery | S020 | SearchFilterManager.restoreFilterState |

## UI Rules

| Rule ID | Rule | Source IDs | Enforced at |
|---------|------|------------|-------------|
| BR090 | Theme persisted to localStorage (not chrome.storage) | S022 | ThemeManager.toggle |
| BR091 | Settings footer only visible when unsaved profile changes exist (prompts save independently) | S023 | SettingsManager.updateSettingsFooterVisibility |
| BR092 | Meeting name editing cancels on ESC, saves on Enter | S003 | UIManager.startMeetingNameEdit |
| BR093 | Success status messages auto-clear after 3 seconds | S003 | UIManager.updateStatus |

## Multi-Prompt Rules

| Rule ID | Rule | Source IDs | Enforced at |
|---------|------|------------|-------------|
| BR100 | Built-in prompt (displayed as "Podsumowanie (systemowy)") cannot be edited or deleted | S098, S099 | SettingsManager.updatePrompt, deletePrompt |
| BR101 | Only one prompt can be marked as default at a time | S100 | SettingsManager.setDefaultPrompt |
| BR102 | If default prompt is deleted, built-in becomes default | S099 | SettingsManager.deletePrompt |
| BR103 | Prompt titles must be unique (case-insensitive) | S097, S098, S102 | SettingsManager._handlePromptFormSave |
| BR104 | On first load, old useDefaultPrompt/customPrompt migrated to promptsList | S092 | SettingsManager.loadPrompts |
| BR105 | Export prompt selector shown only when >1 prompts AND LLM checkbox checked | S103 | ExportManager.updatePromptSelectorVisibility |
| BR106 | Export prompt selector defaults to prompt marked as default | S103, S104 | ExportManager.updatePromptSelectorVisibility, getSelectedExportPrompt |
| BR107 | Prompt form actions (Anuluj/Zapisz) live outside scroll container, visibility synced with form | S101, S102 | SettingsManager.renderPromptList, showPromptForm |
