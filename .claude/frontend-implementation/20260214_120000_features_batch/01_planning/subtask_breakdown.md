# Subtask Breakdown: 10-Feature Batch

**Date:** 2026-02-14
**Reference:** implementation_plan.md

---

## Batch 1: Foundation and Independent Features

---

# Task 1.1: Constants Updates (T-1)

**Subagent:** frontend-implementer
**Model:** opus

## Objective
Add new constants needed by 6+ features: export format for Markdown, pagination page size, caption check interval, auto-save storage keys, and session search storage key.

## Files
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/utils/constants.js` - modify

## Dependencies
- None

## Guidelines Reference
- Module pattern: constants are plain objects assigned to `window.AppConstants`
- Example pattern: `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/utils/constants.js` (existing file)

## Detailed Changes

1. In `EXPORT_FORMATS`, add `MD: 'md'`
2. In `TIMING`, add:
   - `PAGINATION_PAGE_SIZE: 50`
   - `CAPTION_CHECK_INTERVAL: 5000`
   - `AUTO_SAVE_FLUSH_DELAY: 500`
3. In `STORAGE_KEYS`, add:
   - `AUTO_SAVE_DATA: 'autoSaveData'`
   - `SESSION_SEARCH_QUERY: 'sessionSearchQuery'`
   - `KEYBOARD_SHORTCUTS: 'keyboardShortcuts'`

## Compliance Checklist
- [ ] No new global variables introduced outside `window.AppConstants`
- [ ] All constant names use UPPER_SNAKE_CASE
- [ ] No duplicate keys in any object

## Completion Criteria
- File passes syntax check (no parse errors)
- All new keys are accessible via `window.AppConstants.TIMING.PAGINATION_PAGE_SIZE`, etc.
- Existing constants are unchanged

---

# Task 1.2: Quick Copy with Prompt (T-4)

**Subagent:** frontend-implementer
**Model:** opus

## Objective
Add a one-click "Kopiuj z promptem" button that copies the transcript with the default LLM prompt to clipboard without opening the export modal.

## Files
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/export.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.js` - modify

## Dependencies
- None

## Guidelines Reference
- Button placement pattern: see `.action-group-right` in popup.html (line 176)
- Toast notification pattern: see `ExportManager.showToast()` in export.js (line 257)
- Event binding pattern: see `bindClick()` in popup.js (line 283)
- Example pattern: `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/export.js`

## Detailed Changes

### popup.html
In the `.action-group-right` div (line 176), add before `#exportBtn`:
```html
<button id="quickCopyBtn" class="icon-button" title="Kopiuj z promptem" style="display: none;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
    </svg>
</button>
```

### export.js
Add method after `setupExportButtonHandlers()`:
```javascript
async quickCopyWithPrompt() {
    if (!window.transcriptData?.messages?.length) {
        this.showToast('Brak danych do skopiowania', 'error');
        return;
    }
    try {
        const content = await this.prepareExportContent(true);
        await this.copyToClipboard(content);
        this.showToast('Skopiowano z promptem!', 'success');
    } catch (error) {
        console.error('Quick copy failed:', error);
        this.showToast('Blad kopiowania', 'error');
    }
}
```

### popup.js
In `setupMainEventListeners()`, add:
```javascript
bindClick('quickCopyBtn', () => {
    if (window.ExportManager?.quickCopyWithPrompt) {
        window.ExportManager.quickCopyWithPrompt();
    }
});
```

The button visibility should be managed: show when transcript data exists. In the `exportBtn` click handler area, also manage `quickCopyBtn` visibility. Or add to UIManager's `updateButtonVisibility` for RECORDING and NEW states to show it.

## Compliance Checklist
- [ ] Button uses existing `.icon-button` class for consistent styling
- [ ] Toast messages are in Polish
- [ ] Error handling wraps the entire async operation
- [ ] Button hidden by default (`style="display: none;"`)
- [ ] No new CSS required (reuses existing icon-button styles)

## Completion Criteria
- Button appears when transcript data is loaded
- Click copies transcript + prompt to clipboard
- Success toast "Skopiowano z promptem!" appears
- Error toast shown when no data available
- Button hidden when no transcript data

---

# Task 1.3: Session Search (T-9)

**Subagent:** frontend-implementer
**Model:** opus

## Objective
Add a search input to the session history sidebar that filters sessions by title, participant name, or date.

## Files
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/session-search.js` - create
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/session-ui.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/style.css` - modify

## Dependencies
- None

## Guidelines Reference
- Module pattern: `window.SessionSearchManager = { initialize() {} }` (see `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/search-filter.js` for search input pattern)
- Search input styling: see `.inline-search` in style.css
- Sidebar structure: see `.sidebar-actions` in popup.html (line 47)
- Example pattern: `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/search-filter.js`

## Detailed Changes

### session-search.js (create)
```javascript
window.SessionSearchManager = {
    _searchQuery: '',
    _debounceTimer: null,

    initialize() {
        const input = document.getElementById('sessionSearchInput');
        const clearBtn = document.getElementById('sessionSearchClear');
        if (input) {
            input.addEventListener('input', (e) => this._onSearchInput(e.target.value));
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSearch());
        }
        console.log('🔍 [SESSION SEARCH] SessionSearchManager initialized');
    },

    _onSearchInput(value) {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            this._searchQuery = value.trim().toLowerCase();
            window.SessionUIManager?.renderSessionHistory();
        }, 300);
    },

    clearSearch() {
        this._searchQuery = '';
        const input = document.getElementById('sessionSearchInput');
        if (input) input.value = '';
        window.SessionUIManager?.renderSessionHistory();
    },

    getFilteredSessions() {
        const sessions = window.sessionHistory || [];
        if (!this._searchQuery) return sessions;

        return sessions.filter(session => {
            const title = (session.title || '').toLowerCase();
            const date = new Date(session.date).toLocaleDateString('pl-PL');
            const participants = (session.participantNames || []).join(' ').toLowerCase();
            const query = this._searchQuery;
            return title.includes(query) || date.includes(query) || participants.includes(query);
        });
    },

    getCurrentQuery() {
        return this._searchQuery;
    }
};
```

