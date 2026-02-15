# Symbol Registry

## Taxonomy Reference
See taxonomy-frontend.md for full type code definitions.

## Registry — Popup Modules (window.* globals)

| ID | Symbol Name | Type | File Path | Line | Exported | Description |
|----|-------------|------|-----------|------|----------|-------------|
| S001 | StateManager | SRV | js/core/state-manager.js | 561 | yes (window) | Global state management, storage restoration, UI state persistence (saveUIState merges partial state) |
| S002 | StorageManager | SRV | js/core/storage-manager.js | 120 | yes (window) | Chrome storage CRUD operations wrapper |
| S003 | UIManager | SRV | js/core/ui-manager.js | 6 | yes (window) | Button visibility (data-dependent: export/clear/stats/quickCopy hidden when no transcript), status messages, sidebar toggle, meeting name editing |
| S004 | TimerManager | SRV | js/core/timer-manager.js | 6 | yes (window) | Duration tracking based on recordingStartTime, periodic persistence |
| S005 | TransactionCoordinator | SRV | js/core/transaction-coordinator.js | 6 | yes (window) | Atomic multi-key storage writes with rollback, verification, crash recovery |
| S006 | AppConstants | CNS | js/utils/constants.js | 90 | yes (window) | TIMING, STORAGE_KEYS, APP_STATES, SESSION_STATES, EXPORT_FORMATS, THEMES |
| S007 | Formatters | UTL | js/utils/formatters.js | 5 | yes (window) | formatDuration, formatTimestamp, formatSessionDate/Time, escapeHtml, truncateText |
| S008 | DOMHelpers | UTL | js/utils/dom-helpers.js | 8 | yes (window) | createMessageElement, toggleMessageExpansion, getInitials, ripple effects |
| S009 | GoogleUserDetector | SRV | js/utils/google-user-detector.js | 6 | yes (window) | Google account name detection via script tags and DOM selectors |
| S010 | SessionUtils | UTL | js/utils/session-utils.js | 5 | yes (window) | generateSessionId, generateSessionTitle, isValidSessionId |
| S011 | DataIntegrity | SRV | js/utils/data-integrity.js | 6 | yes (window) | Storage integrity verification: orphaned sessions, duplicates, stale data |
| S012 | DebugManager | UTL | js/utils/debug-manager.js | 5 | yes (window) | debugState, testSessionLoading, testStatePersistence, testAllModules |
| S013 | RecordingManager | SRV | js/features/recording.js | 6 | yes (window) | Recording start/stop, auto-enable captions, state persistence |
| S014 | BackgroundScanner | SRV | js/features/background-scanner.js | 6 | yes (window) | Priority merge queue, accumulated data recovery, background scan coordination |
| S015 | SessionHistoryManager | SRV | js/features/session-history.js | 6 | yes (window) | Session CRUD, auto-save, load/delete with confirmation dialogs |
| S016 | SessionUIManager | SRV | js/features/session-ui.js | 6 | yes (window) | Session list rendering with time badges (collapsed state), participant modal, DOM-based tooltips with inline SVG icons. Internal: _el(), _buildSessionItem() (adds .session-time-badge HH:MM), _buildParticipantItem(), _createParticipantsSpan() (uses .participants-clickable/.participants-non-clickable CSS classes), _tooltipIcons, _removeTooltip(), _showTooltip(), _buildSessionTooltipHTML() (queries .session-meta-grid), _clearTooltip(), _attachTooltip() |
| S017 | TranscriptManager | SRV | js/features/transcript.js | 7 | yes (window) | Transcript display with incremental updates, search highlighting, stats |
| S018 | TranscriptRefreshManager | SRV | js/features/transcript-refresh.js | 5 | yes (window) | Manual transcript reload and scanner restart |
| S019 | ExportManager | SRV | js/features/export.js | 7 | yes (window) | TXT/MD export via format dropdown, clipboard copy, LLM prompt wrapping, prompt selector dropdown, toast notifications. Internal: FORMAT_CONFIG, _getSelectedFormat(), _getValidatedExportContent(format), _prepareContent() |
| S020 | SearchFilterManager | SRV | js/features/search-filter.js | 7 | yes (window) | Inline debounced search, participant filtering, filter state persistence |
| S021 | ModalManager | SRV | js/features/modal-manager.js | 6 | yes (window) | Modal show/hide, ESC/backdrop close, confirm/resume/export/stop modals |
| S022 | ThemeManager | SRV | js/features/theme-manager.js | 5 | yes (window) | Light/dark theme toggle via data-theme attribute, persisted through UIManager/chrome.storage |
| S023 | SettingsManager | SRV | js/features/settings-manager.js | 6 | yes (window) | User display name, multi-prompt CRUD, Google name detection, tab UI |

