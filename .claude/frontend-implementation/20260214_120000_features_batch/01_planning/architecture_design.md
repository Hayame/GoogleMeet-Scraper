# Architecture Design: 10 Features

## New Modules to Create

| Module | File | Pattern |
|--------|------|---------|
| CaptionMonitor | js/features/caption-monitor.js | window.CaptionMonitor = { initialize() {} } |
| PaginationManager | js/features/pagination.js | window.PaginationManager = { initialize() {} } |
| SessionSearchManager | js/features/session-search.js | window.SessionSearchManager = { initialize() {} } |
| SessionMergeManager | js/features/session-merge.js | window.SessionMergeManager = { initialize() {} } |
| MeetingStatsManager | js/features/meeting-stats.js | window.MeetingStatsManager = { initialize() {} } |
| ImportManager | js/features/import-manager.js | window.ImportManager = { initialize() {} } |
| AutoSaveManager | js/features/auto-save-manager.js | window.AutoSaveManager = { initialize() {} } |
| KeyboardShortcutManager | js/features/keyboard-shortcuts.js | window.KeyboardShortcutManager = { initialize() {} } |

## Existing Modules to Modify

| Module | File | Changes |
|--------|------|---------|
| ExportManager | js/features/export.js | Add generateMdContent(), quickCopyWithPrompt() |
| TranscriptManager | js/features/transcript.js | Integrate PaginationManager |
| SessionUIManager | js/features/session-ui.js | Support session search filtering, merge mode checkboxes |
| RecordingManager | js/features/recording.js | Start/stop CaptionMonitor |
| BackgroundScanner | js/features/background-scanner.js | Handle caption status messages |
| AppConstants | js/utils/constants.js | Add MD format, pagination config, import limits |

## Other Files to Modify

| File | Changes |
|------|---------|
| popup.html | Add buttons, modals, script tags, search inputs, file input |
| style.css | Stats charts, pagination controls, caption warning banner |
| session-history.css | Session search input, merge selection checkboxes |
| manifest.json | Add commands section for keyboard shortcuts |
| background.js | Add chrome.commands.onCommand, meeting end relay |
| content.js | Add meeting end detection, caption status message handler |
| popup.js | Add initialization calls, event bindings, command handler |

## Script Loading Order (new entries marked with NEW)
1. debug-config.js
2. js/utils/constants.js
3-12. (existing core + utils)
13. js/features/modal-manager.js
14. js/features/settings-manager.js
15. js/features/theme-manager.js
16. js/features/recording.js
17. js/features/background-scanner.js
18. js/features/caption-monitor.js (NEW)
19. js/features/session-history.js
20. js/features/session-ui.js
21. js/features/session-search.js (NEW)
22. js/features/session-merge.js (NEW)
23. js/features/transcript.js
24. js/features/pagination.js (NEW)
25. js/features/export.js
26. js/features/import-manager.js (NEW)
27. js/features/search-filter.js
28. js/features/transcript-refresh.js
29. js/features/meeting-stats.js (NEW)
30. js/features/auto-save-manager.js (NEW)
31. js/features/keyboard-shortcuts.js (NEW)
32. popup.js

## Constants to Add (constants.js)
```javascript
EXPORT_FORMATS.MD = 'md';
TIMING.CAPTION_CHECK_INTERVAL = 10000;
TIMING.PAGINATION_THRESHOLD = 500;
TIMING.PAGE_SIZE = 100;
IMPORT_LIMITS = { MAX_FILE_SIZE_BYTES: 5242880, MAX_SESSIONS_PER_IMPORT: 50 };
```

## Manifest Commands (max 4)
```json
{
  "toggle-recording": { "suggested_key": { "default": "Alt+Shift+R" }, "description": "Rozpocznij/zatrzymaj nagrywanie" },
  "quick-copy": { "suggested_key": { "default": "Alt+Shift+C" }, "description": "Szybkie kopiowanie z promptem" },
  "export-transcript": { "suggested_key": { "default": "Alt+Shift+E" }, "description": "Eksportuj transkrypcję" },
  "new-session": { "suggested_key": { "default": "Alt+Shift+N" }, "description": "Nowa sesja" }
}
```

## Key Design Decisions
1. **Pagination approach:** "Load more" style with page controls (not virtual scroll)
2. **Session merge:** Hash-based dedup, chronological ordering
3. **Caption warning:** Poll every 10s during recording via content script relay
4. **Meeting end detection:** URL change + post-meeting DOM detection + tab close listener
5. **Statistics charts:** CSS-only horizontal bars with speaker colors
6. **Import validation:** Schema check + 5MB size limit + 50-session cap
7. **All UI text in Polish**
