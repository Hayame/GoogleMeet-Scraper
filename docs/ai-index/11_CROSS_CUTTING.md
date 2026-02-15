# Cross-Cutting Concerns

## Error Handling

### Global Strategy
- **Global error handler** (`popup.js` L412-414): `window.addEventListener('error', ...)` catches uncaught exceptions, logs with `console.error('... [GLOBAL ERROR]', event.error)`
- **Unhandled promise rejection handler** (`popup.js` L416-418): `window.addEventListener('unhandledrejection', ...)` catches async failures
- Both handlers are logging-only (no recovery action) -- they serve as diagnostic safety nets

### Module-Level
- **try/catch wrapping**: All async operations in S001 (StateManager), S002 (StorageManager), S005 (TransactionCoordinator), S014 (BackgroundScanner), S013 (RecordingManager) wrap critical paths in try/catch
- **Pattern**: Catch block logs with emoji-prefixed `console.error()`, then either returns a fallback value or re-throws
- **TransactionCoordinator (S005)**: On failure, attempts rollback before returning `{ success: false, error }`. If rollback also fails, logs via `_logCriticalFailure()` to `chrome.storage.local` under key `__transaction_failure_log`
- **BackgroundScanner (S014)**: Merge queue implements retry logic (max 3 retries per operation) with priority demotion on each retry. After exhausting retries, the operation is dropped with a `console.error` log

### User-Facing Errors
- **Status bar updates**: Modules call `window.UIManager.updateStatus(message, 'error')` or `window.updateStatus?.(message, 'error')` to display localized Polish error messages to the user
- **Initialization error overlay** (`popup.js` L377-399): `showInitializationError()` creates a fixed-position red error div with the error message, displayed when `DOMContentLoaded` initialization fails
- **Modal error feedback**: Export operations show error status via `UIManager.updateStatus('Brak danych do eksportu', 'error')` (S021)

### Recovery & Fallback
- **Emergency fallback** (`popup.js` L155-161): `applyEmergencyFallback()` exposes global variables and sets default light theme when complete state restoration fails
- **Layered state restoration** (S001): `restoreStateFromStorage()` tries restoration paths in priority order: active recording > paused session > historical session > no state
- **Recording start time regeneration** (S001): `_restoreRecordingStartTime()` attempts fallback regeneration from `sessionTotalDuration` or `sessionStartTime` if the stored timestamp is invalid
- **Session ID regeneration** (S001): If `currentSessionId` is missing during active recording restoration, a new one is generated and persisted
- **Background scanner multi-path recovery** (S014): `retrieveAccumulatedScanData()` tries primary key > checkpoints > meeting URL match to recover data
- **Crash recovery** (S005): `recoverIncompleteTransactions()` runs at initialization, cleaning up transaction markers older than 5 minutes

## Communication Patterns

### Chrome Extension Messaging

| Message Type | Sender | Receiver | Payload | Response |
|---|---|---|---|---|
| `scrapeTranscript` | background.js / popup (via BackgroundScanner) | content.js | `{ action }` | `{ success, data: { messages[], scrapedAt, meetingUrl } }` |
| `startBackgroundScanning` | popup (RecordingManager S013) | background.js | `{ action, tabId }` | `{ success: true }` |
| `stopBackgroundScanning` | popup (RecordingManager S013) | background.js | `{ action }` | `{ success: true }` |
| `getScanningStatus` | popup | background.js | `{ action }` | `{ isScanning, tabId }` |
| `backgroundScanUpdate` | background.js | popup (BackgroundScanner S014) | `{ action, data }` | none (fire-and-forget) |
| `updateGoogleUserName` | content.js > background.js | popup | `{ action, userName }` | `{ success: true }` |
| `updateUserDisplayName` | popup | content.js | `{ action, displayName }` | `{ success: true }` |
| `manualDetectGoogleName` | popup | content.js | `{ action }` | `{ success, userName }` or `{ success: false, error, debug }` |
| `enableCaptions` | popup (RecordingManager S013) | content.js | `{ action }` | `{ success, alreadyEnabled?, toggled?, error? }` |

