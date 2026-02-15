# Requirements Analysis: 10 New Features for Google Meet Transcript Scraper

## 1. Established Architecture Patterns

### Module Export Pattern
Every module uses `window.ModuleName = { ... }` with an `initialize()` method and a `setupGlobalAliases()` method that exposes key functions on the `window` object.

### Module Initialization Sequence (popup.js)
Modules initialized in `initializeApplication()` in strict dependency order:
1. Required core: TransactionCoordinator, StorageManager, StateManager
2. Optional core: UIManager, TimerManager, ModalManager
3. SettingsManager (async)
4. BackgroundScanner, TranscriptRefreshManager, RecordingManager
5. SessionHistoryManager + SessionUIManager (async)
6. DataIntegrity
7. Feature modules: TranscriptManager, SearchFilterManager, ExportManager
8. Event listeners, ThemeManager, DebugManager
9. State restoration

### Session Data Structure
```javascript
{
    id: string,              // e.g., 'session_1707900000000_abc123def'
    title: string,           // e.g., 'Spotkanie o 14:30'
    date: string,            // ISO 8601
    participantCount: number,
    entryCount: number,
    transcript: {
        messages: Array<{speaker, text, hash, index?, timestamp?}>,
        scrapedAt: string,
        meetingUrl: string
    },
    totalDuration: number    // seconds
}
```

### Message Data Structure
```javascript
{
    index: number,
    speaker: string,
    text: string,
    hash: string  // base36 of djb2 hash of "speaker:text"
}
```

## 2. Feature-by-Feature Analysis

### Feature 1: Markdown Export
- **Files:** export.js (add generateMdContent()), constants.js (add MD format), popup.html (add button), style.css
- **Reuse:** generateTxtContent() pattern, downloadFile(), wrapWithLLMPrompt()
- **Complexity:** Low

### Feature 2: Auto-save on Meeting Close
- **Files:** content.js (meeting end detection), background.js (relay), background-scanner.js, recording.js, session-history.js
- **Reuse:** autoSaveCurrentSession(), deactivateRealtimeMode(), flushPendingData()
- **Detection:** URL change, "You left the meeting" DOM, captions container disappearance
- **Complexity:** Medium-High

### Feature 3: Caption Warning Notification
- **Files:** content.js (periodic check in scan loop), background-scanner.js, recording.js
- **Reuse:** areCaptionsEnabled() (already exists), showToast(), enableCaptionsIfNeeded()
- **Complexity:** Low

### Feature 4: Long Meeting Pagination
- **Files:** transcript.js (modify displayTranscript()), popup.html, style.css, constants.js
- **Key concern:** handleIncrementalUpdate() conflict with pagination viewport
- **Approach:** "Load more" button, 100 entries per page
- **Complexity:** Medium

### Feature 5: Quick Copy with Prompt
- **Files:** export.js (add quickCopyWithPrompt()), popup.html, popup.js
- **Reuse:** prepareExportContent(true), copyToClipboard(), showToast(), getDefaultPrompt()
- **Complexity:** Low

### Feature 7: Search in Session History
- **Files:** session-ui.js (add search), popup.html, style.css/session-history.css
- **Reuse:** SearchFilterManager debounce pattern
- **Complexity:** Medium

### Feature 8: Session Merging
- **New file:** js/features/session-merge.js
- **Files:** session-history.js, session-ui.js, popup.html, constants.js
- **Reuse:** hash-based dedup from detectChanges(), TransactionCoordinator
- **Complexity:** High

### Feature 9: Keyboard Shortcuts
- **Files:** manifest.json (commands section), background.js (onCommand listener)
- **Constraint:** Max 4 shortcuts in Chrome
- **Complexity:** Medium

### Feature 10: Meeting Statistics
- **New file:** js/features/statistics.js
- **Files:** popup.html, style.css
- **Reuse:** getSpeakerColorMap(), ModalManager, transcriptData.messages
- **Charts:** CSS-only horizontal bars
- **Complexity:** Medium

### Feature 13: Import Sessions
- **Files:** export.js or new module, session-history.js, popup.html, style.css
- **Validation:** JSON structure, file size (<10MB), required fields
- **Reuse:** generateHash() logic, StorageManager.saveSessionHistory()
- **Complexity:** Medium

## 3. Key Constraints
1. Chrome Manifest V3 Service Worker — can be killed anytime
2. chrome.storage.local 10MB limit
3. Popup destroyed when closed — state restoration required
4. No external dependencies — vanilla JS/CSS only
5. All UI text in Polish
6. Max 4 keyboard shortcuts
7. Google Meet DOM selectors change frequently

## 4. New Files to Create
| File | Feature |
|------|---------|
| js/features/session-merge.js | Session Merging |
| js/features/statistics.js | Meeting Statistics |

## 5. Implementation Priority (by complexity/dependencies)
1. Markdown export (Low)
2. Quick copy with prompt (Low)
3. Caption warning (Low)
4. Import sessions (Medium)
5. Meeting statistics (Medium)
6. Long meeting pagination (Medium)
7. Search in session history (Medium)
8. Auto-save on meeting close (Medium-High)
9. Keyboard shortcuts (Medium)
10. Session merging (High)
