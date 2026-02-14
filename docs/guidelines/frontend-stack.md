# Frontend Technology Stack

> **Quick Reference:** Google Meet Recorder — Vanilla JS ES6+ / Chrome Manifest V3 / Zero Dependencies

---

## Core Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Language** | JavaScript (ES6+) | N/A (browser-native) |
| **Platform** | Chrome Extension (Manifest V3) | MV3 |
| **Build Tool** | None | — |
| **Package Manager** | None | — |
| **Bundler** | None | — |
| **Transpiler** | None | — |
| **UI Framework** | Vanilla DOM API | — |
| **State Management** | Custom StateManager module | — |
| **Storage** | chrome.storage.local | — |

**Zero-dependency philosophy:** No npm, no bundler, no transpiler, no build step. All code runs directly in the browser as-is.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Extension                      │
│                                                         │
│  ┌──────────────┐   messaging   ┌────────────────────┐  │
│  │Content Script │◄────────────►│   Popup UI          │  │
│  │(content.js)   │              │   (popup.html +     │  │
│  │               │              │    popup.js +        │  │
│  │ DOM scraping  │              │    15 modules)       │  │
│  │ MutationObs.  │              │                      │  │
│  │ User detect   │              │ StateManager         │  │
│  └──────┬───────┘              │ StorageManager       │  │
│         │                       │ TransactionCoord.    │  │
│         │                       │ UIManager            │  │
│  ┌──────▼───────┐              │ RecordingManager     │  │
│  │Background     │              │ BackgroundScanner    │  │
│  │Service Worker │              │ SessionHistory       │  │
│  │(background.js)│              │ ExportManager        │  │
│  │               │◄────────────►│ ...                  │  │
│  │ Tab scanning  │   messaging  └─────────┬──────────┘  │
│  │ Install hooks │                        │              │
│  └──────────────┘              ┌──────────▼──────────┐  │
│                                │ chrome.storage.local │  │
│                                └─────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Three execution contexts:**

| Context | Entry Point | Runs On | Purpose |
|---------|------------|---------|---------|
| **Content Script** | `content.js` | `meet.google.com` pages | DOM scraping, user detection |
| **Background Worker** | `background.js` | Service Worker (persistent) | Tab scanning, install hooks, message routing |
| **Popup UI** | `popup.html` → `popup.js` | Extension popup window | User interface, state management, export |

---

## Project Structure

```
GoogleMeet-Scraper/
├── manifest.json                    # Extension config (MV3)
├── popup.html                       # Main UI (script loading order defined here)
├── popup.js                         # App orchestrator, initialization sequence
├── content.js                       # Content script (DOM scraping)
├── background.js                    # Service Worker (background scanning)
├── debug-config.js                  # Debug toggle (loaded FIRST everywhere)
├── prompt.md                        # Default LLM prompt template
├── style.css                        # Main UI styles + theme variables
├── session-history.css              # Session list styles
├── icon16.png / icon48.png / icon128.png
│
├── js/
│   ├── core/                        # Foundation modules
│   │   ├── transaction-coordinator.js  # Atomic multi-key storage writes
│   │   ├── storage-manager.js          # Chrome storage Promise wrapper
│   │   ├── state-manager.js            # Global state (getters/setters)
│   │   ├── ui-manager.js               # Button visibility, UI state
│   │   └── timer-manager.js            # Duration tracking
│   │
│   ├── utils/                       # Helper modules
│   │   ├── constants.js                # App constants (timing, storage keys)
│   │   ├── formatters.js               # Date/duration formatting
│   │   ├── dom-helpers.js              # DOM manipulation utilities
│   │   ├── data-integrity.js           # Storage integrity verification
│   │   ├── session-utils.js            # Session ID generation/validation
│   │   ├── debug-manager.js            # Debug tools UI
│   │   └── google-user-detector.js     # Google account name detection
│   │
│   └── features/                    # Functionality modules
│       ├── modal-manager.js            # Modal lifecycle (show/hide/ESC)
│       ├── settings-manager.js         # Settings persistence
│       ├── theme-manager.js            # Light/dark toggle via data-theme
│       ├── recording.js                # Start/stop recording
│       ├── background-scanner.js       # 2s polling + priority merge queue
│       ├── session-history.js          # Session CRUD operations
│       ├── session-ui.js               # Session list rendering
│       ├── transcript.js               # Transcript display
│       ├── export.js                   # TXT/clipboard export
│       ├── search-filter.js            # Search + participant filtering
│       └── transcript-refresh.js       # Manual transcript refresh
│
└── docs/
    ├── ai-index/                    # Symbolic AI code index
    └── guidelines/                  # This directory
```

---

## Module System

### Window-Based Global Pattern

All modules export as a single object on `window`:

```javascript
window.ModuleName = {
    initialize() { /* setup */ },
    publicMethod() { /* ... */ },
    _privateMethod() { /* underscore prefix */ }
};
```

