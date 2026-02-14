# Fix: Background Transcript Scanning Stops After Popup Close/Reopen

## Context

Users report that after closing the popup and reopening it, transcript refreshing sometimes stops working. They must close/reopen the popup again to fix it. The normal usage pattern is: start recording → close popup → meeting continues → reopen popup later.

**Root cause:** The scanning loop (`setInterval` every 3s) runs in the Manifest V3 service worker (`background.js`). Chrome terminates idle service workers after ~30 seconds, killing the scanning loop. Additionally, the error handler in the scan loop permanently stops scanning on transient errors, and the popup's reactivation logic has race conditions and silent failures.

**Solution:** Move the scanning loop from the service worker into the content script (`content.js`), which runs as long as the Google Meet tab is open and is never terminated by Chrome. The content script scrapes the DOM directly (no messaging needed) and saves results to `chrome.storage.local`. The service worker becomes a thin relay for start/stop commands.

## Architecture Change

**Before (fragile):**
```
Popup → Service Worker (setInterval 3s, killed by Chrome) → messaging → Content Script → DOM
```

**After (reliable):**
```
Popup → Content Script (setInterval 3s, lives as long as Meet tab) → DOM → chrome.storage.local
```

## Changes

### 1. Content Script Self-Scanning (`content.js`)

Add scanning loop directly in content script:

- Add state variables: `let isScanning = false; let scanInterval = null; let scanningSessionId = null; let scanCount = 0;`
- Add `startScanning(sessionId)` function:
  - Sets `isScanning = true`, stores `sessionId`
  - Creates `setInterval` every 3000ms that:
    - Calls existing `scrapeTranscript()` (already in content.js)
    - If messages found: saves to `chrome.storage.local` under `backgroundScan_${tabId}` key (same format as current background.js)
    - Creates checkpoints every 10 scans (reuse existing logic from background.js)
    - Tries `chrome.runtime.sendMessage({action: 'backgroundScanUpdate', data})` to notify popup (catch silently if popup closed)
- Add `stopScanning()` function: clears interval, sets `isScanning = false`
- Add message handlers for `startContentScanning` and `stopContentScanning` actions
- Add `getScanningStatus` handler returning `{isScanning, scanCount}`
- On content script load: check `chrome.storage.local` for `scanningState` and auto-resume if active (handles tab refresh)

### 2. Simplify Service Worker (`background.js`)

Remove scanning logic from service worker, keep it as a relay:

- Remove: `isScanning`, `scanningTabId`, `scanInterval` variables
- Remove: `startBackgroundScanning()` function (the setInterval loop)
- Remove: `stopBackgroundScanning()` function
- Remove: `createCheckpoint()` and `cleanupOldCheckpoints()` functions
- Remove: `tabs.onRemoved` and `tabs.onUpdated` listeners for scanning
- Update message handler for `startBackgroundScanning`: relay to content script via `chrome.tabs.sendMessage(tabId, {action: 'startContentScanning', sessionId})`
- Update message handler for `stopBackgroundScanning`: relay to content script via `chrome.tabs.sendMessage(tabId, {action: 'stopContentScanning'})`
- Update `getScanningStatus`: relay to content script
- Keep: `onInstalled` listener, `action.onClicked` listener, `updateGoogleUserName` relay

### 3. Fix Race Condition in Popup (`js/features/background-scanner.js`, line 20)

Even with the new architecture, the popup message listener has a race condition:

- Add `_pendingBackgroundUpdates: []` queue property
- In `handleBackgroundScanUpdate`: if `!window.realtimeMode`, push to queue instead of dropping
- Add `processPendingUpdates()` method that drains the queue
- Call `processPendingUpdates()` at end of `reactivateAfterRestore()`

### 4. Fix Silent Reactivation Failure (`js/features/background-scanner.js` line 329 + `popup.js` line 245)

- Change `return { success: true, ...}` to `return { success: restartSuccess, ...}`
- In `popup.js`: check `restartSuccess === false` and show error to user

### 5. Fix `_sendRuntimeMessage` (`js/features/background-scanner.js`, lines 211-221)

- Add `chrome.runtime.lastError` check before inspecting response

### 6. Persist Scanning State (`content.js`)

For resilience against tab refresh (Meet tab reloaded):
- On `startScanning`: save `{isScanning: true, sessionId, tabId}` to `chrome.storage.local` key `scanningState`
- On `stopScanning`: clear `scanningState`
- On content script load: check `scanningState` and auto-resume if active

## Files to Modify

| File | Nature of Change |
|------|-----------------|
| `content.js` | Add self-scanning loop with `setInterval`, storage persistence, checkpoint creation |
| `background.js` | Remove scanning logic, become thin relay to content script |
| `js/features/background-scanner.js` | Fix race condition (message queue), fix silent failure, fix lastError |
| `popup.js` | Check `restartSuccess` in reactivation result |
| `manifest.json` | No changes needed (already has `storage` permission) |

## Key Design Decisions

1. **Content script owns the scanning loop** — it lives as long as the Google Meet tab, immune to service worker termination
2. **Google Meet plays audio** — Chrome does NOT throttle timers in tabs with audio playback, guaranteeing 3-second intervals
3. **Same storage format** — `backgroundScan_${tabId}` key and checkpoint format stay the same, so the popup's merge/recovery logic (`_recoverAccumulatedData`, `mergeAccumulatedData`) works without changes
4. **Service worker as relay only** — popup sends start/stop to service worker, service worker forwards to content script. This preserves the existing popup API (`BackgroundScanner.startBackgroundScanning(tabId)`)
5. **Auto-resume on tab refresh** — content script checks `scanningState` on load and resumes if active

## Verification

1. Start recording, close popup, wait 5+ minutes, reopen popup — transcript should have all new messages with no gaps
2. Start recording, close popup, refresh Meet tab, reopen popup — scanning resumes after tab reload
3. Start recording, close popup, check `chrome://serviceworker-internals` — service worker may be terminated but scanning continues via content script
4. Rapid popup close/reopen cycles — no duplicate intervals, no data loss
5. Close the Meet tab entirely — scanning stops, popup shows appropriate error on reopen
6. Check content script console (F12 on Meet tab) for scanning logs