### popup.html
In `.sidebar-actions` div (line 47), add before the newSessionBtn:
```html
<div class="session-search-container">
    <svg class="session-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
    <input type="text" id="sessionSearchInput" class="session-search-input" placeholder="Szukaj sesji..." autocomplete="off">
    <button id="sessionSearchClear" class="session-search-clear" title="Wyczysc" style="display: none;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
    </button>
</div>
```

Add script tag in popup.html after search-filter.js:
```html
<script src="js/features/session-search.js"></script>
```

### session-ui.js
Modify `renderSessionHistory()` to use filtered sessions:
```javascript
// Replace: for (const session of window.sessionHistory) {
// With:
const sessions = window.SessionSearchManager
    ? window.SessionSearchManager.getFilteredSessions()
    : (window.sessionHistory || []);

if (!sessions.length) {
    const query = window.SessionSearchManager?.getCurrentQuery();
    if (query) {
        historyContainer.innerHTML = '<div class="empty-sessions"><p>Nie znaleziono sesji</p></div>';
    } else {
        historyContainer.innerHTML = '<div class="empty-sessions"><p>Brak zapisanych sesji</p></div>';
    }
    return;
}

for (const session of sessions) {
```

### style.css
Add session search styles:
```css
.session-search-container {
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: var(--space-4);
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-4);
}
.session-search-icon { /* similar to .inline-search-icon */ }
.session-search-input { /* similar to .inline-search-input */ }
.session-search-clear { /* similar to .inline-search-clear */ }
.sidebar.collapsed .session-search-container { display: none; }
```

### popup.js
Add `initModule('SessionSearchManager')` before the SessionHistoryManager/SessionUIManager initialization block.

## Compliance Checklist
- [ ] Module follows `window.ModuleName = { initialize() {} }` pattern
- [ ] Uses 300ms debounce for input (matches TIMING.DEBOUNCE_DELAY)
- [ ] Polish UI text: "Szukaj sesji...", "Nie znaleziono sesji"
- [ ] Search input hidden when sidebar is collapsed
- [ ] Clear button shown only when query is non-empty
- [ ] No external dependencies

## Completion Criteria
- Search input visible in sidebar when expanded
- Typing filters session list in real-time
- Clear button resets to full list
- "Nie znaleziono sesji" shown for no matches
- Hidden when sidebar is collapsed

---

## Batch 2: Core Feature Modules

---

# Task 2.1: Markdown Export Logic (T-2)

**Subagent:** frontend-implementer
**Model:** opus

## Objective
Add Markdown transcript generation to ExportManager and wire up export handlers for `.md` file download and clipboard copy.

## Files
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/export.js` - modify

## Dependencies
- Task 1.1 (T-1): `EXPORT_FORMATS.MD` constant available

## Guidelines Reference
- Existing TXT generation: see `generateTxtContent()` in export.js (line 143)
- File download pattern: see `downloadFile()` in export.js (line 289)
- Example pattern: `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/export.js`

## Detailed Changes

Add `generateMdContent(dataSnapshot)` method to ExportManager:
```javascript
generateMdContent(dataSnapshot) {
    if (!dataSnapshot?.messages) return '';

    const lines = [
        '# Transkrypcja Google Meet',
        '',
        `**Data eksportu:** ${new Date(dataSnapshot.exportedAt).toLocaleString('pl-PL')}`,
        `**URL spotkania:** ${dataSnapshot.meetingUrl || 'Nieznany'}`,
        `**Liczba wiadomosci:** ${dataSnapshot.messageCount}`,
        '',
        '---',
        ''
    ];

    let currentSpeaker = null;
    for (const entry of dataSnapshot.messages) {
        if (entry.speaker !== currentSpeaker) {
            currentSpeaker = entry.speaker;
            const timestamp = entry.timestamp ? ` *[${entry.timestamp}]*` : '';
            lines.push(`### ${entry.speaker}${timestamp}`);
            lines.push('');
        } else if (entry.timestamp) {
            lines.push(`*[${entry.timestamp}]*`);
        }
        lines.push(`> ${entry.text}`);
        lines.push('');
    }

    return lines.join('\n');
}
```

Update `setupExportButtonHandlers()` to add handlers for `#exportMdBtn` and `#exportMdClipboardBtn` (buttons added in T-3/Batch 3). Use the `_replaceWithClone` pattern. File download uses `downloadFile(content, 'transkrypcja.md', 'text/markdown')`.

Add `prepareExportContentMd(shouldWrapInPrompt)` that calls `generateMdContent` and optionally wraps with prompt.

## Compliance Checklist
- [ ] Markdown output uses `###` for speaker names, `>` for quotes
- [ ] Consecutive messages from same speaker grouped under one header
- [ ] Metadata block uses bold Markdown syntax
- [ ] Method name follows existing camelCase convention
- [ ] Null-safe: returns empty string for null input

