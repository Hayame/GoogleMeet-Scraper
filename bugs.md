# Known Bugs

## 1. Duration Calculation Accumulation Bug

### Description
When the popup is closed and reopened during an active recording session, the session duration is incorrectly accumulated, causing the displayed time to be much longer than the actual recording time.

### How to Reproduce
1. Start recording a session at 10:00:00
2. Close the popup at 10:01:00 (60 seconds recorded)
3. Wait 1 minute
4. Reopen the popup at 10:02:00
5. The duration will show 3:00 instead of 2:00

### Technical Details
The bug is caused by the automatic duration saving mechanism in `updateDurationDisplay()` function (popup.js):

```javascript
// Lines 1453-1458
if (totalDuration % 10 === 0) {
    chrome.storage.local.set({ 
        sessionTotalDuration: sessionTotalDuration,
        currentSessionDuration: currentSessionDuration 
    });
}
```

When popup reopens, it adds the saved `currentSessionDuration` to `sessionTotalDuration`:

```javascript
// Lines 155-158
if (result.currentSessionDuration) {
    sessionTotalDuration += result.currentSessionDuration;
    chrome.storage.local.remove(['currentSessionDuration']);
}
```

This causes cumulative addition every time the popup is reopened.

### Proposed Solution
1. Remove the periodic duration saving mechanism (lines 1453-1458)
2. Calculate duration dynamically from `recordingStartTime` only
3. Save `sessionTotalDuration` only when recording is paused/stopped
4. Remove `currentSessionDuration` from all storage operations

### Impact
- Medium severity: Incorrect duration display
- Does not affect transcript data
- Confuses users about actual session length

---

## 2. Automatic Session Termination Bug

### Description
Recording sessions appear to stop when the popup is reopened after being closed, especially if the user switched to a different tab.

### Root Cause
When the popup is reopened, it tries to restore the recording state but fails to restart background scanning if the currently active tab is not Google Meet.

The issue occurs in `activateRealtimeMode()` function:
```javascript
// Line 522 - checks CURRENTLY ACTIVE tab
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
if (tab && tab.url.includes('meet.google.com')) {
    // Only starts background scanning if current tab is Meet
}
```

### How to Reproduce
1. Start recording on a Google Meet tab
2. Close the popup
3. Switch to a different tab (e.g., Gmail)
4. Reopen the popup
5. The UI shows "Recording active" but background scanning is not running
6. Recording appears to have stopped

### Proposed Solution
1. Save the Google Meet tab ID when starting recording
2. When restoring state, use the saved tab ID instead of the current active tab
3. Check if the saved tab still exists and is still a Meet page
4. If not, show appropriate error message

### Impact
- High severity: Users lose recording functionality
- Confusing UX: UI shows recording active but it's not actually recording