### Inter-Module Communication
- **Pattern**: Window globals (`window.ModuleName = {...}`) -- all modules export to `window` object
- **Global function aliases**: Several modules create backward-compatible aliases (e.g., `window.deactivateRealtimeMode`, `window.activateRealtimeMode`, `window.showModal`, `window.hideModal`, `window.detectChanges`, `window.debugState`, `window.storageGet/Set/Remove`)
- **State coordination**: Centralized via S001 (StateManager) getter/setter methods. Modules read/write shared state through `window.StateManager.getX()` / `window.StateManager.setX()`. Legacy direct access via `window.transcriptData`, `window.realtimeMode`, `window.currentSessionId` preserved for backward compatibility
- **Optional chaining invocations**: Modules call each other via `window.ModuleName?.method()` pattern to handle cases where optional modules may not be loaded
- **Event listeners**: Background scan updates are received via `chrome.runtime.onMessage` listener registered in `BackgroundScanner.initializeMessageListener()` (S014)

## Logging & Debugging

### Debug Toggle
- **S080 `DEBUG_ENABLED`** (`debug-config.js`): Global boolean flag (currently `false`). When disabled, replaces `console.log`, `console.debug`, and `console.info` with no-op functions. `console.warn` and `console.error` remain active for critical issues
- **Loading priority**: `debug-config.js` is loaded FIRST in all contexts (popup.html, background.js via `importScripts`, content.js is separate)
- **Scope**: Uses `globalThis` / `self` / `window` detection to work across service worker, content script, and popup contexts
- **Additional config** (S006): `AppConstants.DEBUG_CONFIG` provides granular `LOG_LEVELS` control (ERROR/WARN always on, INFO/DEBUG off by default)

### Log Prefixes (Emoji System)
| Prefix | Context |
|---|---|
| `[INIT]` | Application initialization |
| `[STATE]` | StateManager operations (S001) |
| `[STORAGE]` | StorageManager operations (S002) |
| `[TRANSACTION]` | TransactionCoordinator (S005) |
| `[INTEGRITY]` | DataIntegrity verification (S011) |
| `[RECORDING]` | RecordingManager (S013) |
| `[ACTIVATION]` | Recording activation flow |
| `[SCANNER]` / `[BACKGROUND]` | BackgroundScanner (S014) |
| `[MERGE]` / `[MERGE QUEUE]` | Merge queue processing (S014) |
| `[REACTIVATE]` | Scanner reactivation after popup reopen |
| `[RETRIEVE]` | Accumulated data retrieval |
| `[RESTORE]` | State restoration |
| `[MODAL]` | ModalManager (S021) |
| `[CONTENT]` | Content script |
| `[CHECKPOINT]` | Checkpoint creation/cleanup |
| `[FLUSH]` | Data flush on popup close |
| `[CLEANUP]` | Background scan data cleanup |
| `[POPUP]` | Main popup orchestration |
| `[VALIDATION]` | State validation |
| `[UI STATE]` | UI state save/restore |
| `[DEBUG]` / `[TEST]` | DebugManager (S012) |
| `[CC DETECT]` / `[CC TOGGLE]` / `[CC ENABLE]` | Captions auto-enable |

### Debug Tools (S012 DebugManager)
- `window.debugState()`: Comprehensive state dump (global variables, UI state, module availability, global functions)
- `window.testSessionLoading(sessionId)`: Manual session loading test
- `window.testStatePersistence()`: Round-trip persistence test (save > restore > compare)
- `DebugManager.testModule(name)`: Single module availability and method enumeration
- `DebugManager.testAllModules()`: Batch availability check for all 15 expected modules

## Data Persistence

### Primary Storage
- **Engine**: `chrome.storage.local` -- all data stored locally on device, no external servers
- **Access layer**: S002 (StorageManager) wraps all `chrome.storage.local.get/set/remove` calls in Promise-based functions
- **Global aliases**: `window.storageGet`, `window.storageSet`, `window.storageRemove` created by S002 for convenience
- **Sync storage**: `chrome.storage.sync` used only for user settings (`userDisplayName`, `googleUserName`) in content.js

### Storage Key Inventory (S006 `STORAGE_KEYS`)
| Key | Purpose | Written By |
|---|---|---|
| `transcriptData` | Current transcript messages, scrapedAt, meetingUrl | S005, S014 |
| `realtimeMode` | Whether recording is active | S005, S013 |
| `currentSessionId` | Active session identifier | S001, S005 |
| `recordingStartTime` | ISO timestamp of recording start | S005, S013 |
| `sessionStartTime` | ISO timestamp of session start | S005, S013 |
| `sessionTotalDuration` | Accumulated duration in seconds | S002 |
| `currentSessionDuration` | Current recording segment duration | S002 |
| `meetTabId` | Chrome tab ID of Google Meet page | S005, S013, S014 |
| `sessionHistory` | Array of all saved sessions | S002, S011 |
| `expandedEntries` | Set of expanded transcript entry IDs | S002 |
| `theme` | UI theme (light/dark) | S001 |
| `sidebarCollapsed` | Sidebar collapse state | S001 |
| `searchPanelOpen` | [DEPRECATED — search is now inline] | S001 |
| `filterPanelOpen` | Filter panel visibility | S001 |
| `searchQuery` | Active search query text | S001 |
| `activeParticipantFilters` | Active participant filter list | S001 |
| `lastUIState` | Consolidated UI state object | S001 |
| `sessionState` | Session lifecycle state (active/paused/historical) | S002 |
| `recordingPaused` | Whether recording is paused | S002 |
| `recordingStopped` | Whether recording is stopped | S002 |