## Completion Criteria
- `generateMdContent()` produces valid Markdown from test data
- File download works with `.md` extension
- Clipboard copy works with Markdown content
- Prompt wrapping works for Markdown format

---

# Task 2.2: Caption Warning System (T-5)

**Subagent:** frontend-implementer
**Model:** opus

## Objective
Show a dismissible yellow warning banner in the popup when captions are disabled in Google Meet during recording.

## Files
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/content.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/background-scanner.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/recording.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/style.css` - modify

## Dependencies
- Task 1.1 (T-1): `TIMING.CAPTION_CHECK_INTERVAL` constant

## Guidelines Reference
- Caption detection: see `areCaptionsEnabled()` in content.js (line 244)
- Scan result structure: see `scrapeTranscript()` return value in content.js (line 488)
- Warning banner pattern: see `.recording-warning` in popup.html (line 468) and `.danger-notice` in style.css
- Example pattern: `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/content.js`

## Detailed Changes

### content.js
Modify `scrapeTranscript()` return object (line 488-493) to include:
```javascript
return {
    messages: messages,
    scrapedAt: new Date().toISOString(),
    meetingUrl: window.location.href,
    captionsEnabled: areCaptionsEnabled()
};
```

Also modify `createEmptyResult()` to include `captionsEnabled: areCaptionsEnabled()`.

### popup.html
Add warning banner after `.recording-controls` div (after line 104):
```html
<div id="captionWarning" class="caption-warning" style="display: none;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>
    <span>Napisy nie sa wlaczone w Google Meet. Wlacz napisy, aby nagrywac transkrypcje.</span>
    <button id="captionWarningDismiss" class="caption-warning-dismiss" title="Zamknij">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
    </button>
</div>
```

### background-scanner.js
In `handleBackgroundScanUpdate()`, after the existing checks, add:
```javascript
// Update caption warning in popup
const warningEl = document.getElementById('captionWarning');
if (warningEl && window.realtimeMode) {
    warningEl.style.display = data.captionsEnabled === false ? 'flex' : 'none';
}
```

### recording.js
In `activateRealtimeMode()`, after `this.autoEnableCaptions()` call, add a check that shows the warning if captions were not enabled.

### style.css
```css
.caption-warning {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-6);
    background: var(--status-recording-bg);
    color: var(--status-recording-text);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    margin: var(--space-4) 0;
}
.caption-warning-dismiss {
    margin-left: auto;
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    padding: var(--space-2);
}
```

## Compliance Checklist
- [ ] Warning only visible during active recording
- [ ] Warning auto-hides when captions become enabled
- [ ] Dismiss button hides the warning for current session
- [ ] Uses existing design token variables for colors
- [ ] Polish text for warning message
- [ ] No interference with existing scrapeTranscript() logic

## Completion Criteria
- Warning appears when recording starts with captions off
- Warning disappears when captions are enabled
- Dismiss button works
- Warning does not appear when not recording
- `captionsEnabled` field present in scan data

---

# Task 2.3: Meeting Statistics Module (T-7)

**Subagent:** frontend-implementer
**Model:** opus

## Objective
Create a meeting statistics modal showing per-speaker analytics: message count, word count, and estimated speaking time with CSS bar charts.

## Files
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/meeting-stats.js` - create
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/style.css` - modify

## Dependencies
- Task 1.1 (T-1): constants available

## Guidelines Reference
- Modal pattern: see `#participantsModal` in popup.html (line 446) and ModalManager
- Speaker color mapping: see `TranscriptManager.getSpeakerColorMap()` in transcript.js (line 389)
- Module pattern: see ExportManager in export.js
- Example pattern: `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/export.js`

## Detailed Changes

### meeting-stats.js (create)
```javascript
window.MeetingStatsManager = {
    initialize() {
        const statsBtn = document.getElementById('statsBtn');
        if (statsBtn) {
            statsBtn.addEventListener('click', () => this.openStatsModal());
        }
        console.log('📊 [STATS] MeetingStatsManager initialized');
    },

    calculateStats(transcriptData) {
        // Returns { totalMessages, totalWords, speakers: Map<name, {messages, words, chars, estimatedTime}> }
    },

    openStatsModal() {
        if (!window.transcriptData?.messages?.length) {
            window.ExportManager?.showToast('Brak danych do analizy', 'error');
            return;
        }
        const stats = this.calculateStats(window.transcriptData);
        this.renderStatsModal(stats);
        window.ModalManager?.showModal('statsModal');
    },

    renderStatsModal(stats) {
        // Build HTML with CSS bar charts into #statsModalBody
        // Use speaker colors from TranscriptManager.getSpeakerColorMap()
    }
};
```

### popup.html
Add `#statsBtn` in `.transcript-stats` div. Add `#statsModal` markup after other modals. Add script tag.

### style.css
Stats bar styles using percentage widths and avatar gradient palette.

## Compliance Checklist
- [ ] Pure CSS bar charts (no external libraries)
- [ ] Uses existing avatar color palette for speaker bars
- [ ] Polish labels: "Wiadomosci", "Slowa", "Szacowany czas mowienia"
- [ ] Modal follows existing modal pattern
- [ ] Handles single-speaker edge case
- [ ] Speaking time estimate: words / 150 (average Polish speech rate)

## Completion Criteria
- Stats button visible in transcript stats bar
- Modal opens with per-speaker breakdown
- Bar charts render correctly for 1-6 speakers
- Toast shown when no data available