## Registry — Global Function Aliases (set during module initialization)

| ID | Symbol Name | Type | Delegated To | Description |
|----|-------------|------|-------------|-------------|
| S024 | window.displayTranscript | UTL | TranscriptManager.displayTranscript | Display transcript data in UI |
| S025 | window.updateStats | UTL | TranscriptManager.updateStats | Update entry/participant/duration stats |
| S026 | window.getSpeakerColorMap | UTL | TranscriptManager.getSpeakerColorMap | Get consistent speaker→color mapping |
| S027 | window.detectChanges | UTL | BackgroundScanner.detectChanges | Diff old vs new transcript messages |
| S028 | window.createNewSession | UTL | SessionHistoryManager.createNewSession | Create empty session |
| S029 | window.showSettingsModal | UTL | SettingsManager.showSettingsModal | Open settings modal |
| S030 | window.getUserDisplayName | UTL | SettingsManager.getUserDisplayName | Get user display name |
| S031 | window.startDurationTimer | UTL | TimerManager.startDurationTimer | Start duration timer |
| S032 | window.stopDurationTimer | UTL | TimerManager.stopDurationTimer | Stop duration timer |
| S033 | window.updateDurationDisplay | UTL | TimerManager.updateDurationDisplay | Update duration display |
| S034 | window.showModal | UTL | ModalManager.showModal | Show modal by ID |
| S035 | window.hideModal | UTL | ModalManager.hideModal | Hide modal by ID |
| S036 | window.updateStatus | UTL | UIManager.updateStatus | Update status message |
| S037 | window.updateButtonVisibility | UTL | UIManager.updateButtonVisibility | Update button visibility state |
| S038 | window.showMeetingName | UTL | UIManager.showMeetingName | Show meeting name for historical session |
| S039 | window.hideMeetingName | UTL | UIManager.hideMeetingName | Hide meeting name display |
| S040 | window.resetSearch | UTL | SearchFilterManager.resetSearch | Reset search state |
| S041 | window.resetParticipantFilters | UTL | SearchFilterManager.resetParticipantFilters | Reset participant filters |
| S042 | window.renderSessionHistory | UTL | SessionUIManager.renderSessionHistory | Render session list |
| S043 | window.showEmptySession | UTL | SessionHistoryManager.showEmptySession | Show empty session UI |
| S044 | window.deactivateRealtimeMode | UTL | RecordingManager.deactivateRealtimeMode | Stop recording |
| S045 | window.activateRealtimeMode | UTL | RecordingManager.activateRealtimeMode | Start recording |

## Registry — Global State Variables

| ID | Symbol Name | Type | File Path | Line | Description |
|----|-------------|------|-----------|------|-------------|
| S046 | window.transcriptData | STR | js/core/state-manager.js | 6 | Current transcript {messages[], scrapedAt, meetingUrl} |
| S047 | window.sessionHistory | STR | js/core/state-manager.js | 233 | Array of saved session objects |
| S048 | window.currentSessionId | STR | js/core/state-manager.js | 9 | Active session identifier string |
| S049 | window.expandedEntries | STR | js/core/state-manager.js | 11 | Set of expanded transcript entry IDs |
| S050 | window.realtimeMode | STR | js/core/state-manager.js | 7 | Boolean — is recording active |

