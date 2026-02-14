# Frontend Coding Guidelines — Vanilla JS Chrome Extension

> **Stack:** JavaScript ES6+ / Chrome Manifest V3 / Zero Dependencies
>
> **Reference:** See [frontend-stack.md](./frontend-stack.md) for technology stack details.

---

## I. Core Principles

**Philosophy:** Clean Code + DRY + SOLID adapted for vanilla JS modules

**Language:** English for code identifiers and comments. UI strings are in Polish (user-facing).

**Dependencies:** Zero external libraries. All functionality is implemented with native browser APIs and Chrome Extension APIs.

---

## II. Naming Conventions

| Type | Convention | Examples |
|------|-----------|----------|
| **Variables & functions** | camelCase | `isRecording`, `transcriptData`, `formatDuration()` |
| **Module names** | PascalCase (on `window`) | `StateManager`, `BackgroundScanner`, `ExportManager` |
| **Constants** | UPPER_SNAKE_CASE | `STORAGE_KEYS`, `TIMING`, `SESSION_STATES` |
| **Private methods** | `_` prefix + camelCase | `_privateMethod()`, `_replaceWithClone()` |
| **CSS classes** | kebab-case | `.session-item`, `.recording-controls`, `.modal-content` |
| **CSS variables** | `--` prefix + kebab-case | `--bg-primary`, `--text-muted`, `--btn-primary-bg` |
| **Storage keys** | camelCase strings | `'transcriptData'`, `'currentSessionId'`, `'realtimeMode'` |
| **DOM IDs** | camelCase | `recordBtn`, `transcriptContent`, `searchInput` |

**Lambda expressions — use descriptive names:**

```javascript
// CORRECT
const active = sessions.filter(session => session.isActive);
const names = participants.map(participant => participant.name);

// WRONG — single letters
const active = sessions.filter(s => s.isActive);
const names = participants.map(p => p.name);
```

---

## III. Size Limits

| Metric | Soft Limit | Hard Limit |
|--------|-----------|-----------|
| **Module lines** | < 200 | < 300 |
| **Function lines** | < 30 | < 50 |
| **Parameters** | <= 3 | <= 5 |
| **Nesting depth** | <= 3 | <= 4 |

When a module exceeds 300 lines, split into two modules. When a function exceeds 50 lines, extract helper functions.

---

## IV. Module Structure Template

Every module follows this standard pattern:

```javascript
// ============================================================================
// MODULE: ModuleName
// PURPOSE: Brief description of what this module does
// DEPENDENCIES: StorageManager, StateManager, AppConstants
// ============================================================================

window.ModuleName = {

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize the module
     */
    initialize() {
        this._setupEventListeners();
        console.log('🚀 [MODULE_NAME] ModuleName initialized');
    },

    // ========================================================================
    // PUBLIC METHODS
    // ========================================================================

    /**
     * Brief description
     * @param {string} param - Description
     * @returns {Promise<Object>} Description
     */
    async publicMethod(param) {
        try {
            // Implementation
        } catch (error) {
            console.error('❌ [MODULE_NAME] publicMethod failed:', error);
        }
    },

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    /**
     * Internal helper (underscore prefix = private)
     */
    _privateHelper() {
        // Implementation
    },

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    _setupEventListeners() {
        // Event bindings
    }
};
```

**Section headers** use `// ====` comment blocks to visually separate concerns within a module.

---

## V. State Management Rules

### StateManager as Single Source of Truth

All shared state goes through `StateManager` getter/setter pairs:

```javascript
// CORRECT — use StateManager for shared state
window.StateManager.setTranscriptData(data);
const transcript = window.StateManager.getTranscriptData();
window.StateManager.setRealtimeMode(true);

// WRONG — direct global mutation
window.transcriptData = data;
window.realtimeMode = true;
```

### Module-Private State

Use local variables (outside the exported object) for module-internal state:

```javascript
// Private to the module — not accessible from outside
let _mergeQueue = [];
let _isMerging = false;
let _mergeSequence = 0;

window.BackgroundScanner = {
    get _maxQueueSize() {
        return window.AppConstants.TIMING.MERGE_QUEUE_MAX_SIZE;
    },
    // ... methods that use the private variables
};
```

### Inter-Module Communication

Use optional chaining when calling other modules (they may not be loaded yet):