---

# Task 2.4: Auto-Save on Meeting Close (T-10)

**Subagent:** frontend-implementer
**Model:** opus

## Objective
Automatically save transcript data when the Google Meet tab closes or user navigates away from the meeting.

## Files
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/auto-save-manager.js` - create
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/content.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/background.js` - modify

## Dependencies
- Task 1.1 (T-1): `STORAGE_KEYS.AUTO_SAVE_DATA` constant

## Guidelines Reference
- Content script scanning: see `startScanning()`/`stopScanning()` in content.js (line 602-696)
- Background message handling: see `chrome.runtime.onMessage.addListener` in background.js (line 29)
- Session save pattern: see `SessionHistoryManager.autoSaveCurrentSession()` in session-history.js
- Example pattern: `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/content.js`

## Detailed Changes

### content.js
Add at the end of the file, before `_autoResumeScanning()`:
```javascript
// Auto-save on tab close or navigation away
window.addEventListener('beforeunload', () => {
    if (!_isScanning) return;
    const result = scrapeTranscript();
    if (result?.messages?.length > 0) {
        // Use sendBeacon or synchronous storage for reliability
        const data = JSON.stringify({
            transcript: result,
            sessionId: _scanningSessionId,
            timestamp: Date.now()
        });
        navigator.sendBeacon?.('data:text/plain,' + encodeURIComponent(data));
        // Also try chrome.storage (may not complete)
        chrome.storage.local.set({ autoSaveData: { ...result, sessionId: _scanningSessionId, timestamp: Date.now() } });
    }
});

// Detect meeting end (navigation to post-meeting page)
const _meetingEndObserver = new MutationObserver(() => {
    if (window.location.href.includes('meet.google.com') && !document.querySelector('div[jscontroller="D1tHje"]')) {
        // Meeting UI gone - likely ended
        if (_isScanning) {
            const result = scrapeTranscript();
            chrome.runtime.sendMessage({ action: 'meetingEnded', data: result, sessionId: _scanningSessionId });
        }
    }
});
```

### background.js
Add `chrome.tabs.onRemoved` listener and `meetingEnded` message handler:
```javascript
chrome.tabs.onRemoved.addListener(async (tabId) => {
    // Check if this was a scanning tab
    try {
        const result = await chrome.storage.local.get('scanningState');
        if (result.scanningState?.tabId === tabId) {
            // Tab closed while scanning - recover from last checkpoint
            const scanData = await chrome.storage.local.get(`backgroundScan_${tabId}`);
            if (scanData[`backgroundScan_${tabId}`]?.data) {
                await chrome.storage.local.set({
                    autoSaveData: {
                        ...scanData[`backgroundScan_${tabId}`].data,
                        sessionId: result.scanningState.sessionId,
                        timestamp: Date.now(),
                        source: 'tab_close'
                    }
                });
            }
            await chrome.storage.local.remove('scanningState');
        }
    } catch (error) {
        console.error('Auto-save on tab close failed:', error);
    }
});
```

### auto-save-manager.js (create)
Popup-side module that checks for `autoSaveData` on initialization and merges into session history:
```javascript
window.AutoSaveManager = {
    async initialize() {
        await this.checkForAutoSavedData();
        console.log('💾 [AUTO-SAVE] AutoSaveManager initialized');
    },

    async checkForAutoSavedData() {
        const result = await chrome.storage.local.get('autoSaveData');
        if (!result.autoSaveData?.messages?.length) return;
        // Import into session history
        await this._importAutoSavedSession(result.autoSaveData);
        await chrome.storage.local.remove('autoSaveData');
    },

    async _importAutoSavedSession(data) {
        // Create session entry and add to history
    }
};
```

## Compliance Checklist
- [ ] `beforeunload` handler is non-blocking (no async waits)
- [ ] Uses `navigator.sendBeacon` for reliability on tab close
- [ ] Does not save empty transcripts
- [ ] Cleans up auto-save data after successful import
- [ ] Background script tab removal listener checks scanning state
- [ ] No interference with existing scanning loop

## Completion Criteria
- Closing a Meet tab during recording saves transcript
- Auto-saved data appears in session history on next popup open
- Empty transcripts not saved
- No duplicate sessions created

---

## Batch 3: UI Integration and Complex Features

---

# Task 3.1: Markdown Export UI (T-3)

**Subagent:** frontend-implementer
**Model:** opus

## Objective
Add Markdown export buttons to the export modal and style them consistently with existing export options.

## Files
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/style.css` - modify

## Dependencies
- Task 2.1 (T-2): `generateMdContent()` and Markdown handlers in ExportManager

## Guidelines Reference
- Export modal structure: see `#exportModal .export-options` in popup.html (line 375)
- Export button pattern: see `#exportTxtBtn` styling
- Example pattern: `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` lines 375-388

## Detailed Changes

### popup.html
In `#exportModal .export-options` div (after line 387), add:
```html
<button id="exportMdBtn" class="export-option">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.56 18H3.44C2.65 18 2 17.37 2 16.59V7.41C2 6.63 2.65 6 3.44 6h17.12c.79 0 1.44.63 1.44 1.41v9.18c0 .78-.65 1.41-1.44 1.41zM6 15.5v-5l2.5 3 2.5-3v5h2v-7h-2L8.5 12 6 8.5H4v7h2zm13-7h-2v3h-2v-3h-2l3-3.5 3 3.5z"/>
    </svg>
    <span>Eksportuj Markdown</span>
</button>
<button id="exportMdClipboardBtn" class="export-option">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
    </svg>
    <span>Kopiuj Markdown</span>
</button>
```

