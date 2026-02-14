# Project Overview

## Identity
- Name: Google Meet Recorder
- Stack: Vanilla JavaScript Chrome Extension (Manifest V3)
- Language: JavaScript (ES2020+)
- Runtime version: Chrome Extension Manifest V3 (Service Worker)
- Package manager: None (no npm/yarn — raw JS loaded via `<script>` tags)
- Build tool: None (no bundler — scripts loaded directly in popup.html)

## Architecture Pattern
- Pattern: Chrome Extension (popup + content script + service worker)
- Architecture style: Modular Singleton pattern (modules on `window.*`)
- API style: Chrome Extension Messaging API (runtime.onMessage / sendMessage)
- State management: Centralized StateManager + chrome.storage.local
- ORM / data access: chrome.storage.local (key-value)
- Database: chrome.storage.local + chrome.storage.sync (for settings)
- Auth: None (local-only extension)
- Caching: In-memory (window globals) + chrome.storage persistence
- Testing: Manual (no automated test framework)

## Directory Structure (depth=2)
```
GoogleMeet-Scraper/
├── manifest.json           # Extension config (MV3)
├── popup.html              # Main UI entry point
├── popup.js                # Application orchestrator
├── content.js              # Google Meet DOM scraper (injected)
├── background.js           # Service worker (background scanning)
├── debug-config.js         # Global debug logging toggle
├── style.css               # Main popup styles
├── session-history.css     # Session history styles
├── prompt.md               # Default LLM export prompt template
├── icon16.png / icon48.png / icon128.png
├── js/
│   ├── core/
│   │   ├── state-manager.js
│   │   ├── storage-manager.js
│   │   ├── ui-manager.js
│   │   ├── timer-manager.js
│   │   └── transaction-coordinator.js
│   ├── utils/
│   │   ├── constants.js
│   │   ├── formatters.js
│   │   ├── dom-helpers.js
│   │   ├── data-integrity.js
│   │   ├── session-utils.js
│   │   ├── debug-manager.js
│   │   └── google-user-detector.js
│   └── features/
│       ├── recording.js
│       ├── background-scanner.js
│       ├── session-history.js
│       ├── session-ui.js
│       ├── transcript.js
│       ├── transcript-refresh.js
│       ├── export.js
│       ├── search-filter.js
│       ├── modal-manager.js
│       ├── theme-manager.js
│       └── settings-manager.js
└── docs/
    └── ai-index/           # This index
```

## Entry Points
| Entry | File | Description |
|-------|------|-------------|
| Popup UI | popup.html | Loads all scripts, renders main UI |
| Orchestrator | popup.js | DOMContentLoaded → initializeApplication() |
| Content Script | content.js | Injected into meet.google.com pages |
| Service Worker | background.js | Background scanning, tab monitoring |
| Debug Config | debug-config.js | Loaded first in all contexts |

## Key Config Files
| File | Role |
|------|------|
| manifest.json | Extension permissions, script registration, icons |
| debug-config.js | Global DEBUG_ENABLED flag (suppresses console.log when false) |
| prompt.md | Default LLM prompt template for transcript export |

## Execution Contexts
| Context | Scripts | Communication |
|---------|---------|---------------|
| Popup | popup.html + all js/ modules | chrome.runtime.sendMessage |
| Content Script | debug-config.js, google-user-detector.js, content.js | chrome.runtime.onMessage |
| Service Worker | background.js (importScripts debug-config.js) | chrome.runtime.onMessage, chrome.tabs.sendMessage |

## Module Initialization Sequence (popup.js)
```
1. TransactionCoordinator.initialize()
2. StorageManager.initialize()
3. StateManager.initialize()
4. UIManager.initialize()
5. TimerManager.initialize()
6. ModalManager.initialize()
7. SettingsManager.initialize() (async)
8. BackgroundScanner.initialize()
9. TranscriptRefreshManager.initialize()
10. RecordingManager.initialize()
11. SessionHistoryManager.initialize() (async)
12. SessionUIManager.initialize()
13. DataIntegrity.initialize() + verifyStorageIntegrity()
14. TranscriptManager.initialize()
15. SearchFilterManager.initialize()
16. ExportManager.initialize()
17. setupMainEventListeners()
18. setupMessageListener()
19. ThemeManager.initialize()
20. DebugManager.initialize()
21. validateGlobalFunctions()
22. restoreCompleteApplicationState()
```