```javascript
// CORRECT — defensive with optional chaining
window.SearchFilterManager?.resetSearch();
window.UIManager?.updateButtonVisibility('RECORDING');

// WRONG — assumes module exists
window.SearchFilterManager.resetSearch();  // Throws if not loaded
```

---

## VI. Storage Patterns

### Always Use StorageManager

Never call `chrome.storage.local` directly — use the Promise wrapper:

```javascript
// CORRECT
const data = await window.StorageManager.getStorageData(['transcriptData', 'currentSessionId']);
await window.StorageManager.setStorageData({ transcriptData: newData });

// WRONG — raw Chrome API (callback-based, no error handling)
chrome.storage.local.get(['transcriptData'], (result) => { ... });
```

### Atomic Writes via TransactionCoordinator

When writing multiple related keys, use `TransactionCoordinator` to ensure atomicity:

```javascript
// CORRECT — atomic write with rollback on failure
const result = await window.TransactionCoordinator.executeTransaction([
    { key: 'realtimeMode', value: true },
    { key: 'recordingStartTime', value: new Date().toISOString() },
    { key: 'currentSessionId', value: sessionId }
]);

if (!result.success) {
    console.error('❌ Transaction failed:', result.error);
}

// WRONG — separate writes (can partially fail)
await window.StorageManager.setStorageData({ realtimeMode: true });
await window.StorageManager.setStorageData({ recordingStartTime: new Date().toISOString() });
```

### Use Constants for Storage Keys

```javascript
// CORRECT
const { STORAGE_KEYS } = window.AppConstants;
const data = await window.StorageManager.getStorageData([
    STORAGE_KEYS.TRANSCRIPT_DATA,
    STORAGE_KEYS.CURRENT_SESSION_ID
]);

// WRONG — magic strings
const data = await window.StorageManager.getStorageData(['transcriptData', 'currentSessionId']);
```

---

## VII. Error Handling

### Standard Pattern: try-catch + Emoji Logging

```javascript
async function riskyOperation() {
    try {
        const result = await window.StorageManager.getStorageData(['key']);
        console.log('✅ [CONTEXT] Operation succeeded:', result);
        return result;
    } catch (error) {
        console.error('❌ [CONTEXT] Operation failed:', error);
        return null;  // Graceful fallback
    }
}
```

### Nested try-catch for Multi-Phase Recovery

For critical paths (like state restoration), use nested try-catch to isolate failures:

```javascript
async function restoreState() {
    try {
        // Phase 1: Core state
        const sessionState = await window.StateManager.restoreStateFromStorage();

        try {
            // Phase 2: UI state (can fail independently)
            window.UIManager?.restoreUIState(uiState);
        } catch (uiError) {
            console.error('❌ [RECOVERY] UI restoration failed:', uiError);
            // Continue — UI defaults are acceptable
        }

        try {
            // Phase 3: Session state (can fail independently)
            await applySessionState(sessionState);
        } catch (sessionError) {
            console.error('❌ [RECOVERY] Session restoration failed:', sessionError);
            window.StateManager?.exposeGlobalVariables();  // Fallback
        }
    } catch (error) {
        console.error('❌ [RECOVERY] Critical failure:', error);
        applyEmergencyFallback();
    }
}
```

### Graceful Degradation with Optional Chaining

```javascript
// Safe property access — no crashes if structure is unexpected
const speakerName = entry?.speaker || 'Unknown';
const messageCount = data?.messages?.length || 0;
const isValid = window.SessionUtils?.isValidSessionId(id) ?? false;
```

---

## VIII. DOM Manipulation

### Use createElement for Dynamic Content

```javascript
// CORRECT — createElement + textContent
function createTranscriptEntry(entry) {
    const div = document.createElement('div');
    div.className = 'transcript-entry';

    const speaker = document.createElement('span');
    speaker.className = 'speaker-name';
    speaker.textContent = entry.speaker;  // Safe — no XSS

    const text = document.createElement('p');
    text.className = 'entry-text';
    text.textContent = entry.text;  // Safe — no XSS

    div.appendChild(speaker);
    div.appendChild(text);
    return div;
}

// WRONG — innerHTML (XSS risk with user-generated content)
container.innerHTML += `<div class="entry"><span>${entry.speaker}</span></div>`;
```

### textContent over innerHTML

Always use `textContent` when inserting user-generated or scraped data. Only use `innerHTML` for static HTML templates that contain no dynamic data.