### Dynamic Storage Keys
| Pattern | Purpose | Created By |
|---|---|---|
| `backgroundScan_{tabId}` | Accumulated scan data per tab | background.js |
| `checkpoint_{tabId}_{timestamp}` | Periodic checkpoint backups | background.js |
| `__transaction_{txId}` | Transaction markers for crash recovery | S005 |
| `__transaction_failure_log` | Critical failure diagnostic log | S005 |

### Backup Strategy
- **Checkpoints**: Created every 10 background scans by `createCheckpoint()` in background.js. Stores full transcript data snapshot with timestamp and scan count
- **Checkpoint retention**: Last 3 checkpoints kept per tab via `cleanupOldCheckpoints()`
- **Multi-path recovery** (S014): Primary key > Checkpoint > Meeting URL match, with 1-hour maximum data age threshold (`_MAX_DATA_AGE: 3600000`)
- **Data flush on close**: `beforeunload` event triggers `BackgroundScanner.flushPendingData()` to merge any pending scan data before popup closes

### Transaction Safety (S005 TransactionCoordinator)
- **Atomic writes**: `executeTransaction()` reads current state for rollback, writes all keys in single `chrome.storage.local.set()`, then verifies write via read-back
- **Transaction markers**: `__transaction_{txId}` marker written with status `IN_PROGRESS` before the write, removed after successful verification
- **Rollback**: On failure, restores original values from pre-transaction snapshot
- **Timeout protection**: `_executeWithTimeout()` uses `Promise.race()` with configurable timeout (default 5000ms from S006 `TIMING.TRANSACTION_TIMEOUT`)
- **Crash recovery**: `recoverIncompleteTransactions()` runs at init, removes stale transaction markers older than 5 minutes (300000ms)
- **Convenience wrapper**: `saveRecordingState()` maps application state properties to storage keys and delegates to `executeTransaction()`

### Data Integrity (S011 DataIntegrity)
- **Verification checks**: Orphaned sessions (currentSessionId not in history), duplicate messages (by hash), orphaned background scans (>1 hour), stale transaction markers (>5 minutes)
- **Auto-fix**: Each detected issue carries an `autoFix` callback. `autoFixIssues()` iterates and executes fixes
- **Self-healing**: `_recreateSessionInHistory()` recovers orphaned sessions; `_deduplicateMessages()` removes duplicates by hash; `_cleanupOrphanedScans()` removes stale scan keys
- **Execution timing**: Runs after session history is loaded during initialization (popup.js L119-129)

## Initialization & Lifecycle

### Module Load Order (popup.html L479-511)
```
1. debug-config.js                         (S080 DEBUG_ENABLED)
2. js/utils/constants.js                   (S006 AppConstants)
3. js/core/transaction-coordinator.js      (S005 TransactionCoordinator)
4. js/core/storage-manager.js              (S002 StorageManager)
5. js/core/state-manager.js                (S001 StateManager)
6. js/core/ui-manager.js                   (S003 UIManager)
7. js/core/timer-manager.js                (S004 TimerManager)
8. js/utils/formatters.js
9. js/utils/dom-helpers.js
10. js/utils/data-integrity.js             (S011 DataIntegrity)
11. js/utils/session-utils.js
12. js/utils/debug-manager.js              (S012 DebugManager)
13. js/features/modal-manager.js           (S021 ModalManager)
14. js/features/settings-manager.js
15. js/features/theme-manager.js
16. js/features/recording.js               (S013 RecordingManager)
17. js/features/background-scanner.js      (S014 BackgroundScanner)
18. js/features/session-history.js
19. js/features/session-ui.js
20. js/features/transcript.js
21. js/features/export.js
22. js/features/search-filter.js
23. js/features/transcript-refresh.js
24. popup.js                               (Main orchestrator)
```