### style.css
The `.export-options` container likely needs a 2x2 grid layout update to accommodate 4 buttons:
```css
.export-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
}
```

## Compliance Checklist
- [ ] Buttons use existing `.export-option` class
- [ ] Grid layout accommodates 4 buttons cleanly
- [ ] SVG icons are inline (no external assets)
- [ ] Polish button labels
- [ ] Buttons use same click handler pattern as existing export buttons

## Completion Criteria
- Export modal shows 4 buttons in 2x2 grid
- Markdown file export downloads `.md` file
- Markdown clipboard copies valid Markdown
- All 4 buttons visually consistent

---

# Task 3.2: Import Manager (T-6)

**Subagent:** frontend-implementer
**Model:** opus

## Objective
Create an import module that allows users to import previously exported JSON session files back into the extension.

## Files
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/import-manager.js` - create
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify

## Dependencies
- Task 1.1 (T-1): constants available

## Guidelines Reference
- Module pattern: see ExportManager in `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/export.js`
- Session save pattern: see `SessionHistoryManager._performAutoSave()` in session-history.js
- Confirm dialog pattern: see `#confirmModal` in popup.html (line 393)
- Toast pattern: see `ExportManager.showToast()`
- Data tab in settings: see `#data-tab` in popup.html (line 315)

## Detailed Changes

### import-manager.js (create)
Full module with:
- `initialize()` - bind import buttons
- `handleImportClick()` - create hidden `<input type="file" accept=".json">`, trigger click
- `processImportFile(file)` - FileReader, parse JSON, validate
- `validateImportData(data)` - check for `messages[]` or `entries[]` array, speaker/text fields
- `mapExportFormatToInternal(data)` - handle `entries[]` -> `messages[]` mapping
- `importSession(sessionData)` - generate session ID, add to `window.sessionHistory`, save via StorageManager
- Duplicate detection by matching session ID or title+date

### popup.html
Add import button in `#data-tab .tab-actions` div:
```html
<button id="importSessionBtn" class="btn btn-secondary">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
    Importuj sesje
</button>
```

Also add in sidebar actions area for quick access.

Add script tag before popup.js:
```html
<script src="js/features/import-manager.js"></script>
```

### popup.js
Add `initModule('ImportManager')` after ExportManager.

## Compliance Checklist
- [ ] Accepts only `.json` files
- [ ] Validates JSON structure before import
- [ ] Handles both `entries[]` and `messages[]` formats
- [ ] Shows confirm dialog for duplicates
- [ ] Toast on success "Sesja zaimportowana pomyslnie"
- [ ] Toast on error "Nieprawidlowy format pliku"
- [ ] Re-renders session history after import
- [ ] Polish UI text throughout

## Completion Criteria
- Import button visible in settings data tab
- JSON file with valid structure imports successfully
- Invalid files show error toast
- Duplicate detection works with confirm dialog
- Session appears in sidebar after import

---

# Task 3.3: Pagination Module (T-8)

**Subagent:** frontend-implementer
**Model:** opus

## Objective
Add transcript pagination to keep the popup performant with long transcripts, showing 50 messages per page with navigation controls.

## Files
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/pagination.js` - create
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/transcript.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/style.css` - modify

## Dependencies
- Task 1.1 (T-1): `TIMING.PAGINATION_PAGE_SIZE` constant

## Guidelines Reference
- Transcript rendering: see `TranscriptManager.displayTranscript()` in transcript.js (line 12)
- SearchFilterManager integration: see `applyFilters()` call in transcript.js (line 45)
- Example pattern: `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/transcript.js`

## Detailed Changes

### pagination.js (create)
```javascript
window.PaginationManager = {
    _currentPage: 1,
    _totalPages: 1,
    _pageSize: 50, // overridden from constants in initialize()

    initialize() {
        this._pageSize = window.AppConstants?.TIMING?.PAGINATION_PAGE_SIZE || 50;
        const prevBtn = document.getElementById('paginationPrev');
        const nextBtn = document.getElementById('paginationNext');
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousPage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());
        console.log('📄 [PAGINATION] PaginationManager initialized');
    },

    setTotalItems(count) {
        this._totalPages = Math.max(1, Math.ceil(count / this._pageSize));
        if (this._currentPage > this._totalPages) this._currentPage = this._totalPages;
    },

    getCurrentPageItems(allItems) {
        const start = (this._currentPage - 1) * this._pageSize;
        return allItems.slice(start, start + this._pageSize);
    },

    goToPage(page) {
        this._currentPage = Math.max(1, Math.min(page, this._totalPages));
        this.renderControls();
        // Trigger transcript re-render
        if (window.transcriptData) {
            window.displayTranscript?.(window.transcriptData);
        }
    },

    nextPage() { this.goToPage(this._currentPage + 1); },
    previousPage() { this.goToPage(this._currentPage - 1); },
    resetToFirstPage() { this._currentPage = 1; },

    renderControls() {
        const container = document.getElementById('paginationControls');
        if (!container) return;
        if (this._totalPages <= 1) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'flex';
        document.getElementById('paginationPrev').disabled = this._currentPage <= 1;
        document.getElementById('paginationNext').disabled = this._currentPage >= this._totalPages;
        document.getElementById('paginationInfo').textContent = `Strona ${this._currentPage} z ${this._totalPages}`;
    },

    shouldPaginate(itemCount) {
        return itemCount > this._pageSize;
    }
};
```