## Registry — Content Script (content.js)

| ID | Symbol Name | Type | File Path | Line | Exported | Description |
|----|-------------|------|-----------|------|----------|-------------|
| S051 | scrapeTranscript | UTL | content.js | 431 | no (local) | DOM scraping of Google Meet captions container |
| S052 | detectGoogleUserNameFallback | UTL | content.js | 46 | no (local) | Fallback Google name detection (script tags + DOM) |
| S053 | findNameByPattern | UTL | content.js | 106 | no (local) | Regex pattern matching helper for name extraction |
| S054 | isValidUserNameFallback | UTL | content.js | 174 | no (local) | Validate candidate user names |
| S055 | isLanguageSelectionText | UTL | content.js | 494 | no (local) | Filter out language menu UI text |
| S056 | isValidTranscriptText | UTL | content.js | 523 | no (local) | Validate transcript text entries |
| S057 | sanitizeTranscriptText | UTL | content.js | 531 | no (local) | Remove emojis, UI fragments, language menu artifacts |
| S058 | NAME_BLACKLIST | CNS | content.js | 163 | no (local) | Blacklisted terms for name validation |
| S059 | enableCaptionsIfNeeded | UTL | content.js | 288 | no (local) | Auto-enable captions via keyboard shortcut dispatch (retry loop, up to 2 attempts) |
| S060 | areCaptionsEnabled | UTL | content.js | 244 | no (local) | Check if captions are active via [jsname="dsyhDe"] |
| S061 | generateHash | UTL | content.js | 482 | no (local) | Simple hash for change detection (speaker:text → base36) |
| S062 | detectMeetingStart | UTL | content.js | — | no (local) | Poll for captions availability (2s interval, 5min timeout) |
| S081 | startScanning | UTL | content.js | — | no (local) | Start 3s interval self-scanning loop in content script |
| S082 | stopScanning | UTL | content.js | — | no (local) | Stop scanning loop and clear persisted state |
| S083 | _createCheckpoint | UTL | content.js | — | no (local) | Create backup checkpoint every 10 scans (moved from background.js) |
| S084 | _cleanupOldCheckpoints | UTL | content.js | — | no (local) | Keep only last 3 checkpoints per tab (moved from background.js) |
| S085 | _autoResumeScanning | UTL | content.js | — | no (local) | Auto-resume scanning on content script load (handles tab refresh) |
| S086 | _getOwnTabId | UTL | content.js | — | no (local) | Get tab ID via service worker relay |

## Registry — Background Script (background.js) — Thin Relay

| ID | Symbol Name | Type | File Path | Line | Exported | Description |
|----|-------------|------|-----------|------|----------|-------------|
| S063 | [REMOVED] startBackgroundScanning | — | — | — | — | Scanning loop moved to content.js (S081) |
| S064 | [REMOVED] stopBackgroundScanning | — | — | — | — | Scanning stop moved to content.js (S082) |
| S065 | [REMOVED] createCheckpoint | — | — | — | — | Moved to content.js (S083) |
| S066 | [REMOVED] cleanupOldCheckpoints | — | — | — | — | Moved to content.js (S084) |
| S087 | _relayStopToScanningTab | UTL | background.js | 97 | no (local) | Find scanning Meet tab and relay stop command |
| S088 | _relayScanningStatus | UTL | background.js | 115 | no (local) | Relay scanning status query to Meet tabs |
| S090 | _findScanningTab | UTL | background.js | 77 | no (local) | Find first Meet tab that is actively scanning (shared helper) |

## Registry — Popup Entry Point (popup.js)

