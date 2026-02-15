# External Dependencies

Note: This project has NO npm packages. All dependencies are browser/Chrome Extension APIs.

## Chrome Extension APIs

| API | Namespace | Used by (Symbol IDs) | Purpose |
|-----|-----------|---------------------|---------|
| Storage (local) | `chrome.storage.local` | S002, S005, S011, S014, S063, S065, S066 | Persistent local storage for transcript data, session history, recording state, checkpoints, transaction markers |
| Storage (sync) | `chrome.storage.sync` | S019, S023, S051 | Synced storage for user settings (display name, Google name, prompt preferences) |
| Runtime messaging | `chrome.runtime.onMessage` | S051, S063, S071, S014 | Message passing between popup, background, and content scripts |
| Runtime sendMessage | `chrome.runtime.sendMessage` | S013, S014, S018, S063 | Send messages to background script (start/stop scanning) and relay updates to popup |
| Runtime lastError | `chrome.runtime.lastError` | S002, S013, S014, S018, S019, S023 | Error checking after async Chrome API calls |
| Runtime getURL | `chrome.runtime.getURL` | S019, S023 | Resolve extension-relative URLs for prompts/standard.md resource |
| Runtime onInstalled | `chrome.runtime.onInstalled` | S063 | Inject content scripts into existing Meet tabs on extension install |
| Tabs query | `chrome.tabs.query` | S013, S018, S023, S014, S063 | Find active tab, Google Meet tabs for message routing |
| Tabs sendMessage | `chrome.tabs.sendMessage` | S013, S023, S063 | Send scrapeTranscript/enableCaptions/updateUserDisplayName to content script |
| Tabs get | `chrome.tabs.get` | S014, S063 | Verify tab existence and URL during background scanning |
| Tabs onRemoved | `chrome.tabs.onRemoved` | S063 | Stop background scanning when target tab closes |
| Tabs onUpdated | `chrome.tabs.onUpdated` | S063 | Stop background scanning when target tab navigates |
| Scripting | `chrome.scripting.executeScript` | S063 | Inject content script into Google Meet tabs |
| Downloads | `chrome.downloads.download` | S019, S021 | Save exported transcript files with save-as dialog |
| Action onClicked | `chrome.action.onClicked` | S063 | Inject content script when extension icon clicked |
| importScripts | `importScripts()` | S063 | Load debug-config.js in service worker context |

## Web Platform APIs

| API | Used by (Symbol IDs) | Purpose |
|-----|---------------------|---------|
| DOM: `document.querySelector/querySelectorAll` | S003, S008, S009, S013, S016, S017, S020, S021, S022, S023, S051, S052, S059, S060, S062 | Query DOM elements for UI manipulation and transcript scraping |
| DOM: `document.getElementById` | S003, S007, S008, S013, S017, S019, S020, S021, S022, S023 | Get specific elements by ID for event binding and state updates |
| DOM: `document.createElement` | S008, S016, S017, S019 | Create transcript entries, toast notifications, session list items |
| DOM: `document.body` | S019 | Append/remove fallback textarea for clipboard copy |
| DOM: `document.documentElement` | S001, S022 | Get/set `data-theme` attribute for theming |
| DOM: `element.classList` | S003, S008, S013, S016, S017, S020, S021, S022 | Toggle CSS classes (active, collapsed, show, expanded) |
| DOM: `element.cloneNode` | S019 | Clone export buttons to remove stale event listeners |
| DOM: `element.replaceWith` | S019 | Replace elements with fresh clones |
| Events: `addEventListener` | S003, S008, S013, S017, S019, S020, S021, S022, S023, S067, S070, S071 | Bind click, keydown, input, change, mouseenter/leave, DOMContentLoaded, beforeunload, error, unhandledrejection |
| Events: `dispatchEvent` | S059 | Dispatch synthetic keyboard events to toggle captions |
| Events: `KeyboardEvent` constructor | S059 | Create keydown/keyup events for caption toggle ('c' key) |
| Clipboard API | `navigator.clipboard.writeText` | S019 | Copy exported transcript content to clipboard |
| Clipboard fallback | `document.execCommand('copy')` | S019 | Legacy clipboard copy for older browsers |
| Blob API | `new Blob()` | S019, S021 | Create binary file objects for download |
| URL API | `URL.createObjectURL` / `URL.revokeObjectURL` | S019, S021 | Generate temporary URLs for Blob downloads and release them |
| Fetch API | `fetch()` | S019, S023 | Load prompts/standard.md template from extension resources |
| Web Storage | [REMOVED] `localStorage` no longer used | S022 | Theme now persisted via UIManager → chrome.storage.local |
| Timers | `setInterval` / `clearInterval` | S001, S004, S014, S062, S063 | Duration tracking, background scanning (3s), meeting start detection (2s) |
| Timers | `setTimeout` / `clearTimeout` | S001, S008, S017, S019, S020 | Debounced search, animation delays, toast auto-dismiss, state restoration polling |
| JSON | `JSON.parse` / `JSON.stringify` | S001, S005, S014, S015, S019 | Deep clone transcript data, serialize/deserialize storage data |
| Date API | `new Date()` / `Date.now()` / `.toISOString()` / `.toLocaleString()` | S001, S004, S005, S007, S010, S013, S014, S019, S051, S063, S065, S066 | Timestamps for sessions, recordings, exports, checkpoints |
| Promise API | `Promise` / `Promise.race` | S002, S005, S019, S023 | Wrap callback-based Chrome APIs, transaction timeout racing |
| Location API | `window.location.href` | S009, S051, S052 | Get current Google Meet URL for validation and metadata |
| Console API | `console.log/warn/error` | All modules | Debug logging with emoji prefixes |
| RegExp | `RegExp.exec` / `.test` / `.match` | S051, S052, S053, S054, S055, S056, S057 | Name pattern matching, transcript validation, text sanitization |
| String: `charCodeAt` | S061 | Generate simple hash for change detection |
| Map | `Map` | S005 | Track active transactions in TransactionCoordinator |
| Set | `Set` | S001, S020 | Track expanded entries and active participant filters |

## Chrome Extension Permissions (from manifest.json)

| Permission | Type | Required for |
|------------|------|-------------|
| `activeTab` | Permission | Access to the currently active tab for content script injection and messaging |
| `storage` | Permission | `chrome.storage.local` and `chrome.storage.sync` for data persistence |
| `downloads` | Permission | `chrome.downloads.download` API for transcript file export |
| `scripting` | Permission | `chrome.scripting.executeScript` for dynamic content script injection |
| `https://meet.google.com/*` | Host Permission | Content script injection and tab messaging on Google Meet pages |

## Content Security Policy

No explicit CSP defined in manifest.json. Uses Chrome Manifest V3 defaults which restrict inline script execution in extension pages.

## Web Accessible Resources

| Resource | Type | Accessible from |
|----------|------|-----------------|
| `prompts/*.md` | Markdown templates | `https://meet.google.com/*` only |

## External Resources

| Resource | Type | Loaded from |
|----------|------|-------------|
| `style.css` | Stylesheet | Local extension bundle |
| `session-history.css` | Stylesheet | Local extension bundle |
| `debug-config.js` | Configuration | Local extension bundle (loaded via `<script>` in popup, `importScripts` in service worker, content script injection in manifest) |
| `prompts/standard.md` | LLM prompt template | Local extension bundle (fetched via `chrome.runtime.getURL`) |
| SVG icons | Inline SVG | Embedded directly in `popup.html` (no external icon libraries) |

No external CDNs, fonts, analytics, or third-party scripts are loaded. The extension is fully self-contained.