### transcript.js
Modify `displayTranscript()` after the filter step (around line 42-47):
```javascript
// After: messagesToDisplay = window.SearchFilterManager.applyFilters(messagesToDisplay);
// Add pagination
if (window.PaginationManager) {
    window.PaginationManager.setTotalItems(messagesToDisplay.length);
    messagesToDisplay = window.PaginationManager.getCurrentPageItems(messagesToDisplay);
    window.PaginationManager.renderControls();
}
```

Also in SearchFilterManager integration, when search/filter changes, call `PaginationManager.resetToFirstPage()`.

### popup.html
Add after `#transcriptContent` div (before closing `.transcript-container`):
```html
<div id="paginationControls" class="pagination-controls" style="display: none;">
    <button id="paginationPrev" class="pagination-btn" disabled>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        Poprzednia
    </button>
    <span id="paginationInfo" class="pagination-info">Strona 1 z 1</span>
    <button id="paginationNext" class="pagination-btn">
        Nastepna
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
    </button>
</div>
```

Add script tag before transcript.js.

### style.css
```css
.pagination-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-6);
    padding: var(--space-4);
    border-top: 1px solid var(--border-primary);
}
.pagination-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    cursor: pointer;
    font-size: var(--text-sm);
}
.pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.pagination-info {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
}
```

### popup.js
Add `initModule('PaginationManager')` before TranscriptManager.

## Compliance Checklist
- [ ] Page size configurable via constants
- [ ] Pagination hidden when total items <= page size
- [ ] Search/filter reset resets to page 1
- [ ] Prev disabled on page 1, Next disabled on last page
- [ ] Polish text: "Strona X z Y", "Poprzednia", "Nastepna"
- [ ] No interference with incremental updates during recording
- [ ] Scroll resets to top on page change

## Completion Criteria
- Pagination controls appear for 50+ messages
- Controls hidden for fewer messages
- Page navigation works correctly
- Search/filter resets page to 1
- Polish labels displayed

---

# Task 3.4: Keyboard Shortcuts (T-11)

**Subagent:** frontend-implementer
**Model:** opus

## Objective
Add keyboard shortcuts for common actions: toggle recording, quick copy, open export modal, and close modals.

## Files
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/keyboard-shortcuts.js` - create
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/manifest.json` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/background.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify

## Dependencies
- Task 1.2 (T-4): `ExportManager.quickCopyWithPrompt()` method

## Guidelines Reference
- Chrome commands API: `chrome.commands` in manifest.json
- Event listener pattern: `document.addEventListener('keydown', ...)` in popup context
- Modal management: see ModalManager
- Example pattern: `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/background.js`

## Detailed Changes

### keyboard-shortcuts.js (create)
```javascript
window.KeyboardShortcutsManager = {
    _shortcuts: {
        'ctrl+shift+r': { action: 'toggleRecording', description: 'Rozpocznij/zatrzymaj nagrywanie' },
        'ctrl+shift+c': { action: 'quickCopy', description: 'Kopiuj z promptem' },
        'ctrl+shift+e': { action: 'openExport', description: 'Otworz eksport' },
        'escape': { action: 'closeModal', description: 'Zamknij okno' }
    },

    initialize() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        console.log('⌨️ [SHORTCUTS] KeyboardShortcutsManager initialized');
    },

    handleKeyDown(event) {
        const key = this._buildKeyCombo(event);
        const shortcut = this._shortcuts[key];
        if (!shortcut) return;

        event.preventDefault();
        this._executeAction(shortcut.action);
    },

    _buildKeyCombo(event) {
        const parts = [];
        if (event.ctrlKey || event.metaKey) parts.push('ctrl');
        if (event.shiftKey) parts.push('shift');
        if (event.altKey) parts.push('alt');
        parts.push(event.key.toLowerCase());
        return parts.join('+');
    },

    _executeAction(action) {
        switch (action) {
            case 'toggleRecording':
                window.RecordingManager?.handleRecordButtonClick();
                break;
            case 'quickCopy':
                window.ExportManager?.quickCopyWithPrompt();
                break;
            case 'openExport':
                document.getElementById('exportBtn')?.click();
                break;
            case 'closeModal':
                window.ModalManager?.closeAllModals?.();
                break;
        }
    }
};
```

### manifest.json
Add commands section:
```json
"commands": {
    "toggle-recording": {
        "suggested_key": {
            "default": "Ctrl+Shift+R",
            "mac": "Command+Shift+R"
        },
        "description": "Rozpocznij/zatrzymaj nagrywanie"
    }
}
```

### background.js
Add command listener:
```javascript
chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-recording') {
        // Open popup (commands API opens popup automatically for _execute_action)
        // For custom commands, send message to active tab
    }
});
```

### popup.html
Add script tag before popup.js.

### popup.js
Add `initModule('KeyboardShortcutsManager')` after ExportManager.

## Compliance Checklist
- [ ] Ctrl maps to Cmd on Mac
- [ ] Escape only fires when a modal is open
- [ ] Shortcuts do not conflict with Chrome built-in shortcuts
- [ ] All shortcut descriptions in Polish
- [ ] Prevents default browser behavior for captured shortcuts

## Completion Criteria
- Ctrl+Shift+R toggles recording in popup
- Ctrl+Shift+C copies with prompt
- Ctrl+Shift+E opens export modal
- Escape closes open modals
- No conflicts with browser shortcuts

---

## Batch 4: Final Integration