| ID | Symbol Name | Type | File Path | Line | Exported | Description |
|----|-------------|------|-----------|------|----------|-------------|
| S067 | initializeApplication | UTL | popup.js | 91 | no (local) | Module initialization sequence orchestrator |
| S068 | restoreCompleteApplicationState | UTL | popup.js | 165 | no (local) | Full state restoration (session + UI) |
| S069 | applySessionStateRestoration | UTL | popup.js | 223 | no (local) | Apply restored session state (recording/paused/historical) |
| S070 | setupMainEventListeners | UTL | popup.js | 304 | no (local) | Bind main button click handlers (incl. helpBtn → helpModal) |
| S071 | setupMessageListener | UTL | popup.js | 360 | no (local) | Chrome runtime message listener for popup |
| S072 | requireModule | UTL | popup.js | 70 | no (local) | Validate required module on window |
| S073 | initModule | UTL | popup.js | 80 | no (local) | Safe optional module initialization |
| S074 | displayTranscriptAndStats | UTL | popup.js | 205 | no (local) | Display transcript + update stats + participant clickability |
| S075 | applyEmergencyFallback | UTL | popup.js | 155 | no (local) | Emergency fallback when restoration fails |
| S076 | validateGlobalFunctions | UTL | popup.js | 35 | no (local) | Validate critical global functions exist |
| S077 | validateEssentialElements | UTL | popup.js | 57 | no (local) | Validate critical DOM elements exist |
| S078 | bindClick | UTL | popup.js | 307 | no (local) | Bind click handler to element by ID |
| S079 | showInitializationError | UTL | popup.js | 377 | no (local) | Display error overlay to user |
| S112 | setupHelpTocNavigation | UTL | popup.js | 406 | no (local) | Help modal TOC smooth scrolling and active link tracking |

## Registry — Debug Config (debug-config.js)

| ID | Symbol Name | Type | File Path | Line | Exported | Description |
|----|-------------|------|-----------|------|----------|-------------|
| S080 | DEBUG_ENABLED | CNS | debug-config.js | 7 | yes (globalScope) | Master switch for console.log/debug/info |

| S089 | processPendingUpdates | UTL | js/features/background-scanner.js | — | yes (window) | Drain queued background updates received before realtimeMode active |
| S091 | _MAX_PENDING_UPDATES | CNS | js/features/background-scanner.js | 12 | yes (window) | Max pending background updates queue size (20) |

## Registry — Multi-Prompt System (SettingsManager methods)

| ID | Symbol Name | Type | File Path | Line | Exported | Description |
|----|-------------|------|-----------|------|----------|-------------|
| S092 | SettingsManager.loadPrompts | UTL | js/features/settings-manager.js | 59 | yes (window) | Load prompts from storage with migration from old useDefaultPrompt/customPrompt format |
| S093 | SettingsManager.savePrompts | UTL | js/features/settings-manager.js | 106 | yes (window) | Persist prompts list to chrome.storage.sync |
| S094 | SettingsManager.getDefaultPrompt | UTL | js/features/settings-manager.js | 118 | yes (window) | Return the prompt marked as default |
| S095 | SettingsManager.getBuiltinPromptText | UTL | js/features/settings-manager.js | 125 | yes (window) | Fetch and cache built-in prompt.md text |
| S096 | SettingsManager.getPromptText | UTL | js/features/settings-manager.js | 140 | yes (window) | Resolve prompt object to its text (builtin → fetch, custom → return stored) |
| S097 | SettingsManager.addPrompt | UTL | js/features/settings-manager.js | 166 | yes (window) | Add new custom prompt with generated ID |
| S098 | SettingsManager.updatePrompt | UTL | js/features/settings-manager.js | 182 | yes (window) | Update existing prompt title/text (blocks builtin) |
| S099 | SettingsManager.deletePrompt | UTL | js/features/settings-manager.js | 194 | yes (window) | Delete prompt by ID (blocks builtin, reassigns default) |
| S100 | SettingsManager.setDefaultPrompt | UTL | js/features/settings-manager.js | 213 | yes (window) | Mark one prompt as default (only one at a time) |
| S101 | SettingsManager.renderPromptList | UTL | js/features/settings-manager.js | 223 | yes (window) | Render prompt table rows dynamically in prompt tab |
| S102 | SettingsManager.showPromptForm | UTL | js/features/settings-manager.js | 323 | yes (window) | Show add/edit/copy inline form for prompts |
| S103 | ExportManager.updatePromptSelectorVisibility | UTL | js/features/export.js | — | yes (window) | Populate and show/hide prompt selector dropdown in export modal |
| S104 | ExportManager.getSelectedExportPrompt | UTL | js/features/export.js | — | yes (window) | Get selected prompt from dropdown or fall back to default |