### Initialization Sequence (popup.js `initializeApplication()`)
```
1. TransactionCoordinator.initialize()     [REQUIRED - throws if missing]
   - Logs init, runs recoverIncompleteTransactions()
2. StorageManager.initialize()             [REQUIRED - throws if missing]
   - Logs init, creates global storage aliases
3. StateManager.initialize()               [REQUIRED - throws if missing]
   - Logs init, initializes global variables (no overwrites)
4. UIManager.initialize()                  [optional]
5. TimerManager.initialize()               [optional]
6. ModalManager.initialize()               [optional]
   - Sets up ESC/click/backdrop handlers, inits confirm & export modals
7. SettingsManager.initialize()            [optional, async]
8. BackgroundScanner.initialize()          [optional]
   - Registers chrome.runtime.onMessage listener
9. TranscriptRefreshManager.initialize()   [optional]
10. RecordingManager.initialize()          [optional]
    - Creates global aliases (deactivateRealtimeMode, activateRealtimeMode)
11. SessionHistoryManager.initialize()     [optional, async, paired with SessionUIManager]
12. SessionUIManager.initialize()          [optional, paired with SessionHistoryManager]
13. DataIntegrity.initialize()             [optional]
    - Runs verifyStorageIntegrity(), auto-fixes any issues found
14. TranscriptManager.initialize()         [optional]
15. SearchFilterManager.initialize()       [optional]
16. ExportManager.initialize()             [optional]
17. setupMainEventListeners()              [binds UI click handlers]
18. setupMessageListener()                 [binds chrome.runtime.onMessage]
19. ThemeManager.initialize()              [optional]
20. DebugManager.initialize()              [optional]
21. validateGlobalFunctions()              [throws if critical functions missing]
22. restoreCompleteApplicationState()      [async - restores session + UI state]
23. StateManager.validateStateRestoration() [validation logging]
```

### Dependency Validation
- **`requireModule(name)`** (`popup.js` L70-75): Throws `Error('${name} not found')` if `window[name]` is falsy. Used for TransactionCoordinator, StorageManager, StateManager
- **`initModule(name)`** (`popup.js` L80-86): Returns `false` if module not found, calls `.initialize()` if present. Used for all optional modules
- **`validateEssentialElements()`** (`popup.js` L57-65): Throws if DOM elements `recordBtn`, `recordingStatus`, `transcriptContent`, `transcriptStats` are missing
- **`validateGlobalFunctions()`** (`popup.js` L35-52): Throws if `displayTranscript`, `updateStats`, `detectChanges`, `showEmptySession`, `createNewSession` are not available as global functions

### Emergency Fallback
- **On initialization failure**: `showInitializationError()` renders a red overlay with error message
- **On state restoration failure**: `applyEmergencyFallback()` exposes global variables and sets default light theme
- **Layered recovery** (`restoreCompleteApplicationState()`): UI restoration failure falls back to default theme; session state restoration failure falls back to `exposeGlobalVariables()`; complete failure triggers emergency fallback
- **State restoration timeout** (S001): Polls for `sessionHistory` load with 500ms interval, forces flag clear after 10 seconds (S006 `TIMING.STATE_RESTORATION_MAX_WAIT`)

### Background Script Lifecycle (background.js)
- **Service Worker** (Manifest V3): Imports `debug-config.js` via `importScripts()`
- **`onInstalled`**: Injects content.js into all existing Google Meet tabs
- **`onClicked`**: Injects content.js into the clicked tab if on meet.google.com
- **`tabs.onRemoved`**: Stops background scanning if the scanned tab is closed
- **`tabs.onUpdated`**: Stops background scanning if the scanned tab starts loading (page refresh/navigation)

### Content Script Lifecycle (content.js)
- **Initialization**: Loads user settings from `chrome.storage.sync`, starts `detectMeetingStart()` polling
- **Meeting detection**: Polls every 2 seconds for caption buttons or transcript elements, stops after 5 minutes (300000ms)
- **Captions auto-enable**: Dispatches keyboard `c` key events, verifies toggle, retries once on failure

## Performance Patterns