### Event Delegation

For lists with many items, delegate events to the parent:

```javascript
// CORRECT — single listener on container
document.getElementById('sessionList').addEventListener('click', (e) => {
    const sessionItem = e.target.closest('.session-item');
    if (!sessionItem) return;

    const sessionId = sessionItem.dataset.sessionId;
    loadSession(sessionId);
});

// WRONG — listener on each item (memory leak on re-render)
sessions.forEach(session => {
    const el = document.getElementById(`session-${session.id}`);
    el.addEventListener('click', () => loadSession(session.id));
});
```

### Clean Up Event Listeners

When re-rendering elements, use the clone-replace pattern to remove stale listeners:

```javascript
/**
 * Replace element with a fresh clone (removes all event listeners)
 */
function replaceWithClone(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return null;
    el.replaceWith(el.cloneNode(true));
    return document.getElementById(elementId);  // Re-query after replace
}
```

---

## IX. CSS Conventions

### Custom Properties for All Colors and Spacing

Never hardcode colors or shadows. Always use CSS custom properties from `:root`:

```css
/* CORRECT */
.panel {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
    box-shadow: var(--shadow-md);
}

/* WRONG */
.panel {
    background: #ffffff;
    color: #1f2937;
    border: 1px solid #e5e7eb;
}
```

### Class Naming

- **Component prefix:** `.session-item`, `.transcript-entry`, `.modal-content`
- **State modifiers:** `.active`, `.show`, `.disabled`, `.recording`, `.loading`
- **Utility classes:** `.hidden`, `.empty-transcript`, `.danger-notice`

### No Inline Styles

```javascript
// CORRECT — toggle CSS classes
element.classList.add('active');
element.classList.remove('loading');

// ACCEPTABLE — show/hide toggles only
element.style.display = 'none';
element.style.display = 'flex';

// WRONG — styling in JS
element.style.backgroundColor = '#3b82f6';
element.style.padding = '12px';
```

### Theme Transitions

```css
.themed-element {
    transition: var(--transition-theme);
    /* expands to: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease */
}
```

---

## X. Logging & Debug

### Emoji Prefix System

All log messages use an emoji + `[CONTEXT]` pattern for easy filtering:

| Emoji | Meaning | Example |
|-------|---------|---------|
| `🚀` | Initialization | `console.log('🚀 [INIT] Application starting')` |
| `✅` | Success / completion | `console.log('✅ [EXPORT] File exported')` |
| `❌` | Error / failure | `console.error('❌ [STORAGE] Write failed:', error)` |
| `⚠️` | Warning | `console.warn('⚠️ [INTEGRITY] Orphaned session found')` |
| `🔄` | State change | `console.log('🔄 [STATE] realtimeMode set to true')` |
| `💾` | Storage operation | `console.log('💾 [STORAGE] Session saved')` |
| `🟢` | Activation / start | `console.log('🟢 [RECORDING] Recording started')` |
| `🔴` | Deactivation / stop | `console.log('🔴 [RECORDING] Recording stopped')` |
| `🔶` | Background operation | `console.log('🔶 [BACKGROUND] Scan #42')` |
| `🎨` | Theme change | `console.log('🎨 [THEME] Switched to dark')` |
| `🕐` | Timer operation | `console.log('🕐 [TIMER] Duration updated')` |
| `👤` | User detection | `console.log('👤 [CONTENT] User name detected')` |
| `📁` | File / history | `console.log('📁 [HISTORY] Session loaded')` |
| `🔧` | Configuration | `console.log('🔧 [CONFIG] Settings applied')` |

### Debug Toggle (debug-config.js)

```javascript
const DEBUG_ENABLED = false;  // Set to true during development

if (!DEBUG_ENABLED) {
    console.log = () => {};    // Silenced
    console.debug = () => {};  // Silenced
    console.info = () => {};   // Silenced
    // console.warn — ALWAYS active
    // console.error — ALWAYS active
}
```

**Rules:**
- `console.error` — always preserved, use for actual errors
- `console.warn` — always preserved, use for important warnings
- `console.log` — controlled by `DEBUG_ENABLED`, use for informational messages
- Never leave `console.log` for temporary debugging — use `DEBUG_ENABLED` toggle

---

## XI. Security

### Content Script Isolation

