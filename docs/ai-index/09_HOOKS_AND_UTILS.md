# Hooks & Utilities

Note: This project uses vanilla JS — no React hooks. This file documents utility modules and their functions. All modules are exposed as singletons on the `window` object.

## Utility Modules (window.* singletons)

| ID | Name | File | Methods Count | Used by (primary consumers) |
|----|------|------|---------------|---------------------------|
| S006 | AppConstants | js/utils/constants.js | 0 (config object) | StateManager, StorageManager, TransactionCoordinator, BackgroundScanner, Recording, SessionHistory, Transcript, TranscriptRefresh, DataIntegrity |
| S007 | Formatters | js/utils/formatters.js | 9 | TimerManager, UIManager, SessionUtils |
| S008 | DOMHelpers | js/utils/dom-helpers.js | 12 | TranscriptManager, SessionUIManager |
| S009 | GoogleUserDetector | js/utils/google-user-detector.js | 14 | content.js (auto-initializes on Google Meet pages) |
| S010 | SessionUtils | js/utils/session-utils.js | 4 | StateManager, Recording, SessionHistory, DataIntegrity, popup.js |
| S011 | DataIntegrity | js/utils/data-integrity.js | 3 (+3 private) | popup.js (initialization) |
| S012 | DebugManager | js/utils/debug-manager.js | 6 | popup.js (initialization), browser console (manual invocation) |

---

### Detail: S006 — AppConstants

- **Methods**: None (pure configuration object with nested constant groups)
- **Internal state**: Immutable constant objects — TIMING, STORAGE_KEYS, APP_STATES, SESSION_STATES, EXPORT_FORMATS, THEMES, LOG_LEVELS, DEBUG_CONFIG
- **Side effects**: None
- **Pure functions**: N/A (no functions, only data)
- **Error handling**: N/A

**Constant Groups:**

| Group | Key Count | Purpose |
|-------|-----------|---------|
| TIMING | 8 | Interval/delay/timeout values (ms) for polling, debounce, animations, transactions |
| STORAGE_KEYS | 20 | Chrome storage key names for all persisted data |
| APP_STATES | 3 | Recording state machine values: recording, stopped, paused |
| SESSION_STATES | 4 | Popup restoration states: active_recording, paused_session, historical_session, new_session |
| EXPORT_FORMATS | 1 | Export format types: txt |
| THEMES | 3 | Theme options: light, dark, auto |
| LOG_LEVELS | 4 | Debug log levels: error, warn, info, debug |
| DEBUG_CONFIG | 2 | Global console.log control flags with per-level enable/disable |

---

### Detail: S007 — Formatters

- **Methods**: 9 public methods (see table below)
- **Internal state**: None
- **Side effects**: `escapeHtml` creates a temporary DOM element (`document.createElement('div')`)
- **Pure functions**: formatDuration, formatTimestamp, formatSessionDate, formatSessionTime, formatFileSize, formatSpeakerName, formatTranscriptText, truncateText
- **Error handling**: Null/falsy guards on all methods; returns safe defaults ('', 'Nieznany', original input)

---

### Detail: S008 — DOMHelpers

- **Methods**: 12 public methods (see table below)
- **Internal state**: `MESSAGE_TRUNCATE_LENGTH` module-level constant (200); reads/writes `window.expandedEntries` (Set)
- **Side effects**: Extensive DOM manipulation — creates elements, modifies classList, sets inline styles, appends child nodes, adds event listeners, injects `<style>` tag for ripple animation, calls `window.saveExpandedState()`
- **Pure functions**: `getInitials`
- **Error handling**: Null guards on element parameters; graceful no-op on missing elements

---

### Detail: S009 — GoogleUserDetector

- **Methods**: 14 public/internal methods (see table below)
- **Internal state**:
  - `config`: { maxRetries: 10, retryInterval: 3000, debugMode: true }
  - `state`: { detectionAttempts, lastDetectedName, isDetecting, retryTimer }
  - `fallbackSelectors`: Array of 4 CSS selectors for Google account UI elements
  - `_googleServiceTerms`: Array of 14 service identifier strings
  - `_commonUITerms`: Array of 11 UI term strings