---

# Task 4.1: Session Merging (T-12)

**Subagent:** frontend-implementer
**Model:** opus

## Objective
Allow users to select and merge multiple session histories into a single combined session with deduplication.

## Files
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/session-merge.js` - create
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/session-ui.js` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/popup.html` - modify
- `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/style.css` - modify

## Dependencies
- Task 1.3 (T-9): SessionSearchManager patterns for sidebar UI

## Guidelines Reference
- Session data structure: see `SessionHistoryManager._performAutoSave()` in session-history.js
- Modal pattern: see `#confirmModal` in popup.html
- Deduplication: see `BackgroundScanner.detectChanges()` hash comparison in background-scanner.js (line 623)
- Session UI rendering: see `SessionUIManager._buildSessionItem()` in session-ui.js
- Example pattern: `/Users/szlachtowskil/Sources/GoogleMeet-Scraper/js/features/session-history.js`

## Detailed Changes

### session-merge.js (create)
```javascript
window.SessionMergeManager = {
    _selectedSessionIds: new Set(),
    _isMergeMode: false,

    initialize() {
        const mergeBtn = document.getElementById('mergeSessionsBtn');
        if (mergeBtn) {
            mergeBtn.addEventListener('click', () => this.openMergeModal());
        }
        console.log('🔗 [MERGE] SessionMergeManager initialized');
    },

    openMergeModal() {
        const sessions = window.sessionHistory || [];
        if (sessions.length < 2) {
            window.ExportManager?.showToast('Potrzebujesz co najmniej 2 sesje do polaczenia', 'error');
            return;
        }
        this._selectedSessionIds.clear();
        this._renderMergeModal(sessions);
        window.ModalManager?.showModal('mergeModal');
    },

    _renderMergeModal(sessions) {
        const list = document.getElementById('mergeSessionList');
        if (!list) return;
        list.innerHTML = '';

        for (const session of sessions) {
            const item = document.createElement('label');
            item.className = 'merge-session-item';
            item.innerHTML = `
                <input type="checkbox" value="${session.id}" class="merge-checkbox">
                <div class="merge-session-info">
                    <span class="merge-session-title">${session.title}</span>
                    <span class="merge-session-meta">${session.entryCount} wpisow • ${session.participantCount} uczestnikow</span>
                </div>
            `;
            item.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    this._selectedSessionIds.add(session.id);
                } else {
                    this._selectedSessionIds.delete(session.id);
                }
                this._updateMergeButtonState();
            });
            list.appendChild(item);
        }
    },

    _updateMergeButtonState() {
        const btn = document.getElementById('mergeConfirmBtn');
        if (btn) {
            btn.disabled = this._selectedSessionIds.size < 2;
            btn.title = this._selectedSessionIds.size < 2 ? 'Wybierz co najmniej 2 sesje' : '';
        }
    },

    async mergeSessions() {
        const sessionIds = Array.from(this._selectedSessionIds);
        const sessions = sessionIds.map(id => window.sessionHistory.find(s => s.id === id)).filter(Boolean);

        if (sessions.length < 2) return;

        // Combine all messages
        const allMessages = [];
        const seenHashes = new Set();

        for (const session of sessions) {
            const messages = session.transcript?.messages || [];
            for (const msg of messages) {
                if (!seenHashes.has(msg.hash)) {
                    seenHashes.add(msg.hash);
                    allMessages.push(msg);
                }
            }
        }

        // Sort by original index or timestamp
        allMessages.sort((a, b) => (a.index || 0) - (b.index || 0));

        // Create merged session
        const mergedTitle = sessions.map(s => s.title).join(' + ');
        const mergedSession = {
            id: window.generateSessionId(),
            title: mergedTitle,
            date: new Date().toISOString(),
            entryCount: allMessages.length,
            participantCount: new Set(allMessages.map(m => m.speaker)).size,
            participantNames: [...new Set(allMessages.map(m => m.speaker))],
            transcript: {
                messages: allMessages,
                scrapedAt: new Date().toISOString(),
                meetingUrl: sessions[0]?.transcript?.meetingUrl || ''
            }
        };

        window.sessionHistory.unshift(mergedSession);
        await window.StorageManager?.setStorageData({ sessionHistory: window.sessionHistory });
        window.SessionUIManager?.renderSessionHistory();
        window.ModalManager?.hideModal('mergeModal');
        window.ExportManager?.showToast(`Polaczono ${sessions.length} sesji (${allMessages.length} wpisow)`, 'success');
    }
};
```

### popup.html
Add merge button in `.sidebar-actions` div:
```html
<button id="mergeSessionsBtn" class="merge-sessions-btn" title="Polacz sesje">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
    </svg>
    <span class="merge-btn-text">Polacz sesje</span>
</button>
```

Add merge modal:
```html
<div id="mergeModal" class="modal" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3 class="modal-title">Polacz sesje</h3>
            <button class="modal-close" data-modal="mergeModal">&times;</button>
        </div>
        <div class="modal-body">
            <p class="merge-instructions">Wybierz sesje do polaczenia. Duplikaty wiadomosci zostana automatycznie usuniete.</p>
            <div id="mergeSessionList" class="merge-session-list"></div>
        </div>
        <div class="modal-footer">
            <button id="mergeCancelBtn" class="btn btn-secondary">Anuluj</button>
            <button id="mergeConfirmBtn" class="btn btn-primary" disabled>Polacz</button>
        </div>
    </div>
</div>
```

Add script tag before session-ui.js.