Content scripts run in an isolated world but share the DOM. Follow these rules:

```javascript
// CORRECT — use textContent (safe from XSS)
element.textContent = scrapedText;

// WRONG — innerHTML with scraped data (XSS vector)
element.innerHTML = scrapedText;
```

### CSP Compliance

Chrome MV3 enforces strict Content Security Policy. These are prohibited:

```javascript
// PROHIBITED — eval and dynamic code execution
eval('code');
new Function('code');
setTimeout('code', 1000);  // String form
document.write('<script>...');

// CORRECT — function references
setTimeout(callback, 1000);  // Function form
```

### No External Resources

All resources must be bundled with the extension. No CDN links, no external scripts, no remote CSS.

### Sanitize User Input

Settings inputs and editable fields must be validated:

```javascript
// Trim and limit length
const displayName = input.value.trim().substring(0, 50);

// Validate format before using
if (!window.SessionUtils.isValidSessionId(sessionId)) {
    console.error('❌ Invalid session ID format');
    return;
}
```

---

## XII. Performance

### Polling Intervals

| Operation | Interval | Constant |
|-----------|----------|----------|
| Background scanning | 2000ms | `TIMING.SCAN_INTERVAL` |
| Duration timer update | 1000ms | `TIMING.DURATION_UPDATE_INTERVAL` |
| Session auto-save | 2000ms | `TIMING.SESSION_SAVE_DELAY` |
| Debounce (search/input) | 300ms | `TIMING.DEBOUNCE_DELAY` |
| Transaction timeout | 5000ms | `TIMING.TRANSACTION_TIMEOUT` |
| State restoration timeout | 10000ms | `TIMING.STATE_RESTORATION_MAX_WAIT` |

### Debouncing

Use debounce for search input and other frequent events:

```javascript
let searchTimeout = null;

searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performSearch(searchInput.value);
    }, window.AppConstants.TIMING.DEBOUNCE_DELAY);
});
```

### Storage Access Optimization

Batch reads — fetch all needed keys in a single call:

```javascript
// CORRECT — single read
const data = await window.StorageManager.getStorageData([
    STORAGE_KEYS.TRANSCRIPT_DATA,
    STORAGE_KEYS.CURRENT_SESSION_ID,
    STORAGE_KEYS.SESSION_HISTORY
]);

// WRONG — multiple reads (3 async operations)
const transcript = await window.StorageManager.getStorageData([STORAGE_KEYS.TRANSCRIPT_DATA]);
const sessionId = await window.StorageManager.getStorageData([STORAGE_KEYS.CURRENT_SESSION_ID]);
const history = await window.StorageManager.getStorageData([STORAGE_KEYS.SESSION_HISTORY]);
```

### DOM Batch Updates

When updating many elements, minimize reflows:

```javascript
// CORRECT — build in fragment, append once
const fragment = document.createDocumentFragment();
entries.forEach(entry => {
    fragment.appendChild(createTranscriptEntry(entry));
});
container.innerHTML = '';  // Clear once
container.appendChild(fragment);  // Append once

// WRONG — append in loop (causes reflow each time)
entries.forEach(entry => {
    container.appendChild(createTranscriptEntry(entry));
});
```

### Merge Queue Protection

BackgroundScanner limits its merge queue to prevent memory leaks:

```javascript
if (this._mergeQueue.length >= this._maxQueueSize) {
    // Drop lowest priority item
    this._mergeQueue.sort((a, b) => b.priority - a.priority);
    this._mergeQueue.pop();
}
```

---

## XIII. Async Patterns

### async/await Preferred

```javascript
// CORRECT — async/await
async function loadSession(sessionId) {
    try {
        const data = await window.StorageManager.getStorageData([STORAGE_KEYS.SESSION_HISTORY]);
        const session = data.sessionHistory?.find(s => s.id === sessionId);
        return session;
    } catch (error) {
        console.error('❌ [SESSION] Load failed:', error);
        return null;
    }
}

// WRONG — nested callbacks
function loadSession(sessionId) {
    chrome.storage.local.get(['sessionHistory'], (result) => {
        if (chrome.runtime.lastError) {
            // ...
        } else {
            const session = result.sessionHistory.find(s => s.id === sessionId);
            // ...
        }
    });
}
```

### Promise Wrapping for Chrome Callback APIs

StorageManager wraps all Chrome APIs in Promises:

```javascript
function getStorageData(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result);
            }
        });
    });
}
```

### Timeouts for External Operations

```javascript
async _executeWithTimeout(promise, timeoutMs) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
        )
    ]);
}
```

---

## XIV. Constants Organization

All magic numbers and strings are centralized in `js/utils/constants.js`:

```javascript
window.AppConstants = {
    TIMING: {
        DURATION_UPDATE_INTERVAL: 1000,
        SESSION_SAVE_DELAY: 2000,
        DEBOUNCE_DELAY: 300,
        TRANSACTION_TIMEOUT: 5000,
        MERGE_QUEUE_MAX_SIZE: 50,
        // ...
    },

    STORAGE_KEYS: {
        TRANSCRIPT_DATA: 'transcriptData',
        CURRENT_SESSION_ID: 'currentSessionId',
        SESSION_HISTORY: 'sessionHistory',
        // ...
    },

    SESSION_STATES: {
        ACTIVE_RECORDING: 'active_recording',
        PAUSED_SESSION: 'paused_session',
        HISTORICAL_SESSION: 'historical_session',
        NEW_SESSION: 'new_session'
    }
};
```

**Rule:** When you need a numeric value or string literal that has semantic meaning, add it to `AppConstants` and reference it. Exception: loop counters, boolean literals, and trivial math (`count + 1`).

---

## XV. Chrome Extension Messaging

### Popup → Background → Content Script

```javascript
// Popup sends to background
chrome.runtime.sendMessage({
    action: 'startBackgroundScanning',
    tabId: meetTabId
}, (response) => {
    if (response?.success) {
        console.log('✅ Background scanning started');
    }
});

// Background routes message to content script
chrome.tabs.sendMessage(tabId, { action: 'scrapeTranscript' }, (response) => {
    if (response?.success) {
        // Process scraped data
    }
});
```

### Message Handler Pattern

```javascript
// In background.js — always return true for async responses
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startBackgroundScanning') {
        startBackgroundScanning(request.tabId);
        sendResponse({ success: true });
    } else if (request.action === 'stopBackgroundScanning') {
        stopBackgroundScanning();
        sendResponse({ success: true });
    }
    return true;  // Required for async sendResponse
});
```

---

## XVI. Summary Checklist

### Module Structure
- [ ] Module exported on `window` as PascalCase name
- [ ] Has `initialize()` method
- [ ] Private methods prefixed with `_`
- [ ] Section headers with `// ====` separators
- [ ] Under 300 lines

### Naming
- [ ] camelCase variables and functions
- [ ] PascalCase module names
- [ ] UPPER_SNAKE_CASE constants
- [ ] kebab-case CSS classes
- [ ] Descriptive lambda parameters (not single letters)

### State & Storage
- [ ] Shared state via `StateManager` getters/setters
- [ ] Storage via `StorageManager` (never raw `chrome.storage`)
- [ ] Multi-key writes via `TransactionCoordinator`
- [ ] Storage keys from `AppConstants.STORAGE_KEYS`
- [ ] Optional chaining for cross-module calls

### Error Handling
- [ ] try-catch around all async operations
- [ ] Emoji + `[CONTEXT]` log prefixes
- [ ] `console.error` for errors, `console.warn` for warnings
- [ ] Graceful fallbacks (return `null`/defaults, not crash)
- [ ] Nested try-catch for multi-phase recovery paths

### DOM & CSS
- [ ] `textContent` over `innerHTML` for dynamic data
- [ ] `createElement` for building DOM nodes
- [ ] Event delegation for lists
- [ ] CSS custom properties — no hardcoded colors
- [ ] No inline styles (except `display` toggles)
- [ ] Class toggling for state changes

### Performance
- [ ] Timing constants from `AppConstants.TIMING`
- [ ] Debounced search/input handlers
- [ ] Batched storage reads
- [ ] DOM fragment for bulk insertions
- [ ] Merge queue size limits

### Security
- [ ] No `eval()`, `new Function()`, `document.write()`
- [ ] No external resource loading
- [ ] Input validation and length limits
- [ ] `textContent` for user-generated content

### Async
- [ ] async/await over callbacks
- [ ] Promise-wrapped Chrome APIs
- [ ] Timeouts for external operations
- [ ] Error handling in every async path

---

**Last Updated:** February 2026
**Version:** 1.0.0