- **Side effects**: DOM queries (querySelectorAll on script tags and UI elements), setInterval/clearInterval for retry mechanism, chrome.runtime.sendMessage for cross-script communication
- **Pure functions**: `_isValidName`, `_looksLikeName`, `_isValidScriptName`, `cleanUserName`, `_extractDsNumber`
- **Error handling**: Try/catch in all detection methods; logs errors via internal `log()` method; returns null on detection failure

---

### Detail: S010 — SessionUtils

- **Methods**: 4 public methods (see table below)
- **Internal state**: None
- **Side effects**: None (pure utility)
- **Pure functions**: All methods are pure — generateSessionId (uses Date.now() + Math.random()), generateSessionTitle, generateSessionTitleForDate, isValidSessionId
- **Error handling**: Null/type guards in `isValidSessionId`; fallback formatting in `generateSessionTitleForDate` when Formatters unavailable

---

### Detail: S011 — DataIntegrity

- **Methods**: 3 public + 3 private methods (see table below)
- **Internal state**: None (stateless; queries storage on each call)
- **Side effects**: Reads/writes Chrome storage via StorageManager and chrome.storage.local; modifies sessionHistory array; mutates transcriptData.messages array
- **Pure functions**: None (all methods interact with storage)
- **Error handling**: Top-level try/catch in `verifyStorageIntegrity` (returns empty array on failure); per-issue try/catch in `autoFixIssues` (records FAILED status); console.error logging on all failures

**Integrity Checks Performed:**

| Check | Type | Severity | Auto-fix Strategy |
|-------|------|----------|-------------------|
| Orphaned session | currentSessionId not in sessionHistory | HIGH | Recreate session entry in history |
| Duplicate messages | Same hash in transcriptData.messages | MEDIUM | Deduplicate keeping first occurrence |
| Orphaned scans | Stale backgroundScan_/checkpoint_ keys (>1h) | LOW | Remove stale keys from storage |
| Stale transactions | __transaction_ markers older than 5 minutes | LOW | Remove via StorageManager |

---

### Detail: S012 — DebugManager