### session-ui.js
No direct modification needed - SessionMergeManager works independently through the modal.

### style.css
```css
.merge-session-list {
    max-height: 300px;
    overflow-y: auto;
}
.merge-session-item {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4);
    border-bottom: 1px solid var(--border-primary);
    cursor: pointer;
}
.merge-session-item:hover {
    background: var(--bg-hover);
}
.merge-session-info {
    display: flex;
    flex-direction: column;
}
.merge-session-title {
    font-size: var(--text-base);
    color: var(--text-primary);
}
.merge-session-meta {
    font-size: var(--text-xs);
    color: var(--text-muted);
}
.merge-sessions-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    cursor: pointer;
    font-size: var(--text-sm);
    width: 100%;
    justify-content: center;
}
.merge-instructions {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
    margin-bottom: var(--space-4);
}
.sidebar.collapsed .merge-btn-text { display: none; }
.sidebar.collapsed .merge-sessions-btn { justify-content: center; }
```

### popup.js
Add `initModule('SessionMergeManager')` after SessionUIManager.
Add click handler for `mergeCancelBtn` and `mergeConfirmBtn`:
```javascript
bindClick('mergeCancelBtn', () => window.ModalManager?.hideModal('mergeModal'));
bindClick('mergeConfirmBtn', () => window.SessionMergeManager?.mergeSessions());
```

## Compliance Checklist
- [ ] Deduplication uses message hash comparison
- [ ] Merge button disabled until 2+ sessions selected
- [ ] Original sessions remain unchanged
- [ ] Merged session title combines source titles
- [ ] Polish UI text throughout
- [ ] Modal follows existing modal pattern
- [ ] Session list scrollable for many sessions
- [ ] Storage updated after merge
- [ ] Session history re-rendered after merge

## Completion Criteria
- Merge button visible in sidebar
- Modal opens with session checkboxes
- Selecting 2+ sessions enables merge button
- Merged session appears in history with correct message count
- Duplicate messages removed
- Original sessions unchanged
- Toast confirms successful merge

---

## Script Load Order (Final popup.html)

After all tasks complete, the script tags in popup.html should be in this order:

```html
<!-- Debug configuration -->
<script src="debug-config.js"></script>

<!-- Core modules -->
<script src="js/utils/constants.js"></script>
<script src="js/core/transaction-coordinator.js"></script>
<script src="js/core/storage-manager.js"></script>
<script src="js/core/state-manager.js"></script>
<script src="js/core/ui-manager.js"></script>
<script src="js/core/timer-manager.js"></script>

<!-- Utility modules -->
<script src="js/utils/formatters.js"></script>
<script src="js/utils/dom-helpers.js"></script>
<script src="js/utils/data-integrity.js"></script>
<script src="js/utils/session-utils.js"></script>
<script src="js/utils/debug-manager.js"></script>

<!-- Feature modules -->
<script src="js/features/modal-manager.js"></script>
<script src="js/features/settings-manager.js"></script>
<script src="js/features/theme-manager.js"></script>
<script src="js/features/recording.js"></script>
<script src="js/features/background-scanner.js"></script>
<script src="js/features/auto-save-manager.js"></script>      <!-- NEW -->
<script src="js/features/session-search.js"></script>          <!-- NEW -->
<script src="js/features/session-history.js"></script>
<script src="js/features/session-ui.js"></script>
<script src="js/features/session-merge.js"></script>           <!-- NEW -->
<script src="js/features/pagination.js"></script>              <!-- NEW -->
<script src="js/features/transcript.js"></script>
<script src="js/features/export.js"></script>
<script src="js/features/import-manager.js"></script>          <!-- NEW -->
<script src="js/features/meeting-stats.js"></script>           <!-- NEW -->
<script src="js/features/search-filter.js"></script>
<script src="js/features/keyboard-shortcuts.js"></script>      <!-- NEW -->
<script src="js/features/transcript-refresh.js"></script>

<!-- Main popup script -->
<script src="popup.js"></script>
```

## Initialization Order (Final popup.js)

```javascript
// Required core
requireModule('TransactionCoordinator').initialize();
requireModule('StorageManager').initialize();
requireModule('StateManager').initialize();

// Optional core
initModule('UIManager');
initModule('TimerManager');
initModule('ModalManager');

// Settings (async)
if (window.SettingsManager) await window.SettingsManager.initialize();

// Scanning & recording
initModule('BackgroundScanner');
initModule('TranscriptRefreshManager');
initModule('RecordingManager');

// Auto-save (async - checks for pending data)
if (window.AutoSaveManager) await window.AutoSaveManager.initialize();

// Session search (before session UI)
initModule('SessionSearchManager');

// Session history
if (window.SessionHistoryManager && window.SessionUIManager) {
    await window.SessionHistoryManager.initialize();
    window.SessionUIManager.initialize();
}

// Session merge (after session UI)
initModule('SessionMergeManager');

// Data integrity
if (window.DataIntegrity) { /* existing code */ }

// Pagination (before transcript)
initModule('PaginationManager');

// Transcript & related
initModule('TranscriptManager');
initModule('SearchFilterManager');
initModule('ExportManager');
initModule('ImportManager');
initModule('MeetingStatsManager');
initModule('KeyboardShortcutsManager');

// Main event listeners
setupMainEventListeners();
setupMessageListener();

// Theme & debug
initModule('ThemeManager');
initModule('DebugManager');

// Validation & state restoration
validateGlobalFunctions();
await restoreCompleteApplicationState();
```