## Registry — New Feature Modules (Batch Implementation)

| ID | Symbol Name | Type | File Path | Line | Exported | Description |
|----|-------------|------|-----------|------|----------|-------------|
| S105 | SessionSearchManager | SRV | js/features/session-search.js | 5 | yes (window) | Session history search by title/participant/date with debounced input |
| S106 | AutoSaveManager | SRV | js/features/auto-save-manager.js | 5 | yes (window) | Auto-recover transcript data saved when Meet tab closes during recording |
| S107 | ImportManager | SRV | js/features/import-manager.js | 5 | yes (window) | Import JSON session files with format validation and normalization |
| S108 | MeetingStatsManager | SRV | js/features/meeting-stats.js | 5 | yes (window) | Per-speaker analytics: message count, word count, speaking time with theme-aware CSS bar charts |
| S109 | PaginationManager | SRV | js/features/pagination.js | 5 | yes (window) | Transcript pagination with configurable page size, prev/next navigation |
| S110 | SessionMergeManager | SRV | js/features/session-merge.js | 5 | yes (window) | Merge multiple sessions with hash-based deduplication; selected item visual highlight via classList.toggle |
| S111 | KeyboardShortcutsManager | SRV | js/features/keyboard-shortcuts.js | 5 | yes (window) | Popup keyboard shortcuts: Ctrl+Shift+R/C/E, Escape |
| S113 | SessionFilterManager | SRV | js/features/session-filter.js | 5 | yes (window) | Session history filtering by date range and participants with collapsible multi-select dropdown UI. Internal: _toggleParticipantList() (expand/collapse participant list), _updateParticipantTriggerText() (dynamic trigger label: "Wszyscy"/"N z M"/"Brak"), _handleDateChange() (cross-constrains dateFrom.max/dateTo.min to prevent invalid date ranges, toggles .sf-date-has-value indicator class) |

## Registry — Updated Existing Modules

| ID | Symbol Name | Type | Update Description |
|----|-------------|------|--------------------|
| S006 | AppConstants | CNS | Added EXPORT_FORMATS.MD, TIMING.PAGINATION_PAGE_SIZE/CAPTION_CHECK_INTERVAL/AUTO_SAVE_FLUSH_DELAY, STORAGE_KEYS.AUTO_SAVE_DATA/KEYBOARD_SHORTCUTS, IMPORT_LIMITS |
| S019 | ExportManager | SRV | Added generateMdContent(), prepareExportContentMd(), quickCopyWithPrompt(), Markdown export handlers. Refactored: consolidated _getExportContent→_getValidatedExportContent(format), shared _prepareContent() for TXT/MD. Simplified: replaced 4-button grid with format dropdown (#exportFormatSelect) + 2 action buttons, removed _setupExportButton/_setupClipboardButton helpers, added _getSelectedFormat() |
| S051 | scrapeTranscript | UTL | Now returns captionsEnabled field |
| S016 | SessionUIManager | SRV | renderSessionHistory() now uses SessionSearchManager.getFilteredSessions() |
| S017 | TranscriptManager | SRV | displayTranscript() now integrates PaginationManager |
| S020 | SearchFilterManager | SRV | Resets PaginationManager on search/filter change |
| S003 | UIManager | SRV | Data-dependent visibility for actionGroupLeft (search+filter), actionSeparator, exportBtn, clearBtn, statsBtn, quickCopyBtn (all hidden when no transcript data) |

## Numbering Rules
- Sequential: S001–S113 (current max)
- Next available ID: S114
- S113 updated: added _toggleParticipantList, _updateParticipantTriggerText, .sf-date-has-value indicator
- Removed symbols: marked [REMOVED], ID never reused