| Pattern | Implementation | Location (Symbol IDs) |
|---|---|---|
| Priority merge queue | Sequential queue with priority sorting, prevents concurrent merges | S014 `_mergeQueue`, `_processMergeQueue()` |
| Queue size limit | Max 50 operations in merge queue (`MERGE_QUEUE_MAX_SIZE`), drops lowest priority when full | S014, S006 |
| Hash-based change detection | 32-bit hash per message (`speaker:text`), hash maps for O(1) lookups during diff | S014 `detectChanges()`, content.js `generateHash()` |
| Empty scan protection | Ignores empty scan results when existing data is present to prevent CC-closed data loss | S014 `_performMerge()` |
| Checkpoint rotation | Keeps only last 3 checkpoints per tab, cleans up older ones | background.js `cleanupOldCheckpoints()` |
| Transaction timeout | `Promise.race()` with 5-second timeout prevents indefinite hangs | S005 `_executeWithTimeout()` |
| Stale data cleanup | 1-hour threshold for scan data, 5-minute threshold for transaction markers | S005, S011, S014 |
| Selective DOM queries | CSS selectors target specific Google Meet UI elements to minimize DOM traversal | content.js |
| Event listener cleanup | Clone-and-replace pattern to remove old listeners before attaching new ones | S021 `showDeleteConfirmation()`, `initializeStopRecordingModalEventListeners()` |
| CSS class visibility override | `.search-results-hidden { display: none !important }` class toggle instead of inline styles to prevent other modules from overriding visibility during search results view | S105 `_setNormalViewVisibility()` |
| Conditional module loading | `initModule()` skips missing modules rather than failing | popup.js |
| Global variable protection | `initializeGlobalVariables()` only sets globals if `undefined`, preserves existing data | S001 |

## Concurrency & Timing

### Polling Intervals
| Interval | Duration | Purpose | Location |
|---|---|---|---|
| Background scanning | 3000ms (3s) | Content script scrapes transcript from Meet DOM | background.js `startBackgroundScanning()` |
| Duration timer | 1000ms (1s) | Updates recording duration display | S006 `TIMING.DURATION_UPDATE_INTERVAL`, S004 |
| Meeting start detection | 2000ms (2s) | Polls for captions availability on Meet page | content.js `detectMeetingStart()` |
| State restoration check | 500ms | Polls for sessionHistory load completion | S006 `TIMING.STATE_RESTORATION_CHECK_INTERVAL`, S001 |
| Captions toggle verify | 250ms | Wait for Google Meet UI update after key dispatch | content.js `enableCaptionsIfNeeded()` |

### Timeouts
| Timeout | Duration | Purpose | Location |
|---|---|---|---|
| Transaction timeout | 5000ms (5s) | Prevents storage write hangs | S006 `TIMING.TRANSACTION_TIMEOUT`, S005 |
| State restoration max wait | 10000ms (10s) | Forces restoration flag clear | S006 `TIMING.STATE_RESTORATION_MAX_WAIT`, S001 |
| Meeting detection timeout | 300000ms (5min) | Stops polling if no meeting found | content.js `detectMeetingStart()` |
| Stale transaction threshold | 300000ms (5min) | Cleanup incomplete transaction markers | S005, S011 |
| Orphaned scan threshold | 3600000ms (1h) | Cleanup stale background scan data | S011, S014 `_MAX_DATA_AGE` |
| Session save delay | 2000ms (2s) | Prevents rapid consecutive saves | S006 `TIMING.SESSION_SAVE_DELAY` |
| Modal action delay | 200ms | Visual feedback before modal close | S021 `initializeResumeModalEventListeners()` |
| Session load after stop | 100ms | Allows recording to stop before loading new session | S021 `handleStopRecordingConfirmation()` |

### Debouncing
| Pattern | Delay | Location |
|---|---|---|
| General user interactions | 300ms | S006 `TIMING.DEBOUNCE_DELAY` |
| Search query | Uses `searchDebounceTimer` in S001 state | S001 (state variable declaration) |

### Race Condition Prevention
| Strategy | Implementation | Location |
|---|---|---|
| Merge queue mutex | `_isMerging` flag ensures sequential merge processing, no concurrent merges | S014 `_processMergeQueue()` |
| Restoration lock | `isRestorationInProgress` flag prevents concurrent state restorations | S001 |
| Transaction markers | `__transaction_{txId}` markers track in-flight operations for crash detection | S005 |
| Active transaction tracking | `_activeTransactions` Map tracks all in-progress transactions by ID | S005 |
| Global variable protection | `initializeGlobalVariables()` checks `=== undefined` before setting, never overwrites | S001 |
| Session history preservation | `exposeGlobalVariables()` preserves existing `window.sessionHistory` if non-empty | S001 |
| Storage-first deactivation | `deactivateRealtimeMode()` reads latest state from storage before clearing, takes the larger message set | S013 |
| Single scan prevention | `startBackgroundScanning()` calls `stopBackgroundScanning()` first if already scanning | background.js |
| Retry with backoff | `startBackgroundScanningWithRetry()` tries 3 times with 1-second delays | S014 |
| Merge retry with demotion | Failed merges are re-queued with lowered priority (up to 3 retries) | S014 `_processMergeQueue()` |