Modules call each other via `window.ModuleName.method()` or with optional chaining: `window.ModuleName?.method()`.

### Script Loading Order (from popup.html)

**Order matters** — modules depend on earlier modules being available:

```
1. debug-config.js              ← MUST be first (overrides console methods)

2. js/utils/constants.js        ← AppConstants used by everything
3. js/core/transaction-coordinator.js
4. js/core/storage-manager.js
5. js/core/state-manager.js
6. js/core/ui-manager.js
7. js/core/timer-manager.js

8. js/utils/formatters.js
9. js/utils/dom-helpers.js
10. js/utils/data-integrity.js
11. js/utils/session-utils.js
12. js/utils/debug-manager.js

13. js/features/modal-manager.js
14. js/features/settings-manager.js
15. js/features/theme-manager.js
16. js/features/recording.js
17. js/features/background-scanner.js
18. js/features/session-history.js
19. js/features/session-ui.js
20. js/features/transcript.js
21. js/features/export.js
22. js/features/search-filter.js
23. js/features/transcript-refresh.js

24. popup.js                     ← Orchestrator (MUST be last)
```

### Initialization Sequence (popup.js)

Modules are initialized in phases inside `DOMContentLoaded`:

```
Phase 1: Required Core       → TransactionCoordinator, StorageManager, StateManager
Phase 2: Optional Core       → UIManager, TimerManager, ModalManager, SettingsManager
Phase 3: Data Acquisition     → BackgroundScanner, TranscriptRefreshManager, RecordingManager
Phase 4: Session Management   → SessionHistoryManager, SessionUIManager
Phase 5: Data Integrity       → DataIntegrity.verifyStorageIntegrity()
Phase 6: Feature Modules      → TranscriptManager, SearchFilterManager, ExportManager
Phase 7: Event Listeners      → Main event listeners, chrome.runtime message handler
Phase 8: Theming & Debug      → ThemeManager, DebugManager
Phase 9: State Restoration    → restoreCompleteApplicationState()
```

---

## Chrome Extension APIs Used

| API | Permission | Purpose |
|-----|-----------|---------|
| `chrome.storage.local` | `storage` | Persist transcripts, sessions, settings, UI state |
| `chrome.runtime.sendMessage` | — | Popup ↔ Background ↔ Content script messaging |
| `chrome.runtime.onMessage` | — | Message listener in all contexts |
| `chrome.tabs.sendMessage` | `activeTab` | Background → Content script communication |
| `chrome.tabs.query` | `activeTab` | Find Google Meet tabs |
| `chrome.tabs.get` | `activeTab` | Verify tab is still on Meet |
| `chrome.scripting.executeScript` | `scripting` | Inject content script into existing Meet tabs |
| `chrome.downloads.download` | `downloads` | Export transcript files |
| `chrome.action.onClicked` | — | Extension icon click handler |
| `chrome.runtime.onInstalled` | — | First-install content script injection |
| `localStorage` | — | Theme preference (popup-local only) |

### Host Permissions

```json
"host_permissions": ["https://meet.google.com/*"]
```

---

## CSS Approach

### Plain CSS with Custom Properties

No preprocessors, no CSS modules, no PostCSS. Theming via CSS custom properties and `data-theme` attribute.

**Two stylesheets:**
- `style.css` — Main UI, theme variables, all component styles
- `session-history.css` — Session list specific styles

### Theme System

```css
/* Light theme (default) */
:root {
    --bg-primary: #f8f9fa;
    --bg-secondary: #ffffff;
    --text-primary: #1f2937;
    --border-primary: #e5e7eb;
    --btn-primary-bg: #3b82f6;
    /* ... 40+ custom properties */
}

/* Dark theme override */
[data-theme="dark"] {
    --bg-primary: #0f1419;
    --bg-secondary: #1a1f2e;
    --text-primary: #e4e5e7;
    /* ... all overrides */
}
```

**Toggle mechanism:**
```javascript
// ThemeManager sets data-theme on <html>
document.documentElement.setAttribute('data-theme', 'dark');
// All CSS uses var() references — theme switches instantly
```

---

## Key Architectural Decisions

### Why No Build Tools

- Chrome extensions load scripts directly from disk — no server needed
- ES6+ is natively supported in Chrome — no transpilation needed
- The codebase is small enough (~15 modules) that bundling adds complexity without benefit
- Faster development cycle: edit → reload extension → test

### Why Window-Based Modules (Not ES Modules)

- Chrome MV3 popup scripts don't support `<script type="module">` reliably across all contexts
- Service workers use `importScripts()`, not ES modules
- Content scripts are injected dynamically — module boundaries don't apply
- Window globals provide a simple, universal module system across all three contexts

### Why 2-Second Polling (Not Continuous MutationObserver)

- The popup cannot directly observe the Meet page DOM (different execution context)
- Background scanner sends messages to content script every 2 seconds
- Content script scrapes DOM on-demand when messaged
- This decoupled polling approach is more reliable than persistent DOM observation across extension boundaries