- **Methods**: 6 public methods (see table below)
- **Internal state**: None (inspects other modules' state)
- **Side effects**: Extensive console.log/console.error output; sets global aliases on `window` (debugState, testSessionLoading, testStatePersistence); calls StateManager.saveUIState and StateManager.restoreStateFromStorage during persistence tests; calls SessionHistoryManager.loadSessionFromHistory during session loading tests
- **Pure functions**: None (all methods produce side effects via console or state inspection)
- **Error handling**: Try/catch in `testSessionLoading` and `testStatePersistence`; returns boolean success/failure indicators; checks for module availability before calling methods

---

## Utility Functions (detailed)

### S006 — AppConstants

No callable functions. Provides structured constant objects accessed via property lookup.

| Sub-ID | Module | Property | Type | Description |
|--------|--------|----------|------|-------------|
| S006.1 | AppConstants | TIMING | Object | Timing constants: intervals, delays, timeouts (8 keys) |
| S006.2 | AppConstants | STORAGE_KEYS | Object | Chrome storage key name strings (20 keys) |
| S006.3 | AppConstants | APP_STATES | Object | Recording state enum: recording, stopped, paused |
| S006.4 | AppConstants | SESSION_STATES | Object | Popup restoration state enum (4 values) |
| S006.5 | AppConstants | EXPORT_FORMATS | Object | Export format enum: txt |
| S006.6 | AppConstants | THEMES | Object | Theme enum: light, dark, auto |
| S006.7 | AppConstants | LOG_LEVELS | Object | Log level enum: error, warn, info, debug |
| S006.8 | AppConstants | DEBUG_CONFIG | Object | Console logging control flags |

---

### S007 — Formatters

| Sub-ID | Module | Function Name | Signature | Pure | Description |
|--------|--------|---------------|-----------|------|-------------|
| S007.1 | Formatters | formatDuration | (seconds: number) -> string | Yes | Formats seconds to "H:MM:SS" or "M:SS" display string |
| S007.2 | Formatters | formatTimestamp | (date: Date) -> string | Yes | Formats Date to pl-PL locale string with full date+time |
| S007.3 | Formatters | formatSessionDate | (date: Date) -> string | Yes | Formats Date to pl-PL date-only string (DD.MM.YYYY) |
| S007.4 | Formatters | formatSessionTime | (date: Date) -> string | Yes | Formats Date to pl-PL time string (HH:MM) |
| S007.5 | Formatters | formatFileSize | (bytes: number) -> string | Yes | Formats bytes to human-readable size (B/KB/MB/GB) |
| S007.6 | Formatters | formatSpeakerName | (speaker: string) -> string | Yes | Trims speaker name; returns "Nieznany" for empty/invalid |
| S007.7 | Formatters | formatTranscriptText | (text: string) -> string | Yes | Trims transcript text; returns empty string for invalid |
| S007.8 | Formatters | escapeHtml | (text: string) -> string | No* | Escapes HTML entities using DOM textContent/innerHTML trick |
| S007.9 | Formatters | truncateText | (text: string, maxLength?: number=100) -> string | Yes | Truncates text to maxLength with "..." ellipsis |

\* `escapeHtml` creates a temporary DOM element but has no observable side effects beyond that.

---

### S008 — DOMHelpers

| Sub-ID | Module | Function Name | Signature | Pure | Description |
|--------|--------|---------------|-----------|------|-------------|
| S008.1 | DOMHelpers | addButtonLoadingState | (button: HTMLElement) -> void | No | Adds "loading" class, disables button, saves original text, sets text to "Ladowanie..." |
| S008.2 | DOMHelpers | removeButtonLoadingState | (button: HTMLElement) -> void | No | Removes "loading" class, re-enables button, restores original text |
| S008.3 | DOMHelpers | addRippleEffect | (button: HTMLElement) -> void | No | Attaches click listener for Material-style ripple animation; injects CSS keyframes |
| S008.4 | DOMHelpers | initializeEnhancedInteractions | () -> void | No | Applies ripple effects to all .btn/.record-button elements; hover effects to avatars; smooth scroll to transcript container |
| S008.5 | DOMHelpers | reinitializeEnhancedInteractions | () -> void | No | Applies ripple/hover effects only to newly created elements (without data-ripple/data-hover) |
| S008.6 | DOMHelpers | addAvatarHoverEffect | (avatar: HTMLElement) -> void | No | Attaches mouseenter/mouseleave listeners for scale transform on avatar elements |
| S008.7 | DOMHelpers | _renderExpandableText | (textDiv: HTMLElement, hash: string, fullText: string, isExpanded: boolean) -> void | No | Renders expandable/collapsible text with toggle button; attaches click handler |
| S008.8 | DOMHelpers | createMessageElement | (entry: Object, speakerColors: Object) -> HTMLElement | No | Creates full transcript entry DOM element with avatar, speaker name, timestamp, expandable text |
| S008.9 | DOMHelpers | updateMessageElement | (element: HTMLElement, message: Object, speakerColors: Object) -> void | No | Updates existing transcript entry DOM element with new data |
| S008.10 | DOMHelpers | toggleMessageExpansion | (hash: string, textDiv: HTMLElement, fullText: string) -> void | No | Toggles expand/collapse state in window.expandedEntries Set; re-renders text; calls window.saveExpandedState() |
| S008.11 | DOMHelpers | getInitials | (name: string) -> string | Yes | Extracts up to 2 uppercase initials from a name; returns "?" for empty |
| S008.12 | DOMHelpers | smoothScrollIntoView | (element: HTMLElement, options?: Object) -> void | No | Scrolls element into view with smooth animation behavior |

---

### S009 — GoogleUserDetector

| Sub-ID | Module | Function Name | Signature | Pure | Description |
|--------|--------|---------------|-----------|------|-------------|
| S009.1 | GoogleUserDetector | _isValidName | (candidate: string) -> boolean | Yes | Validates candidate string as a plausible human name (length, charset, no URLs/service terms) |
| S009.2 | GoogleUserDetector | _looksLikeName | (str: string) -> boolean | Yes | Checks if string matches proper capitalization pattern (supports Polish characters) |
| S009.3 | GoogleUserDetector | _isValidScriptName | (candidate: string) -> boolean | Yes | Extended validation: calls _isValidName + rejects technical identifiers |
| S009.4 | GoogleUserDetector | detectFromScriptTags | () -> string\|null | No | Scans AF_initDataCallback script tags (ds: class priority) for user name data |
| S009.5 | GoogleUserDetector | _extractDsNumber | (className: string) -> number | Yes | Extracts numeric value from "ds:N" class name for sorting |
| S009.6 | GoogleUserDetector | _parseAFInitDataCallback | (scriptContent: string) -> string\|null | No | Parses AF_initDataCallback JSON payload to extract user name from data array |
| S009.7 | GoogleUserDetector | _extractCompleteJsonArray | (scriptContent: string, startIndex: number) -> string\|null | Yes | Extracts complete JSON array from script content using bracket counting |
| S009.8 | GoogleUserDetector | _extractNameDirectlyFromScript | (scriptContent: string) -> string\|null | No | Fallback regex-based name extraction from script content (3 pattern strategies) |
| S009.9 | GoogleUserDetector | detect | () -> string\|null | No | Main detection: tries script tags first, then DOM fallback; updates state; sends notification |
| S009.10 | GoogleUserDetector | detectFromDOM | () -> string\|null | No | Queries fallback CSS selectors for Google account UI elements |
| S009.11 | GoogleUserDetector | cleanUserName | (name: string) -> string\|null | Yes | Strips prefixes (Google Account:, Konto Google:), removes email suffixes, normalizes whitespace |
| S009.12 | GoogleUserDetector | startContinuousDetection | () -> string\|null | No | Starts interval-based retry detection (max 10 retries, 3s interval) |
| S009.13 | GoogleUserDetector | stopContinuousDetection | () -> void | No | Clears retry interval timer and resets isDetecting flag |
| S009.14 | GoogleUserDetector | manualDetect | () -> string\|null | No | Resets attempt counter and runs single detect() call |
| S009.15 | GoogleUserDetector | notifyUserNameDetected | (userName: string) -> void | No | Sends chrome.runtime.sendMessage with action "updateGoogleUserName" |
| S009.16 | GoogleUserDetector | getDebugInfo | () -> Object | Yes | Returns snapshot of config, state, selector count, page URL, timestamp |
| S009.17 | GoogleUserDetector | log | (message: string) -> void | No | Conditional console.log with [GOOGLE_DETECTOR] prefix (when debugMode=true) |
| S009.18 | GoogleUserDetector | initialize | () -> void | No | Logs init; schedules startContinuousDetection after page load (1s delay) |

---

### S010 — SessionUtils

| Sub-ID | Module | Function Name | Signature | Pure | Description |
|--------|--------|---------------|-----------|------|-------------|
| S010.1 | SessionUtils | generateSessionId | () -> string | Yes* | Generates unique ID: "session_{timestamp}_{random9chars}" |
| S010.2 | SessionUtils | generateSessionTitle | () -> string | No | Generates title for current time via generateSessionTitleForDate(new Date()) |
| S010.3 | SessionUtils | generateSessionTitleForDate | (date: Date) -> string | Yes | Generates localized title: "Spotkanie o {HH:MM}" using Formatters fallback |
| S010.4 | SessionUtils | isValidSessionId | (sessionId: string) -> boolean | Yes | Regex validates format: /^session_\d+_[a-z0-9]+$/ |

\* Uses Date.now() and Math.random() — deterministic in signature but non-deterministic in output.

---

### S011 — DataIntegrity

| Sub-ID | Module | Function Name | Signature | Pure | Description |
|--------|--------|---------------|-----------|------|-------------|
| S011.1 | DataIntegrity | verifyStorageIntegrity | () -> Promise<Array<Object>> | No | Runs 4 integrity checks on storage data; returns array of issue objects with autoFix callbacks |
| S011.2 | DataIntegrity | autoFixIssues | (issues: Array<Object>) -> Promise<Array<Object>> | No | Executes autoFix callback for each issue; returns array of {type, status, severity} results |
| S011.3 | DataIntegrity | initialize | () -> void | No | Logs initialization message |
| S011.4 | DataIntegrity | _recreateSessionInHistory | (data: Object) -> Promise<void> | No | (Private) Creates missing session entry in sessionHistory and persists to storage |
| S011.5 | DataIntegrity | _deduplicateMessages | (transcriptData: Object) -> Promise<void> | No | (Private) Removes duplicate messages by hash, keeping first occurrence |
| S011.6 | DataIntegrity | _cleanupOrphanedScans | (keys: Array<string>) -> Promise<void> | No | (Private) Removes stale background scan keys from chrome.storage.local |

---

### S012 — DebugManager

| Sub-ID | Module | Function Name | Signature | Pure | Description |
|--------|--------|---------------|-----------|------|-------------|
| S012.1 | DebugManager | initialize | () -> void | No | Logs init; calls setupGlobalAliases to bind debug functions to window |
| S012.2 | DebugManager | setupGlobalAliases | () -> void | No | Binds debugState, testSessionLoading, testStatePersistence to window for console access |
| S012.3 | DebugManager | debugState | () -> Object | No | Logs comprehensive application state snapshot (globals, UI, modules, functions); returns summary object |
| S012.4 | DebugManager | testSessionLoading | (sessionId: string) -> boolean | No | Tests loading a specific session by ID via SessionHistoryManager; returns success boolean |
| S012.5 | DebugManager | testStatePersistence | () -> Promise<boolean> | No | Tests save/restore cycle via StateManager; compares before/after state; returns match boolean |
| S012.6 | DebugManager | testModule | (moduleName: string) -> boolean | No | Checks if a specific window module exists and lists its methods; returns availability boolean |
| S012.7 | DebugManager | testAllModules | () -> Object | No | Checks availability of all 15 expected modules; returns { moduleName: boolean } map |

---

## Cross-Module Dependencies

```
AppConstants (S006)
  <- StateManager, StorageManager, TransactionCoordinator
  <- BackgroundScanner, Recording, SessionHistory
  <- Transcript, TranscriptRefresh, DataIntegrity

Formatters (S007)
  <- TimerManager (formatDuration)
  <- UIManager (formatTimestamp, formatSessionDate)
  <- SessionUtils (formatSessionTime)

DOMHelpers (S008)
  <- TranscriptManager (createMessageElement, updateMessageElement, toggleMessageExpansion, reinitializeEnhancedInteractions)
  <- SessionUIManager (getInitials)

GoogleUserDetector (S009)
  <- content.js (auto-init on meet.google.com)

SessionUtils (S010)
  <- StateManager (generateSessionId)
  <- Recording (generateSessionId, generateSessionTitle)
  <- SessionHistory (generateSessionId, isValidSessionId)
  <- DataIntegrity (generateSessionTitle - via window.generateSessionTitle)
  <- popup.js (generateSessionId)

DataIntegrity (S011)
  -> StorageManager (reads/writes storage)
  -> AppConstants (STORAGE_KEYS)
  <- popup.js (verifyStorageIntegrity, autoFixIssues at init)

DebugManager (S012)
  -> StateManager (save/restore state in tests)
  -> SessionHistoryManager (loadSessionFromHistory in tests)
  <- popup.js (initialize at startup)
  <- Browser console (manual invocation via window.debugState, etc.)
```