### TransactionCoordinator for Atomic Writes

- `chrome.storage.local.set()` can fail mid-write if multiple keys are involved
- TransactionCoordinator wraps multi-key writes with rollback capability
- Crash recovery via transaction markers stored alongside data
- Prevents data loss when popup closes during a save operation

---

## Development Workflow

### Loading the Extension

1. Open `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked** → select the project root directory
4. Navigate to a Google Meet session with captions enabled
5. Click the extension icon to open the popup

### Debugging

| Context | How to Access Console |
|---------|----------------------|
| **Popup** | Right-click popup → Inspect |
| **Content Script** | F12 on Google Meet page → Console (filter by extension) |
| **Background Worker** | `chrome://extensions/` → click "Service Worker" link |
| **Storage** | DevTools → Application → Storage → Chrome Storage (Local) |

### Debug Toggle

Set `DEBUG_ENABLED = true` in `debug-config.js` to enable all `console.log/debug/info` output. When `false`, only `console.warn` and `console.error` remain active.

### Manual Testing Checklist

- [ ] Start recording on an active Meet session with captions ON
- [ ] Verify transcript entries appear in real-time
- [ ] Stop recording — verify session saved to history
- [ ] Close and reopen popup — verify state restoration
- [ ] Load a historical session from sidebar
- [ ] Export as TXT file and clipboard
- [ ] Search within transcript
- [ ] Filter by participant
- [ ] Toggle light/dark theme
- [ ] Test with captions OFF (graceful degradation)

---

## DOM Scraping Strategy

The content script uses multiple CSS selectors to handle different Google Meet UI versions:

### Transcript Container Selectors
```javascript
'.a4cQT'                      // Primary transcript panel
'[jscontroller="MZnM8e"]'     // Alternative controller
'[jscontroller="bzaDVe"]'     // Another variant
```

### Speaker Element Selectors
```javascript
'[jsname="hJNqvr"]'           // Primary speaker name
'.MBpOc'                      // Speaker class
'.NeplSy'                     // Alternative speaker
```

### Text Element Selectors
```javascript
'[jsname="YSAhf"]'            // Primary text content
'[jsname="MBpOc"]'            // Alternative text
'[jsname="NeplSy"]'           // Another variant
```

### Timestamp Selectors
```javascript
'.frX31c-vlczkd'              // Primary timestamp
'.P5KVFf'                     // Alternative timestamp
'[jsname="r2fjRf"]'           // Another variant
```

**Strategy:** Try selectors in order, use first match. This provides resilience against Google Meet UI updates — when Google changes one selector, others still work as fallbacks.

---

## Data Flow

### Recording Flow
```
User clicks Record
  → RecordingManager.activateRealtimeMode()
    → StateManager.setRealtimeMode(true)
    → TransactionCoordinator.executeTransaction([...])  (persist to storage)
    → BackgroundScanner.startScanning()
      → chrome.runtime.sendMessage('startBackgroundScanning')
        → background.js starts 2s interval
          → chrome.tabs.sendMessage(tabId, 'scrapeTranscript')
            → content.js scrapes DOM, returns data
          → chrome.storage.local.set(transcriptData)
    → Popup polls storage for updates, renders transcript
```

### State Restoration Flow (popup reopen)
```
popup.html loads
  → DOMContentLoaded
    → initializeApplication()
      → Phase 1-8: Initialize all modules
      → Phase 9: restoreCompleteApplicationState()
        → StateManager.restoreStateFromStorage()
          → StorageManager.getStorageData([...all keys...])
        → StateManager.restoreUIState()
        → applySessionStateRestoration()
        → If recording was active → resume timer, re-render transcript
        → If historical session → load from history
```

---

## Export Formats

### TXT Format (with optional LLM prompt)
- Plain text with speaker names and timestamps
- Optionally wrapped in a prompt template from `prompt.md`
- Downloaded via `chrome.downloads.download()` or copied to clipboard

### Transcript Data Structure (in storage)
```javascript
{
    messages: [
        {
            speaker: "Jan Kowalski",
            text: "Transcript text here",
            timestamp: "14:32:05",
            hash: "unique_hash_for_dedup"
        }
    ],
    participants: ["Jan Kowalski", "Anna Nowak"],
    meetingUrl: "https://meet.google.com/abc-defg-hij",
    scrapedAt: "2026-02-14T10:30:00.000Z"
}
```

---

## Limitations

- Only works with Google Meet's native captions (not third-party)
- Requires captions to be enabled in the meeting
- Scrapes only currently visible transcript (older messages may scroll out of view)
- Popup must be opened for real-time UI updates (background scanner persists data regardless)
- No automatic persistence without recording mode — requires explicit start
- All data stored locally — no cloud sync or external server

---

**Last Updated:** February 2026
**Manifest Version:** 3
**Extension Version:** 1.1.0
