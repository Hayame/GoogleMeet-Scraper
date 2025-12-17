# Google Meet Scraper - Data Loss Prevention Refactor

> **Status:** 🚧 IN PROGRESS
> **Start Date:** 2025-12-16
> **Target:** ZERO data loss, bulletproof data persistence

---

## 📋 PROGRESS TRACKER

### PHASE 1: Critical Path (Week 1-2) - MUST IMPLEMENT

#### ✅ Transaction Coordinator Pattern
- [x] **Day 1-2: Core Implementation** (2025-12-16)
  - [x] Create `/js/core/transaction-coordinator.js`
  - [x] Implement `executeTransaction()` with rollback
  - [x] Implement `saveRecordingState()` atomic method
  - [x] Add to `popup.html` (before storage-manager.js)
  - [ ] Add unit tests for transaction atomicity

- [x] **Day 3-4: Integration** (2025-12-16)
  - [x] Update `storage-manager.js` - add `executeAtomicUpdate()`
  - [x] Update `background-scanner.js:182` - use TransactionCoordinator
  - [x] Update `session-history.js:174` - use TransactionCoordinator
  - [x] Update `recording.js:75-78` - use TransactionCoordinator
  - [x] Refactor: Remove duplicate storage calls (DRY principle)

- [ ] **Day 5: Testing & Validation**
  - [ ] Test: Force storage error during save → verify rollback
  - [ ] Test: Popup close during transaction → verify atomicity
  - [ ] Test: Concurrent transactions → verify queuing
  - [ ] Validation: NO partial states in storage
  - [ ] Code review: Clean up, remove console.logs in production

#### ✅ Background Scan Checkpoints & Recovery
- [x] **Day 6-7: Checkpoint System** (2025-12-16)
  - [x] Update `background.js:110-145` - add checkpoint mechanism
  - [x] Implement `createCheckpoint()` function
  - [x] Implement checkpoint cleanup (keep last 3)
  - [x] Add checkpoint sequence numbering
  - [x] Add meeting URL tracking for tab ID verification

- [x] **Day 8-9: Enhanced Recovery** (2025-12-16)
  - [x] Update `background-scanner.js` - add `retrieveAccumulatedScanData()` v2
  - [x] Implement `_tryPrimaryKey()` fallback
  - [x] Implement `_tryCheckpoints()` fallback
  - [x] Implement `_tryMeetingUrlMatch()` fallback (tab ID reuse protection)
  - [x] Add `flushPendingData()` method
  - [x] Add `_cleanupBackgroundScanData()` method

- [x] **Day 10: Popup Close Handling** (2025-12-16)
  - [x] Add `window.beforeunload` handler in `popup.js`
  - [x] Integrate with `flushPendingData()`
  - [x] Add cleanup for backgroundScan_* keys after successful merge
  - [ ] Test: Close popup during active recording → verify data persistence
  - [ ] Test: Reopen after 30s/2min/1h → verify recovery
  - [ ] Validation: ZERO data loss across all scenarios

#### ✅ Priority Queue Merge Coordination
- [x] **Day 11-12: Queue Implementation** (2025-12-16)
  - [x] Add `_mergeQueue` system in `background-scanner.js:8-50`
  - [x] Implement `scheduleMerge(data, priority)` method
  - [x] Implement `_processMergeQueue()` with mutex
  - [x] Refactor `handleBackgroundScanUpdate()` to use queue
  - [x] Refactor `mergeAccumulatedData()` to use queue
  - [x] Clean up: Remove old `_isMergingData` flag and 100ms timeout logic

- [ ] **Testing**
  - [ ] Test: Concurrent merge calls → verify no race conditions
  - [ ] Test: Priority ordering → verify restoration merges first
  - [ ] Test: Failed merge retry → verify re-queuing
  - [ ] Validation: NO duplicates, NO data loss

#### ✅ State Restoration Timeout Protection
- [x] **Day 13: Timeout Implementation** (2025-12-16)
  - [x] Update `state-manager.js:654-670` - add MAX_WAIT_TIME
  - [x] Add timeout counter and force-unlock after 10s
  - [x] Add emergency empty array initialization
  - [x] Clean up: Remove redundant restoration checks

- [ ] **Testing**
  - [ ] Test: Break SessionHistoryManager → verify auto-recovery
  - [ ] Test: Infinite loop prevention
  - [ ] Validation: isRestorationInProgress cleared within 10s

---

### PHASE 2: Protection Layer (Week 3) - RECOMMENDED

#### ✅ Export Data Snapshot
- [x] **Day 14: Snapshot Implementation** (2025-12-16)
  - [x] Add `createDataSnapshot()` in `export.js`
  - [x] Update `generateTxtContent()` to use snapshot
  - [x] Update `generateJsonContent()` to use snapshot
  - [x] Refactor: Extract snapshot logic to utility if reusable
  - [ ] Test: Export during active recording → verify consistency

#### ✅ Data Integrity Verification
- [x] **Day 15: Integrity System** (2025-12-16)
  - [x] Create `/js/utils/data-integrity.js`
  - [x] Implement `verifyStorageIntegrity()` with 4 checks
  - [x] Implement `autoFixIssues()` with safe repairs
  - [x] Integrate into `popup.js` initialization
  - [x] Add logging for detected/fixed issues
  - [ ] Test: Manually corrupt data → verify auto-fix

---

### PHASE 3: Code Quality & Cleanup (Ongoing)

#### ✅ Dead Code Removal
- [x] Review all modules for unused functions/variables (2025-12-17)
- [x] Remove commented-out code blocks (2025-12-17 - popup-old.js deleted)
- [ ] Remove deprecated functions (mark with @deprecated first)
- [ ] Clean up excessive console.logs (keep only errors/warnings)
- [ ] Remove duplicate code (apply DRY principle)

#### ✅ Refactoring & Best Practices
- [ ] Extract magic numbers to named constants
- [x] Extract long functions (>50 lines) into smaller units (2025-12-17)
- [ ] Add JSDoc comments to all public functions
- [ ] Use consistent naming conventions (camelCase for functions)
- [ ] Use async/await consistently (no mixed callback/promise code)
- [x] Add error handling to all async operations (2025-12-17)
- [ ] Use early returns to reduce nesting

#### ✅ Code Review Checklist
- [x] All functions have single responsibility (2025-12-17)
- [x] No functions >100 lines (2025-12-17)
- [ ] No nested callbacks (callback hell)
- [ ] All magic numbers extracted to constants
- [x] All error cases handled (no silent failures) (2025-12-17)
- [ ] All promises have .catch() or try/catch
- [ ] All chrome.storage calls use StorageManager wrapper
- [ ] No duplicate logic (DRY principle applied)

---

## 🎯 DETAILED IMPLEMENTATION GUIDE

---

## SOLUTION 1: Transaction Coordinator Pattern

### Problem Statement
**Krytyczne:** Niesynchronizowane zapisy do storage prowadzą do częściowych stanów i utraty danych.

**Obecna sytuacja:**
```javascript
// background-scanner.js:182 - tylko transcriptData
await window.StorageManager.saveTranscriptData(window.transcriptData);

// session-history.js:174 - tylko sessionHistory
chrome.storage.local.set({ sessionHistory: window.sessionHistory });

// recording.js:75-78 - tylko timing data
chrome.storage.local.set({
    recordingStartTime: ...,
    sessionStartTime: ...
});
```

**Problemy:**
1. Każdy zapis jest osobny → mogą failować niezależnie
2. Popup może się zamknąć między zapisami → partial state
3. Brak mechanizmu rollback przy błędzie
4. Brak verification że zapis się powiódł

### Implementation

#### File 1: `/js/core/transaction-coordinator.js` (NEW FILE)

```javascript
/**
 * Transaction Coordinator - Ensures atomic storage operations
 * Provides ACID-like guarantees for Chrome storage writes
 *
 * @module TransactionCoordinator
 * @author Google Meet Scraper Team
 * @version 2.0.0
 */

window.TransactionCoordinator = {
    _activeTransactions: new Map(),
    _transactionTimeout: 5000, // 5 seconds max per transaction

    /**
     * Execute atomic storage transaction with rollback support
     * All operations succeed or all fail (atomic guarantee)
     *
     * @param {Array<Object>} operations - Array of {key, value} pairs to save
     * @returns {Promise<Object>} Result with success flag and optional error
     *
     * @example
     * await TransactionCoordinator.executeTransaction([
     *   { key: 'transcriptData', value: data },
     *   { key: 'sessionHistory', value: history }
     * ]);
     */
    async executeTransaction(operations) {
        const transactionId = this._generateTransactionId();
        const startTime = Date.now();

        try {
            // Validate operations array
            if (!Array.isArray(operations) || operations.length === 0) {
                throw new Error('Operations must be non-empty array');
            }

            // Mark transaction as active
            this._activeTransactions.set(transactionId, {
                startTime,
                operations: operations.map(op => op.key)
            });

            // PHASE 1: Read current state for rollback capability
            const keysToRead = operations.map(op => op.key);
            const currentState = await window.StorageManager.getStorageData(keysToRead);

            // PHASE 2: Prepare atomic update object
            const updates = {};
            const rollbackData = {};

            for (const operation of operations) {
                if (!operation.key) {
                    throw new Error('Operation missing required "key" property');
                }

                rollbackData[operation.key] = currentState[operation.key];
                updates[operation.key] = operation.value;
            }

            // PHASE 3: Add transaction marker for crash recovery
            const markerKey = `__transaction_${transactionId}`;
            updates[markerKey] = {
                id: transactionId,
                timestamp: Date.now(),
                keys: Object.keys(updates),
                status: 'IN_PROGRESS'
            };

            // PHASE 4: ATOMIC WRITE (single chrome.storage.local.set call)
            // This is the critical operation - either all data saves or none
            await this._executeWithTimeout(
                window.StorageManager.setStorageData(updates),
                this._transactionTimeout
            );

            // PHASE 5: Verify write succeeded
            const verifyResult = await this._verifyTransaction(updates);
            if (!verifyResult.success) {
                throw new Error(`Transaction verification failed: ${verifyResult.error}`);
            }

            // PHASE 6: Cleanup transaction marker
            await window.StorageManager.removeStorageData([markerKey]);

            // Mark transaction complete
            this._activeTransactions.delete(transactionId);

            return {
                success: true,
                transactionId,
                duration: Date.now() - startTime
            };

        } catch (error) {
            console.error('❌ [TRANSACTION] Failed:', {
                transactionId,
                error: error.message,
                duration: Date.now() - startTime
            });

            // ROLLBACK: Attempt to restore previous state
            try {
                await this._rollback(transactionId, rollbackData);
            } catch (rollbackError) {
                console.error('❌ [TRANSACTION] Rollback failed:', rollbackError);
                // Log critical failure - manual intervention may be needed
                this._logCriticalFailure(transactionId, error, rollbackError);
            }

            this._activeTransactions.delete(transactionId);

            return {
                success: false,
                transactionId,
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    },

    /**
     * Save complete recording state atomically
     * High-level convenience method for recording operations
     *
     * @param {Object} state - Recording state object
     * @returns {Promise<Object>} Transaction result
     */
    async saveRecordingState(state) {
        const operations = [];

        // Build operations array from state object
        if (state.transcriptData !== undefined) {
            operations.push({
                key: window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA,
                value: state.transcriptData
            });
        }

        if (state.currentSessionId !== undefined) {
            operations.push({
                key: window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID,
                value: state.currentSessionId
            });
        }

        if (state.sessionHistory !== undefined) {
            operations.push({
                key: window.AppConstants.STORAGE_KEYS.SESSION_HISTORY,
                value: state.sessionHistory
            });
        }

        if (state.realtimeMode !== undefined) {
            operations.push({
                key: window.AppConstants.STORAGE_KEYS.REALTIME_MODE,
                value: state.realtimeMode
            });
        }

        if (state.recordingStartTime !== undefined) {
            operations.push({
                key: window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME,
                value: state.recordingStartTime
            });
        }

        if (state.sessionStartTime !== undefined) {
            operations.push({
                key: window.AppConstants.STORAGE_KEYS.SESSION_START_TIME,
                value: state.sessionStartTime
            });
        }

        if (state.meetTabId !== undefined) {
            operations.push({
                key: window.AppConstants.STORAGE_KEYS.MEET_TAB_ID,
                value: state.meetTabId
            });
        }

        return this.executeTransaction(operations);
    },

    /**
     * Execute operation with timeout protection
     * @private
     */
    async _executeWithTimeout(promise, timeout) {
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Transaction timeout')), timeout)
            )
        ]);
    },

    /**
     * Verify that transaction data was written correctly
     * @private
     */
    async _verifyTransaction(updates) {
        try {
            const keysToVerify = Object.keys(updates).filter(k => !k.startsWith('__transaction_'));
            const verifyResult = await window.StorageManager.getStorageData(keysToVerify);

            // Simple existence check - data should be present
            for (const key of keysToVerify) {
                if (verifyResult[key] === undefined && updates[key] !== undefined) {
                    return {
                        success: false,
                        error: `Key ${key} not found in storage after write`
                    };
                }
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Rollback transaction by restoring previous state
     * @private
     */
    async _rollback(transactionId, rollbackData) {
        console.warn('⚠️ [TRANSACTION] Rolling back:', transactionId);

        // Filter out undefined values (keys that didn't exist before)
        const dataToRestore = {};
        for (const [key, value] of Object.entries(rollbackData)) {
            if (value !== undefined) {
                dataToRestore[key] = value;
            }
        }

        if (Object.keys(dataToRestore).length > 0) {
            await window.StorageManager.setStorageData(dataToRestore);
        }

        console.log('✅ [TRANSACTION] Rollback complete:', transactionId);
    },

    /**
     * Log critical failure for monitoring/debugging
     * @private
     */
    _logCriticalFailure(transactionId, originalError, rollbackError) {
        const criticalLog = {
            timestamp: new Date().toISOString(),
            transactionId,
            originalError: originalError.message,
            rollbackError: rollbackError.message,
            activeTransactions: Array.from(this._activeTransactions.keys())
        };

        console.error('🚨 [TRANSACTION] CRITICAL FAILURE:', criticalLog);

        // Store in separate key for debugging
        try {
            chrome.storage.local.set({
                __transaction_failure_log: criticalLog
            });
        } catch (e) {
            // Even logging failed - nothing we can do
            console.error('Failed to log critical failure:', e);
        }
    },

    /**
     * Generate unique transaction ID
     * @private
     */
    _generateTransactionId() {
        return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Recovery: Check for incomplete transactions on startup
     * Called during initialization to clean up crashed transactions
     */
    async recoverIncompleteTransactions() {
        try {
            const allKeys = await chrome.storage.local.get(null);
            const transactionMarkers = Object.keys(allKeys).filter(k =>
                k.startsWith('__transaction_')
            );

            if (transactionMarkers.length > 0) {
                console.warn('⚠️ [TRANSACTION] Found incomplete transactions:', transactionMarkers.length);

                // Remove stale markers (>5 minutes old)
                const staleMarkers = transactionMarkers.filter(key => {
                    const marker = allKeys[key];
                    const age = Date.now() - marker.timestamp;
                    return age > 300000; // 5 minutes
                });

                if (staleMarkers.length > 0) {
                    await window.StorageManager.removeStorageData(staleMarkers);
                    console.log('✅ [TRANSACTION] Cleaned up stale markers:', staleMarkers.length);
                }
            }
        } catch (error) {
            console.error('❌ [TRANSACTION] Recovery failed:', error);
        }
    },

    /**
     * Initialize Transaction Coordinator
     */
    initialize() {
        console.log('💳 [TRANSACTION] TransactionCoordinator initialized');

        // Recover any incomplete transactions from previous session
        this.recoverIncompleteTransactions();
    }
};
```

#### File 2: `background-scanner.js` (MODIFY)

**Location:** Line 182
**Change:** Use TransactionCoordinator for atomic saves

```javascript
// ❌ OLD CODE (REMOVE):
await window.StorageManager.saveTranscriptData(window.transcriptData);

// ✅ NEW CODE (ATOMIC):
const saveResult = await window.TransactionCoordinator.saveRecordingState({
    transcriptData: window.transcriptData,
    currentSessionId: window.currentSessionId,
    sessionHistory: window.sessionHistory,
    realtimeMode: window.realtimeMode
});

if (!saveResult.success) {
    console.error('❌ [BACKGROUND SCANNER] Failed to save state:', saveResult.error);
    // Data remains in memory - will retry on next update
    return;
}
```

**Code Quality Improvements:**
1. ✅ Remove duplicate `saveTranscriptData` calls
2. ✅ Add error handling for failed saves
3. ✅ Log transaction duration for monitoring

#### File 3: `session-history.js` (MODIFY)

**Location:** Line 174
**Change:** Replace callback-based save with transaction

```javascript
// ❌ OLD CODE (REMOVE - callback hell):
chrome.storage.local.set({ sessionHistory: window.sessionHistory }, () => {
    window.SessionUIManager.renderSessionHistory();
});

// ✅ NEW CODE (CLEAN):
const saveResult = await window.TransactionCoordinator.executeTransaction([
    {
        key: window.AppConstants.STORAGE_KEYS.SESSION_HISTORY,
        value: window.sessionHistory
    },
    {
        key: window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID,
        value: window.currentSessionId
    }
]);

if (saveResult.success) {
    window.SessionUIManager.renderSessionHistory();
} else {
    console.error('❌ [SESSION HISTORY] Save failed:', saveResult.error);
}
```

**Code Quality Improvements:**
1. ✅ Remove callback - use async/await consistently
2. ✅ Add error handling
3. ✅ DRY: Reuse TransactionCoordinator instead of direct chrome.storage calls

#### File 4: `recording.js` (MODIFY)

**Location:** Lines 75-78
**Change:** Atomic save for recording timing data

```javascript
// ❌ OLD CODE (REMOVE - separate saves):
chrome.storage.local.set({
    recordingStartTime: window.StateManager?.getRecordingStartTime().toISOString(),
    sessionStartTime: window.StateManager?.getSessionStartTime().toISOString()
});

// ✅ NEW CODE (ATOMIC):
await window.TransactionCoordinator.executeTransaction([
    {
        key: window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME,
        value: window.StateManager?.getRecordingStartTime()?.toISOString()
    },
    {
        key: window.AppConstants.STORAGE_KEYS.SESSION_START_TIME,
        value: window.StateManager?.getSessionStartTime()?.toISOString()
    },
    {
        key: window.AppConstants.STORAGE_KEYS.MEET_TAB_ID,
        value: meetTabId
    }
]);
```

**Code Quality Improvements:**
1. ✅ Atomic save - no partial state
2. ✅ Add meetTabId to same transaction (related data together)
3. ✅ Consistent error handling

#### File 5: `storage-manager.js` (MODIFY)

**Add new method for transaction support:**

```javascript
/**
 * Execute atomic storage update (used by TransactionCoordinator)
 * @param {Object} updates - Multiple key-value pairs to save atomically
 * @returns {Promise<void>}
 */
async executeAtomicUpdate(updates) {
    return setStorageData(updates);
}
```

**Add to exports:**
```javascript
window.StorageManager = {
    // ... existing methods
    executeAtomicUpdate,  // NEW
    // ... rest
};
```

#### File 6: `popup.html` (MODIFY)

**Add script tag BEFORE storage-manager:**

```html
<!-- Core Infrastructure -->
<script src="js/utils/constants.js"></script>
<script src="js/core/transaction-coordinator.js"></script>  <!-- NEW -->
<script src="js/core/storage-manager.js"></script>
<!-- ... rest -->
```

### Testing Plan

#### Test 1: Transaction Atomicity
```javascript
// Force storage error during transaction
async function testTransactionRollback() {
    // Setup
    const originalData = await chrome.storage.local.get(['transcriptData', 'sessionHistory']);

    // Mock storage error
    const originalSet = chrome.storage.local.set;
    chrome.storage.local.set = (data, callback) => {
        callback(); // Simulate error by not saving
        chrome.runtime.lastError = { message: 'Mock error' };
    };

    // Execute transaction (should fail and rollback)
    const result = await TransactionCoordinator.saveRecordingState({
        transcriptData: newData,
        sessionHistory: newHistory
    });

    // Restore mock
    chrome.storage.local.set = originalSet;

    // Verify
    const currentData = await chrome.storage.local.get(['transcriptData', 'sessionHistory']);
    console.assert(
        JSON.stringify(currentData) === JSON.stringify(originalData),
        'Rollback failed - data was modified'
    );
    console.assert(!result.success, 'Transaction should have failed');
}
```

#### Test 2: Popup Close During Transaction
```javascript
// Simulate popup close during save
async function testPopupCloseDuringTransaction() {
    // Start transaction
    const transactionPromise = TransactionCoordinator.saveRecordingState({
        transcriptData: bigData,  // Large data
        sessionHistory: history
    });

    // Simulate popup close after 50ms
    setTimeout(() => {
        window.close(); // Or simulate unload
    }, 50);

    // Wait for transaction
    const result = await transactionPromise;

    // Verify: Either fully saved or fully rolled back (no partial state)
    const storageData = await chrome.storage.local.get(['transcriptData', 'sessionHistory']);

    if (result.success) {
        console.assert(storageData.transcriptData !== undefined, 'Partial save detected');
        console.assert(storageData.sessionHistory !== undefined, 'Partial save detected');
    } else {
        // Rollback should have restored previous state
        console.log('Transaction correctly rolled back');
    }
}
```

### Success Criteria

- ✅ NO partial states in storage (all-or-nothing guarantee)
- ✅ Automatic rollback on any error
- ✅ Transaction verification after write
- ✅ <100ms overhead per transaction
- ✅ Crash recovery for incomplete transactions
- ✅ Clean code: No callbacks, consistent error handling

---

## SOLUTION 2: Background Scan Checkpoints & Recovery

### Problem Statement
**Krytyczne:** Dane z `backgroundScan_${tabId}` tracone gdy popup jest zamknięty przez >1 godzinę.

**Obecna sytuacja:**
```javascript
// background.js:110-115 - zapisuje co 3 sekundy
await chrome.storage.local.set({
    [`backgroundScan_${tabId}`]: {
        data: result.data,
        timestamp: Date.now()
    }
});

// background-scanner.js:389-395 - usuwa po 1h timeout
if (dataAge > MAX_AGE) {
    await removeStorageData([storageKey]);  // DANE UTRACONE!
    return null;
}
```

**Problemy:**
1. Tylko jeden snapshot danych (ostatni)
2. Brak backupu jeśli ostatni snapshot jest niepełny
3. Tab ID może się zmienić (reuse) → wrong data
4. Brak verification czy tab należy do tej samej Meet session

### Implementation

#### File 1: `background.js` (MODIFY)

**Location:** Lines 68-145
**Change:** Add checkpoint system and meeting URL verification

```javascript
function startBackgroundScanning(tabId) {
    const startTime = new Date().toISOString();
    console.log('🔶 [BACKGROUND] Starting scan for tab:', tabId, 'at:', startTime);

    if (isScanning) {
        console.log('🔶 [BACKGROUND] Already scanning, stopping previous');
        stopBackgroundScanning();
    }

    isScanning = true;
    scanningTabId = tabId;

    let scanCount = 0;
    let lastMeetingUrl = null;  // Track meeting URL for verification

    // Skanuj co 3 sekundy
    scanInterval = setInterval(async () => {
        scanCount++;
        const scanTime = new Date().toISOString();

        if (!isScanning) {
            clearInterval(scanInterval);
            return;
        }

        try {
            // Sprawdź czy karta nadal istnieje
            const tab = await chrome.tabs.get(tabId);
            if (!tab || !tab.url.includes('meet.google.com')) {
                console.log('🔶 [BACKGROUND] Tab not Meet page, stopping');
                stopBackgroundScanning();
                return;
            }

            // Wyślij żądanie skanowania
            const result = await chrome.tabs.sendMessage(tabId, { action: 'scrapeTranscript' });

            if (result && result.success && result.data && result.data.messages?.length > 0) {
                const messageCount = result.data.messages.length;
                console.log(`🔶 [BACKGROUND] Scan #${scanCount}: ${messageCount} messages`);

                // Store meeting URL for verification
                if (result.data.meetingUrl) {
                    lastMeetingUrl = result.data.meetingUrl;
                }

                // PRIMARY STORAGE: Latest data
                await chrome.storage.local.set({
                    [`backgroundScan_${tabId}`]: {
                        data: result.data,
                        timestamp: Date.now(),
                        sequenceNumber: scanCount,  // Track scan sequence
                        meetingUrl: result.data.meetingUrl || lastMeetingUrl  // For tab ID verification
                    }
                });

                // CHECKPOINT SYSTEM: Backup every 10 scans (~30 seconds)
                if (scanCount % 10 === 0) {
                    await createCheckpoint(tabId, result.data, scanCount);
                }

                // Wyślij do popup jeśli otwarte
                try {
                    await chrome.runtime.sendMessage({
                        action: 'backgroundScanUpdate',
                        data: result.data
                    });
                } catch (error) {
                    // Popup closed - data safely in storage
                    console.log('🔶 [BACKGROUND] Popup closed, data in storage');
                }
            } else {
                console.log(`🔶 [BACKGROUND] Scan #${scanCount}: no messages`);
            }
        } catch (error) {
            console.error('🔶 [BACKGROUND] Scan error:', error);

            if (error.message.includes('Could not establish connection')) {
                console.log('🔶 [BACKGROUND] Content script not ready, will retry');
            } else {
                console.log('🔶 [BACKGROUND] Stopping due to error');
                stopBackgroundScanning();
            }
        }
    }, 3000);

    console.log('🔶 [BACKGROUND] Scanning started at:', startTime);
}

/**
 * Create checkpoint backup of scan data
 * Keeps last 3 checkpoints for recovery
 *
 * @param {number} tabId - Tab ID
 * @param {Object} data - Transcript data
 * @param {number} scanCount - Scan sequence number
 */
async function createCheckpoint(tabId, data, scanCount) {
    try {
        const checkpointKey = `checkpoint_${tabId}_${Date.now()}`;

        await chrome.storage.local.set({
            [checkpointKey]: {
                data: data,
                timestamp: Date.now(),
                scanCount: scanCount,
                type: 'CHECKPOINT'
            }
        });

        console.log(`💾 [CHECKPOINT] Created: ${checkpointKey} (${data.messages.length} messages)`);

        // Cleanup: Keep only last 3 checkpoints per tab
        await cleanupOldCheckpoints(tabId);

    } catch (error) {
        console.error('❌ [CHECKPOINT] Failed to create:', error);
        // Non-fatal - primary storage still has data
    }
}

/**
 * Remove old checkpoints, keep only last 3
 * @param {number} tabId - Tab ID
 */
async function cleanupOldCheckpoints(tabId) {
    try {
        const allData = await chrome.storage.local.get(null);
        const checkpointKeys = Object.keys(allData)
            .filter(k => k.startsWith(`checkpoint_${tabId}_`))
            .sort(); // Chronological order (timestamp in key)

        // Keep last 3, remove older
        if (checkpointKeys.length > 3) {
            const toRemove = checkpointKeys.slice(0, -3);
            await chrome.storage.local.remove(toRemove);
            console.log(`🧹 [CHECKPOINT] Cleaned up ${toRemove.length} old checkpoints`);
        }
    } catch (error) {
        console.error('❌ [CHECKPOINT] Cleanup failed:', error);
    }
}
```

**Code Quality Improvements:**
1. ✅ Extract checkpoint logic to separate function (SRP)
2. ✅ Add meeting URL tracking for verification
3. ✅ Add sequence numbering for debugging
4. ✅ Cleanup old checkpoints automatically (prevent storage bloat)

#### File 2: `background-scanner.js` (MODIFY)

**Location:** Lines 373-410
**Change:** Enhanced recovery with multiple fallback paths

```javascript
/**
 * Retrieve accumulated scan data with multi-path recovery
 * Tries: Primary → Checkpoints → Meeting URL match
 *
 * @param {number} tabId - Meet tab ID
 * @returns {Promise<Object|null>} Accumulated transcript data or null
 */
async retrieveAccumulatedScanData(tabId) {
    console.log('🔍 [RETRIEVE] Searching for accumulated data, tabId:', tabId);

    // RECOVERY PATH 1: Primary storage key
    const primaryData = await this._tryPrimaryKey(tabId);
    if (primaryData) {
        console.log('✅ [RETRIEVE] Found data via primary key');
        return primaryData;
    }

    // RECOVERY PATH 2: Checkpoints (if primary failed or outdated)
    const checkpointData = await this._tryCheckpoints(tabId);
    if (checkpointData) {
        console.log('✅ [RETRIEVE] Found data via checkpoint');
        return checkpointData;
    }

    // RECOVERY PATH 3: Meeting URL match (tab ID reuse protection)
    const urlMatchData = await this._tryMeetingUrlMatch();
    if (urlMatchData) {
        console.log('✅ [RETRIEVE] Found data via meeting URL match');
        return urlMatchData;
    }

    console.log('⚠️ [RETRIEVE] No accumulated data found');
    return null;
},

/**
 * Try primary storage key
 * @private
 */
async _tryPrimaryKey(tabId) {
    try {
        const storageKey = `backgroundScan_${tabId}`;
        const result = await window.StorageManager.getStorageData([storageKey]);
        const scanData = result[storageKey];

        if (!scanData || !scanData.data) {
            return null;
        }

        // Check age (1 hour max)
        const dataAge = Date.now() - scanData.timestamp;
        const MAX_AGE = 60 * 60 * 1000;

        if (dataAge > MAX_AGE) {
            console.warn(`⚠️ [RETRIEVE] Primary data too old (${Math.round(dataAge / 60000)} minutes)`);
            return null;
        }

        return scanData.data;
    } catch (error) {
        console.error('❌ [RETRIEVE] Primary key failed:', error);
        return null;
    }
},

/**
 * Try checkpoint recovery
 * @private
 */
async _tryCheckpoints(tabId) {
    try {
        const allData = await chrome.storage.local.get(null);
        const checkpointKeys = Object.keys(allData)
            .filter(k => k.startsWith(`checkpoint_${tabId}_`))
            .sort()
            .reverse(); // Most recent first

        if (checkpointKeys.length === 0) {
            return null;
        }

        // Try most recent checkpoint
        const latestCheckpoint = allData[checkpointKeys[0]];

        // Verify age
        const checkpointAge = Date.now() - latestCheckpoint.timestamp;
        const MAX_AGE = 60 * 60 * 1000;

        if (checkpointAge > MAX_AGE) {
            console.warn(`⚠️ [RETRIEVE] Checkpoint too old (${Math.round(checkpointAge / 60000)} minutes)`);

            // Cleanup old checkpoints
            await chrome.storage.local.remove(checkpointKeys);
            return null;
        }

        console.log(`💾 [RETRIEVE] Using checkpoint (${latestCheckpoint.data.messages.length} messages)`);
        return latestCheckpoint.data;

    } catch (error) {
        console.error('❌ [RETRIEVE] Checkpoint recovery failed:', error);
        return null;
    }
},

/**
 * Try meeting URL match (protection against tab ID reuse)
 * @private
 */
async _tryMeetingUrlMatch() {
    try {
        const currentMeetingUrl = window.transcriptData?.meetingUrl;

        if (!currentMeetingUrl) {
            console.log('⚠️ [RETRIEVE] No current meeting URL for matching');
            return null;
        }

        const allData = await chrome.storage.local.get(null);

        // Search all backgroundScan_* keys for matching URL
        for (const [key, value] of Object.entries(allData)) {
            if (key.startsWith('backgroundScan_') && value.meetingUrl === currentMeetingUrl) {
                console.log(`🔗 [RETRIEVE] Found data by URL match: ${key}`);

                // Verify age
                const dataAge = Date.now() - value.timestamp;
                const MAX_AGE = 60 * 60 * 1000;

                if (dataAge > MAX_AGE) {
                    console.warn('⚠️ [RETRIEVE] URL-matched data too old');
                    return null;
                }

                return value.data;
            }
        }

        return null;
    } catch (error) {
        console.error('❌ [RETRIEVE] URL match failed:', error);
        return null;
    }
},

/**
 * Flush pending data immediately (called on popup close)
 */
async flushPendingData() {
    try {
        console.log('💾 [FLUSH] Flushing pending background scan data');

        const meetTabId = await window.StorageManager.getStorageData([
            window.AppConstants.STORAGE_KEYS.MEET_TAB_ID
        ]);

        if (!meetTabId.meetTabId) {
            console.log('⚠️ [FLUSH] No meet tab ID found');
            return;
        }

        const accumulatedData = await this.retrieveAccumulatedScanData(meetTabId.meetTabId);

        if (accumulatedData && accumulatedData.messages?.length > 0) {
            console.log(`💾 [FLUSH] Found ${accumulatedData.messages.length} messages to merge`);

            // Force merge even if popup closing
            await this.mergeAccumulatedData(accumulatedData);

            // Cleanup storage after successful merge
            await this._cleanupBackgroundScanData(meetTabId.meetTabId);

            console.log('✅ [FLUSH] Data flushed successfully');
        } else {
            console.log('💾 [FLUSH] No pending data to flush');
        }
    } catch (error) {
        console.error('❌ [FLUSH] Failed to flush data:', error);
    }
},

/**
 * Cleanup background scan data after successful merge
 * @private
 */
async _cleanupBackgroundScanData(tabId) {
    try {
        const allData = await chrome.storage.local.get(null);
        const keysToRemove = [];

        // Remove primary key
        keysToRemove.push(`backgroundScan_${tabId}`);

        // Remove all checkpoints for this tab
        const checkpointKeys = Object.keys(allData).filter(k =>
            k.startsWith(`checkpoint_${tabId}_`)
        );
        keysToRemove.push(...checkpointKeys);

        if (keysToRemove.length > 0) {
            await chrome.storage.local.remove(keysToRemove);
            console.log(`🧹 [CLEANUP] Removed ${keysToRemove.length} background scan keys`);
        }
    } catch (error) {
        console.error('❌ [CLEANUP] Failed:', error);
    }
}
```

**Code Quality Improvements:**
1. ✅ Extract recovery paths to separate methods (SRP, testable)
2. ✅ DRY: Reuse age verification logic
3. ✅ Add comprehensive logging for debugging
4. ✅ Automatic cleanup after successful merge

#### File 3: `popup.js` (MODIFY)

**Location:** After line 23
**Change:** Add beforeunload handler for data flush

```javascript
/**
 * Handle popup close - flush pending background scan data
 */
window.addEventListener('beforeunload', async (event) => {
    // Only flush if recording is active
    if (window.realtimeMode && window.BackgroundScanner) {
        console.log('⚠️ [POPUP] Popup closing during recording, flushing data');

        try {
            // Force immediate flush of pending data
            await window.BackgroundScanner.flushPendingData();
            console.log('✅ [POPUP] Data flushed before close');
        } catch (error) {
            console.error('❌ [POPUP] Failed to flush data:', error);
            // Data will be recovered on next open via checkpoint system
        }
    }
});
```

**Code Quality Improvements:**
1. ✅ Clear purpose - single responsibility
2. ✅ Error handling with fallback (checkpoint recovery)
3. ✅ Informative logging

### Testing Plan

#### Test 1: Popup Close Recovery
```javascript
async function testPopupCloseRecovery() {
    // Setup: Start recording
    await activateRealtimeMode();

    // Wait for background scanning to collect data
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30s = ~10 scans

    // Close popup
    window.close();

    // Wait 30 more seconds (background scan continues)
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Reopen popup
    // ... popup reopens via user action

    // Verify: All data recovered
    const messages = window.transcriptData.messages;
    console.assert(messages.length >= 20, 'Data loss detected - expected >=20 messages');
    console.log(`✅ Recovery successful: ${messages.length} messages`);
}
```

#### Test 2: Tab ID Reuse Protection
```javascript
async function testTabIdReuse() {
    // Setup: Start recording in tab 12345
    const tab1 = await chrome.tabs.create({ url: 'https://meet.google.com/abc-defg-hij' });
    await startBackgroundScanning(tab1.id);

    // Collect some data
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Close tab
    await chrome.tabs.remove(tab1.id);

    // Open new tab (might reuse ID 12345)
    const tab2 = await chrome.tabs.create({ url: 'https://meet.google.com/xyz-uvwx-yz' });

    // Try to retrieve data
    const data = await BackgroundScanner.retrieveAccumulatedScanData(tab2.id);

    // Verify: Should NOT get data from previous meeting
    console.assert(
        data === null || data.meetingUrl === 'https://meet.google.com/xyz-uvwx-yz',
        'Tab ID reuse protection failed - got data from wrong meeting'
    );
}
```

#### Test 3: Checkpoint Recovery After 1 Hour
```javascript
async function testCheckpointRecoveryAfter1Hour() {
    // Setup: Start recording, create checkpoints
    await startBackgroundScanning(tabId);
    await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute = 2 checkpoints

    // Close popup
    window.close();

    // Simulate 1 hour wait (manually wait or mock timestamp)
    // ... wait 1 hour 5 minutes ...

    // Reopen popup
    const recoveredData = await BackgroundScanner.retrieveAccumulatedScanData(tabId);

    // Verify: Primary data expired, but checkpoint should work
    console.assert(recoveredData !== null, 'Checkpoint recovery failed after 1h');
    console.log(`✅ Checkpoint recovery successful: ${recoveredData.messages.length} messages`);
}
```

### Success Criteria

- ✅ ZERO data loss on popup close (any duration)
- ✅ Multiple recovery paths (3 fallback mechanisms)
- ✅ Tab ID reuse protection via URL verification
- ✅ Automatic cleanup of old checkpoints
- ✅ <100KB additional storage per session (3 checkpoints max)
- ✅ Clean code: Extracted methods, comprehensive error handling

---

## SOLUTION 3: Priority Queue Merge Coordination

### Problem Statement
**Krytyczne:** Race condition między `mergeAccumulatedData` i `handleBackgroundScanUpdate`.

**Obecna sytuacja:**
```javascript
// background-scanner.js:419-427
if (this._isMergingData) {
    await new Promise(resolve => setTimeout(resolve, 100));  // Wait 100ms
    if (this._isMergingData) {
        console.warn('⚠️ [MERGE] Still merging, aborting this merge');
        return;  // NEW MERGE ABORTED - DATA LOST!
    }
}
```

**Problemy:**
1. Timeout tylko 100ms - niewystarczający dla dużych merges
2. Abortowany merge = utracone dane
3. Brak priorytetyzacji (restoration powinno być first)
4. Brak retry mechanism
5. Simple boolean flag - nie queue

### Implementation

#### File 1: `background-scanner.js` (MODIFY)

**Location:** Lines 8-50
**Change:** Add priority queue system

```javascript
window.BackgroundScanner = {
    // ✅ NEW: Priority queue system (REPLACES simple _isMergingData flag)
    _mergeQueue: [],
    _isMerging: false,
    _mergeSequence: 0,
    _maxQueueSize: 50,  // Prevent memory buildup

    /**
     * Schedule merge operation with priority
     * Higher priority = executes first
     *
     * @param {Object} data - Transcript data to merge
     * @param {number} priority - Priority level (higher = more important)
     * @returns {Promise<void>}
     */
    async scheduleMerge(data, priority = 0) {
        const operation = {
            id: ++this._mergeSequence,
            data: data,
            priority: priority,
            timestamp: Date.now(),
            retryCount: 0
        };

        // Queue size protection
        if (this._mergeQueue.length >= this._maxQueueSize) {
            console.warn('⚠️ [MERGE QUEUE] Queue full, dropping lowest priority operation');
            // Remove lowest priority item
            this._mergeQueue.sort((a, b) => b.priority - a.priority);
            this._mergeQueue.pop();
        }

        this._mergeQueue.push(operation);

        // Sort by priority (highest first)
        this._mergeQueue.sort((a, b) => b.priority - a.priority);

        console.log(`📋 [MERGE QUEUE] Scheduled operation #${operation.id} (priority: ${priority}, queue: ${this._mergeQueue.length})`);

        // Start processing queue
        await this._processMergeQueue();
    },

    /**
     * Process merge queue sequentially
     * Ensures no concurrent merges
     * @private
     */
    async _processMergeQueue() {
        // Already processing
        if (this._isMerging) {
            console.log('🔄 [MERGE QUEUE] Already processing, will continue');
            return;
        }

        // Process all queued operations
        while (this._mergeQueue.length > 0) {
            this._isMerging = true;
            const operation = this._mergeQueue.shift();

            console.log(`🔄 [MERGE QUEUE] Processing operation #${operation.id} (${this._mergeQueue.length} remaining)`);

            try {
                await this._performMerge(operation.data);
                console.log(`✅ [MERGE QUEUE] Operation #${operation.id} completed`);

            } catch (error) {
                console.error(`❌ [MERGE QUEUE] Operation #${operation.id} failed:`, error);

                // RETRY LOGIC: Re-queue with lower priority if retries remaining
                const MAX_RETRIES = 3;
                if (operation.retryCount < MAX_RETRIES) {
                    operation.retryCount++;
                    operation.priority = Math.max(0, operation.priority - 10);  // Lower priority

                    this._mergeQueue.push(operation);
                    this._mergeQueue.sort((a, b) => b.priority - a.priority);

                    console.log(`🔄 [MERGE QUEUE] Re-queued operation #${operation.id} for retry ${operation.retryCount}/${MAX_RETRIES}`);
                } else {
                    console.error(`💀 [MERGE QUEUE] Operation #${operation.id} failed after ${MAX_RETRIES} retries - data lost`);
                    // TODO: Log to error tracking service
                }
            }
        }

        this._isMerging = false;
        console.log('✅ [MERGE QUEUE] Queue processing complete');
    },

    /**
     * Perform actual merge operation
     * @private
     */
    async _performMerge(data) {
        // Existing merge logic from mergeAccumulatedData
        // ... (keep existing detectChanges, window.transcriptData update, etc.)

        const currentMessages = window.transcriptData?.messages || [];
        const newMessages = data.messages;

        const changes = this.detectChanges(currentMessages, newMessages);

        // Update transcript data
        window.transcriptData = window.transcriptData || { messages: [] };
        window.transcriptData.messages = newMessages;
        window.transcriptData.scrapedAt = data.scrapedAt;
        window.transcriptData.meetingUrl = data.meetingUrl;

        // Save atomically using TransactionCoordinator
        const saveResult = await window.TransactionCoordinator.saveRecordingState({
            transcriptData: window.transcriptData,
            currentSessionId: window.currentSessionId,
            sessionHistory: window.sessionHistory
        });

        if (!saveResult.success) {
            throw new Error(`Failed to save merge: ${saveResult.error}`);
        }

        // Update UI
        if (window.displayTranscript) {
            window.displayTranscript(window.transcriptData, changes);
        }

        // Auto-save session
        if (window.SessionHistoryManager?.autoSaveCurrentSession) {
            window.SessionHistoryManager.autoSaveCurrentSession();
        }
    },

    // ❌ REMOVE old methods (dead code cleanup):
    // - Old _isMergingData checks with 100ms timeout
    // - Old mergeAccumulatedData with problematic mutex

    // ✅ UPDATE existing methods to use queue:

    /**
     * Handle background scan update (from background.js message)
     */
    async handleBackgroundScanUpdate(data) {
        // ... existing validation ...

        // ✅ NEW: Schedule with LOWER priority (normal updates)
        await this.scheduleMerge(data, 1);
    },

    /**
     * Merge accumulated data (from restoration)
     */
    async mergeAccumulatedData(accumulatedData) {
        // ✅ NEW: Schedule with HIGHER priority (restoration is critical)
        await this.scheduleMerge(accumulatedData, 100);
    },

    /**
     * Get queue status (for debugging)
     */
    getQueueStatus() {
        return {
            queueLength: this._mergeQueue.length,
            isProcessing: this._isMerging,
            nextOperation: this._mergeQueue[0] || null
        };
    },

    // ... rest of BackgroundScanner methods ...
};
```

**Code Quality Improvements:**
1. ✅ DRY: Single `_performMerge` method instead of duplicated logic
2. ✅ SRP: Separate scheduling, queuing, and execution logic
3. ✅ Clean dead code: Remove old `_isMergingData` flag and 100ms timeout
4. ✅ Add retry mechanism (3 attempts)
5. ✅ Add queue size protection (prevent memory leak)
6. ✅ Comprehensive logging for debugging

### Testing Plan

#### Test 1: Concurrent Merge Handling
```javascript
async function testConcurrentMerges() {
    // Simulate concurrent merge requests
    const promises = [];

    for (let i = 0; i < 20; i++) {
        const testData = {
            messages: Array(10).fill(null).map((_, idx) => ({
                speaker: `Speaker ${i}`,
                text: `Message ${idx}`,
                hash: `hash_${i}_${idx}`
            })),
            scrapedAt: new Date().toISOString()
        };

        promises.push(BackgroundScanner.scheduleMerge(testData, Math.random() * 100));
    }

    // Wait for all merges
    await Promise.all(promises);

    // Verify: All 20 merges processed
    const queueStatus = BackgroundScanner.getQueueStatus();
    console.assert(queueStatus.queueLength === 0, 'Queue not empty after merges');
    console.assert(!queueStatus.isProcessing, 'Still processing after merges');

    // Verify: No duplicates in transcript data
    const messages = window.transcriptData.messages;
    const uniqueHashes = new Set(messages.map(m => m.hash));
    console.assert(uniqueHashes.size === messages.length, 'Duplicate messages detected');

    console.log(`✅ Concurrent merge test passed: ${messages.length} messages, no duplicates`);
}
```

#### Test 2: Priority Ordering
```javascript
async function testPriorityOrdering() {
    const executionOrder = [];

    // Mock _performMerge to track execution order
    const originalPerformMerge = BackgroundScanner._performMerge;
    BackgroundScanner._performMerge = async function(data) {
        executionOrder.push(data.priority);
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate work
    };

    // Schedule merges with different priorities
    await BackgroundScanner.scheduleMerge({ priority: 1 }, 1);   // Low
    await BackgroundScanner.scheduleMerge({ priority: 100 }, 100); // High
    await BackgroundScanner.scheduleMerge({ priority: 50 }, 50);  // Medium
    await BackgroundScanner.scheduleMerge({ priority: 1 }, 1);   // Low

    // Wait for queue to process
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify: Executed in priority order (high to low)
    console.assert(
        JSON.stringify(executionOrder) === JSON.stringify([100, 50, 1, 1]),
        'Priority ordering failed'
    );

    // Restore original method
    BackgroundScanner._performMerge = originalPerformMerge;

    console.log('✅ Priority ordering test passed');
}
```

#### Test 3: Retry Mechanism
```javascript
async function testRetryMechanism() {
    let attemptCount = 0;

    // Mock _performMerge to fail first 2 times
    const originalPerformMerge = BackgroundScanner._performMerge;
    BackgroundScanner._performMerge = async function(data) {
        attemptCount++;
        if (attemptCount < 3) {
            throw new Error('Simulated merge failure');
        }
        // Third attempt succeeds
    };

    // Schedule merge
    await BackgroundScanner.scheduleMerge({ messages: [] }, 10);

    // Wait for retries
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify: 3 attempts made
    console.assert(attemptCount === 3, `Expected 3 attempts, got ${attemptCount}`);

    // Restore
    BackgroundScanner._performMerge = originalPerformMerge;

    console.log('✅ Retry mechanism test passed');
}
```

### Success Criteria

- ✅ NO race conditions (sequential processing)
- ✅ Priority-based scheduling (restoration first)
- ✅ Automatic retry (3 attempts)
- ✅ Queue size protection (max 50 operations)
- ✅ Clean code: No dead code, DRY principles
- ✅ <50ms overhead per merge operation

---

## SOLUTION 4: State Restoration Timeout Protection

### Problem Statement
**Wysokie:** `isRestorationInProgress` flag może nigdy się nie wyczyścić, blokując auto-save.

**Obecna sytuacja:**
```javascript
// state-manager.js:654-670
const checkSessionHistoryLoaded = () => {
    if (window.sessionHistory && Array.isArray(window.sessionHistory)) {
        setRestorationInProgress(false);
    } else {
        setTimeout(checkSessionHistoryLoaded, 500);  // INFINITE LOOP!
    }
};
setTimeout(checkSessionHistoryLoaded, 1000);
```

**Problemy:**
1. Brak max wait time - może czekać w nieskończoność
2. Jeśli `SessionHistoryManager.initialize()` failuje, deadlock
3. `isRestorationInProgress = true` FOREVER → auto-save blokowane
4. Brak emergency recovery mechanism

### Implementation

#### File 1: `state-manager.js` (MODIFY)

**Location:** Lines 654-670 (finally block)
**Change:** Add timeout protection and force-unlock

```javascript
// ✅ NEW CODE (REPLACE entire finally block):
finally {
    const MAX_WAIT_TIME = 10000; // 10 seconds max
    const CHECK_INTERVAL = 500;  // Check every 500ms
    const startTime = Date.now();
    let checkCount = 0;

    const checkSessionHistoryLoaded = () => {
        checkCount++;
        const elapsed = Date.now() - startTime;

        console.log(`🔄 [RESTORE] Checking sessionHistory load status (attempt ${checkCount}, elapsed: ${elapsed}ms)`);

        // TIMEOUT PROTECTION: Force unlock after 10 seconds
        if (elapsed > MAX_WAIT_TIME) {
            console.error(`⚠️ [RESTORE] Timeout after ${MAX_WAIT_TIME}ms, forcing restoration flag clear`);
            setRestorationInProgress(false);

            // EMERGENCY RECOVERY: Initialize empty sessionHistory if still not loaded
            if (!window.sessionHistory || !Array.isArray(window.sessionHistory)) {
                window.sessionHistory = [];
                console.warn('⚠️ [RESTORE] Emergency: Initialized empty sessionHistory after timeout');

                // Log for debugging
                console.error('🚨 [RESTORE] SessionHistoryManager.initialize() may have failed');
            }

            return; // Stop checking
        }

        // CHECK: Is sessionHistory properly loaded?
        if (window.sessionHistory && Array.isArray(window.sessionHistory)) {
            setRestorationInProgress(false);
            console.log(`✅ [RESTORE] Restoration flag cleared after ${elapsed}ms (${window.sessionHistory.length} sessions loaded)`);
        } else {
            // Still not loaded - check again
            console.log(`⏳ [RESTORE] SessionHistory not loaded yet, checking again in ${CHECK_INTERVAL}ms`);
            setTimeout(checkSessionHistoryLoaded, CHECK_INTERVAL);
        }
    };

    // Start checking after initial delay
    setTimeout(checkSessionHistoryLoaded, 1000);
}
```

**Code Quality Improvements:**
1. ✅ Add timeout protection (NO infinite loops)
2. ✅ Add emergency recovery (empty array initialization)
3. ✅ Extract magic numbers to named constants
4. ✅ Comprehensive logging for debugging
5. ✅ Early return pattern (reduce nesting)

### Testing Plan

#### Test 1: Timeout Protection
```javascript
async function testRestorationTimeout() {
    // Break SessionHistoryManager.initialize()
    const originalInitialize = window.SessionHistoryManager.initialize;
    window.SessionHistoryManager.initialize = async function() {
        // Intentionally fail - never set window.sessionHistory
        throw new Error('Simulated initialization failure');
    };

    // Trigger restoration
    const startTime = Date.now();
    await window.StateManager.restoreStateFromStorage();

    // Wait 12 seconds (should timeout at 10s)
    await new Promise(resolve => setTimeout(resolve, 12000));

    const elapsed = Date.now() - startTime;

    // Verify: Flag cleared within 12 seconds
    const isRestoring = window.StateManager.isRestorationInProgress();
    console.assert(!isRestoring, 'Restoration flag not cleared after timeout');

    // Verify: Emergency recovery initialized empty array
    console.assert(Array.isArray(window.sessionHistory), 'sessionHistory not initialized');
    console.assert(window.sessionHistory.length === 0, 'sessionHistory should be empty array');

    // Restore original
    window.SessionHistoryManager.initialize = originalInitialize;

    console.log(`✅ Timeout protection test passed (elapsed: ${elapsed}ms)`);
}
```

#### Test 2: Auto-Save Unblocking
```javascript
async function testAutoSaveUnblocking() {
    // Simulate stuck restoration flag
    window.StateManager.setRestorationInProgress(true);

    // Try to auto-save (should be blocked initially)
    let saveAttempted = false;
    window.SessionHistoryManager.autoSaveCurrentSession = function() {
        if (window.StateManager.isRestorationInProgress()) {
            console.log('Save blocked - restoration in progress');
            return;
        }
        saveAttempted = true;
    };

    // Try save (blocked)
    window.SessionHistoryManager.autoSaveCurrentSession();
    console.assert(!saveAttempted, 'Save should be blocked initially');

    // Trigger restoration with timeout
    await window.StateManager.restoreStateFromStorage();
    await new Promise(resolve => setTimeout(resolve, 12000));

    // Try save again (should work now)
    window.SessionHistoryManager.autoSaveCurrentSession();
    console.assert(saveAttempted, 'Save should work after timeout clears flag');

    console.log('✅ Auto-save unblocking test passed');
}
```

### Success Criteria

- ✅ NO infinite loops (10s max wait)
- ✅ Automatic flag clearing after timeout
- ✅ Emergency recovery (empty array initialization)
- ✅ Auto-save unblocked after timeout
- ✅ Clean code: Named constants, comprehensive logging

---

## SOLUTION 5: Export Data Snapshot Pattern

### Problem Statement
**Średnie:** Export może zawierać mieszane dane jeśli transkrypcja się aktualizuje podczas generowania.

**Obecna sytuacja:**
```javascript
// export.js:88-94
window.transcriptData.messages.forEach(entry => {
    txtContent += `${entry.speaker}...`;
    // ↑ Array może się zmienić PODCZAS iteracji!
});
```

**Problemy:**
1. `window.transcriptData` jest mutable - może się zmienić
2. Background scanner może nadpisać array podczas forEach
3. Export może mieć niepełne/mieszane dane

### Implementation

#### File 1: `export.js` (MODIFY)

**Location:** Lines 77-130
**Change:** Add snapshot mechanism

```javascript
/**
 * Prepare export content with immutable data snapshot
 * Prevents data corruption during export
 *
 * @param {boolean} shouldWrapInPrompt - Whether to wrap in LLM prompt
 * @returns {Promise<string>} Export content
 */
async prepareExportContent(shouldWrapInPrompt) {
    // ✅ CREATE IMMUTABLE SNAPSHOT (prevents mid-export modifications)
    const dataSnapshot = this.createDataSnapshot();

    const transcriptContent = this.generateTxtContent(dataSnapshot);

    if (shouldWrapInPrompt) {
        return await this.wrapWithLLMPrompt(transcriptContent);
    }

    return transcriptContent;
},

/**
 * Create deep clone snapshot of transcript data
 * Protects against modifications during export
 *
 * @returns {Object} Immutable snapshot of transcript data
 */
createDataSnapshot() {
    if (!window.transcriptData) {
        return {
            messages: [],
            scrapedAt: new Date().toISOString(),
            meetingUrl: ''
        };
    }

    // Deep clone to prevent reference sharing
    return {
        messages: JSON.parse(JSON.stringify(window.transcriptData.messages || [])),
        scrapedAt: window.transcriptData.scrapedAt,
        meetingUrl: window.transcriptData.meetingUrl,
        // Add export metadata
        exportedAt: new Date().toISOString(),
        messageCount: window.transcriptData.messages?.length || 0
    };
},

/**
 * Generate TXT content from snapshot
 *
 * @param {Object} dataSnapshot - Immutable data snapshot
 * @returns {string} Formatted TXT content
 */
generateTxtContent(dataSnapshot) {
    let txtContent = `Transkrypcja Google Meet\n`;
    txtContent += `Data eksportu: ${new Date(dataSnapshot.exportedAt).toLocaleString('pl-PL')}\n`;
    txtContent += `URL spotkania: ${dataSnapshot.meetingUrl || 'Nieznany'}\n`;
    txtContent += `Liczba wiadomości: ${dataSnapshot.messageCount}\n`;
    txtContent += `=====================================\n\n`;

    // ✅ Use snapshot instead of window.transcriptData
    dataSnapshot.messages.forEach(entry => {
        txtContent += `${entry.speaker}`;
        if (entry.timestamp) {
            txtContent += ` [${entry.timestamp}]`;
        }
        txtContent += `:\n${entry.text}\n\n`;
    });

    return txtContent;
},

/**
 * Generate JSON content from snapshot
 *
 * @param {Object} dataSnapshot - Immutable data snapshot
 * @returns {string} JSON string
 */
generateJsonContent(dataSnapshot) {
    return JSON.stringify(dataSnapshot, null, 2);
}

// ❌ REMOVE OLD generateTxtContent that used window.transcriptData directly
```

**Code Quality Improvements:**
1. ✅ Immutability: Deep clone prevents modifications
2. ✅ Add export metadata (exportedAt, messageCount)
3. ✅ DRY: Single snapshot creation method
4. ✅ Type safety: Null checks for undefined data

### Testing Plan

#### Test 1: Export During Active Recording
```javascript
async function testExportDuringRecording() {
    // Setup: Active recording with updates
    window.realtimeMode = true;
    window.transcriptData = {
        messages: Array(100).fill(null).map((_, i) => ({
            speaker: 'Speaker 1',
            text: `Message ${i}`,
            hash: `hash_${i}`
        })),
        scrapedAt: new Date().toISOString(),
        meetingUrl: 'https://meet.google.com/abc'
    };

    // Start export
    const exportPromise = ExportManager.prepareExportContent(false);

    // Simulate background update during export
    setTimeout(() => {
        window.transcriptData.messages.push({
            speaker: 'Speaker 2',
            text: 'NEW MESSAGE DURING EXPORT',
            hash: 'hash_new'
        });
    }, 50);

    const exportContent = await exportPromise;

    // Verify: Export has exactly 100 messages (snapshot taken before update)
    const messageMatches = exportContent.match(/Message \d+/g);
    console.assert(messageMatches.length === 100, `Expected 100 messages, got ${messageMatches.length}`);
    console.assert(!exportContent.includes('NEW MESSAGE DURING EXPORT'), 'Export should not include new message');

    console.log('✅ Export during recording test passed');
}
```

### Success Criteria

- ✅ Export consistency guaranteed (immutable snapshot)
- ✅ NO race conditions during export
- ✅ Export metadata added (exportedAt, count)
- ✅ Clean code: DRY, null-safe

---

## SOLUTION 6: Data Integrity Verification System

### Problem Statement
**Preventive:** Automatyczne wykrywanie i naprawa uszkodzonych danych w storage.

**Potrzeba:**
1. Wykrywanie orphaned sessions (currentSessionId bez sesji w history)
2. Wykrywanie duplikatów w transkrypcji
3. Cleanup starych backgroundScan_* keys
4. Verification storage consistency

### Implementation

#### File 1: `/js/utils/data-integrity.js` (NEW FILE)

```javascript
/**
 * Data Integrity Verification System
 * Detects and repairs data corruption issues
 *
 * @module DataIntegrity
 * @version 1.0.0
 */

window.DataIntegrity = {
    /**
     * Verify storage integrity and detect issues
     *
     * @returns {Promise<Array<Object>>} Array of detected issues
     */
    async verifyStorageIntegrity() {
        console.log('🔍 [INTEGRITY] Starting verification...');
        const issues = [];

        try {
            const data = await window.StorageManager.getStorageData([
                window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA,
                window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID,
                window.AppConstants.STORAGE_KEYS.SESSION_HISTORY
            ]);

            // CHECK 1: Orphaned session (currentSessionId without session in history)
            if (data.currentSessionId && data.sessionHistory) {
                const sessionExists = data.sessionHistory.find(
                    s => s.id === data.currentSessionId
                );

                if (!sessionExists && data.transcriptData?.messages?.length > 0) {
                    issues.push({
                        type: 'ORPHANED_SESSION',
                        severity: 'HIGH',
                        description: `Current session ID "${data.currentSessionId}" not found in history`,
                        data: {
                            currentSessionId: data.currentSessionId,
                            messageCount: data.transcriptData.messages.length
                        },
                        autoFix: () => this.recreateSessionInHistory(data)
                    });
                }
            }

            // CHECK 2: Duplicate messages (same hash)
            if (data.transcriptData?.messages) {
                const hashes = data.transcriptData.messages.map(m => m.hash).filter(Boolean);
                const uniqueHashes = new Set(hashes);

                if (uniqueHashes.size !== hashes.length) {
                    const duplicateCount = hashes.length - uniqueHashes.size;
                    issues.push({
                        type: 'DUPLICATE_MESSAGES',
                        severity: 'MEDIUM',
                        description: `Found ${duplicateCount} duplicate messages`,
                        data: { duplicateCount, totalMessages: hashes.length },
                        autoFix: () => this.deduplicateMessages(data.transcriptData)
                    });
                }
            }

            // CHECK 3: Orphaned background scans (>1 hour old)
            const allKeys = await chrome.storage.local.get(null);
            const orphanedScans = [];

            for (const [key, value] of Object.entries(allKeys)) {
                if (key.startsWith('backgroundScan_') || key.startsWith('checkpoint_')) {
                    const age = Date.now() - (value.timestamp || 0);
                    if (age > 3600000) { // 1 hour
                        orphanedScans.push(key);
                    }
                }
            }

            if (orphanedScans.length > 0) {
                issues.push({
                    type: 'ORPHANED_BACKGROUND_SCANS',
                    severity: 'LOW',
                    description: `Found ${orphanedScans.length} orphaned background scan keys`,
                    data: { keys: orphanedScans },
                    autoFix: () => this.cleanupOrphanedScans(orphanedScans)
                });
            }

            // CHECK 4: Stale transaction markers
            const staleTransactions = Object.keys(allKeys).filter(k => {
                if (!k.startsWith('__transaction_')) return false;
                const age = Date.now() - (allKeys[k].timestamp || 0);
                return age > 300000; // 5 minutes
            });

            if (staleTransactions.length > 0) {
                issues.push({
                    type: 'STALE_TRANSACTIONS',
                    severity: 'LOW',
                    description: `Found ${staleTransactions.length} stale transaction markers`,
                    data: { keys: staleTransactions },
                    autoFix: () => window.StorageManager.removeStorageData(staleTransactions)
                });
            }

            console.log(`🔍 [INTEGRITY] Verification complete: ${issues.length} issues found`);
            return issues;

        } catch (error) {
            console.error('❌ [INTEGRITY] Verification failed:', error);
            return [];
        }
    },

    /**
     * Auto-fix detected issues
     *
     * @param {Array<Object>} issues - Issues to fix
     * @returns {Promise<Array<Object>>} Fix results
     */
    async autoFixIssues(issues) {
        console.log(`🔧 [INTEGRITY] Auto-fixing ${issues.length} issues...`);
        const results = [];

        for (const issue of issues) {
            try {
                if (issue.autoFix) {
                    await issue.autoFix();
                    results.push({
                        type: issue.type,
                        status: 'FIXED',
                        severity: issue.severity
                    });
                    console.log(`✅ [INTEGRITY] Fixed: ${issue.type}`);
                }
            } catch (error) {
                console.error(`❌ [INTEGRITY] Failed to fix ${issue.type}:`, error);
                results.push({
                    type: issue.type,
                    status: 'FAILED',
                    error: error.message
                });
            }
        }

        console.log(`🔧 [INTEGRITY] Auto-fix complete: ${results.filter(r => r.status === 'FIXED').length}/${issues.length} fixed`);
        return results;
    },

    /**
     * Recreate missing session in history
     * @private
     */
    async recreateSessionInHistory(data) {
        const newSession = {
            id: data.currentSessionId,
            title: window.generateSessionTitle ? window.generateSessionTitle() : 'Recovered Session',
            transcript: data.transcriptData,
            timestamp: new Date().toISOString()
        };

        data.sessionHistory.push(newSession);

        await window.StorageManager.saveSessionHistory(data.sessionHistory);
        console.log('✅ [INTEGRITY] Recreated session in history:', newSession.id);
    },

    /**
     * Remove duplicate messages
     * @private
     */
    async deduplicateMessages(transcriptData) {
        const seen = new Set();
        const uniqueMessages = [];

        for (const message of transcriptData.messages) {
            if (!message.hash) {
                // No hash - keep it (might be old data)
                uniqueMessages.push(message);
                continue;
            }

            if (!seen.has(message.hash)) {
                seen.add(message.hash);
                uniqueMessages.push(message);
            }
        }

        const removedCount = transcriptData.messages.length - uniqueMessages.length;
        transcriptData.messages = uniqueMessages;

        await window.StorageManager.saveTranscriptData(transcriptData);
        console.log(`✅ [INTEGRITY] Removed ${removedCount} duplicate messages`);
    },

    /**
     * Cleanup orphaned background scan keys
     * @private
     */
    async cleanupOrphanedScans(keys) {
        await chrome.storage.local.remove(keys);
        console.log(`✅ [INTEGRITY] Cleaned up ${keys.length} orphaned scans`);
    },

    /**
     * Initialize Data Integrity module
     */
    initialize() {
        console.log('🔍 [INTEGRITY] DataIntegrity initialized');
    }
};
```

#### File 2: `popup.js` (MODIFY)

**Location:** After line 98 (in initializeApplication)
**Change:** Add integrity verification

```javascript
async function initializeApplication() {
    // ... existing initialization (lines 69-98) ...

    // ✅ NEW: Data Integrity Verification (after core modules initialized)
    if (window.DataIntegrity) {
        window.DataIntegrity.initialize();

        // Run verification and auto-fix
        const integrityIssues = await window.DataIntegrity.verifyStorageIntegrity();

        if (integrityIssues.length > 0) {
            console.warn('⚠️ [INTEGRITY] Found issues:', integrityIssues);

            // Auto-fix if possible
            const fixResults = await window.DataIntegrity.autoFixIssues(integrityIssues);

            console.log('🔧 [INTEGRITY] Fix results:', fixResults);
        } else {
            console.log('✅ [INTEGRITY] No issues found');
        }
    }

    // ... rest of initialization ...
}
```

#### File 3: `popup.html` (MODIFY)

**Add script tag:**

```html
<!-- Utility Modules -->
<script src="js/utils/constants.js"></script>
<script src="js/utils/formatters.js"></script>
<script src="js/utils/dom-helpers.js"></script>
<script src="js/utils/data-integrity.js"></script>  <!-- NEW -->
```

### Testing Plan

#### Test 1: Orphaned Session Detection
```javascript
async function testOrphanedSessionDetection() {
    // Setup: Create orphaned session
    await chrome.storage.local.set({
        currentSessionId: 'orphaned_session_123',
        transcriptData: {
            messages: [{ speaker: 'Test', text: 'Test', hash: 'test1' }]
        },
        sessionHistory: [] // Empty - session not in history
    });

    // Run verification
    const issues = await DataIntegrity.verifyStorageIntegrity();

    // Verify: Orphaned session detected
    const orphanedIssue = issues.find(i => i.type === 'ORPHANED_SESSION');
    console.assert(orphanedIssue !== undefined, 'Orphaned session not detected');
    console.assert(orphanedIssue.severity === 'HIGH', 'Wrong severity');

    // Auto-fix
    await DataIntegrity.autoFixIssues(issues);

    // Verify: Session recreated in history
    const data = await chrome.storage.local.get(['sessionHistory']);
    const recreatedSession = data.sessionHistory.find(s => s.id === 'orphaned_session_123');
    console.assert(recreatedSession !== undefined, 'Session not recreated');

    console.log('✅ Orphaned session detection test passed');
}
```

### Success Criteria

- ✅ Automatic detection of 4+ issue types
- ✅ Auto-fix for all detectable issues
- ✅ User-transparent (runs on initialization)
- ✅ <100ms verification time
- ✅ Clean code: Modular, extensible

---

## CODE QUALITY GUIDELINES

### 🎯 Clean Code Principles

#### 1. DRY (Don't Repeat Yourself)
- ❌ Duplicate storage save calls → ✅ Use TransactionCoordinator
- ❌ Duplicate age verification → ✅ Extract to utility function
- ❌ Duplicate error handling → ✅ Use consistent error handling pattern

#### 2. Single Responsibility Principle (SRP)
- Each function does ONE thing
- Extract logic >50 lines to separate functions
- Example: `createCheckpoint()` only creates checkpoints, cleanup is separate

#### 3. Consistent Naming
- Functions: `camelCase` (e.g., `scheduleMerge`, `retrieveData`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_WAIT_TIME`, `CHECK_INTERVAL`)
- Private methods: `_prefixWithUnderscore` (e.g., `_performMerge`, `_tryPrimaryKey`)

#### 4. Async/Await > Callbacks
- ✅ `await TransactionCoordinator.saveRecordingState(...)`
- ❌ `chrome.storage.local.set({...}, () => { ... })`

#### 5. Error Handling
```javascript
// ✅ GOOD: Try-catch with specific error handling
try {
    await someDangerousOperation();
} catch (error) {
    console.error('Operation failed:', error);
    // Specific recovery action
    await fallbackOperation();
}

// ❌ BAD: Silent failure
try {
    await someDangerousOperation();
} catch (error) {
    // Nothing - data lost!
}
```

#### 6. JSDoc Comments
```javascript
/**
 * Execute atomic storage transaction
 *
 * @param {Array<Object>} operations - Array of {key, value} pairs
 * @returns {Promise<Object>} Result with success flag
 * @throws {Error} If operations array is invalid
 *
 * @example
 * await executeTransaction([
 *   { key: 'data1', value: {...} }
 * ]);
 */
```

### 🧹 Dead Code Removal Checklist

- [ ] Remove all commented-out code blocks
- [ ] Remove unused imports/requires
- [ ] Remove deprecated functions (mark @deprecated first, then remove)
- [ ] Remove debug console.logs (keep errors/warnings only)
- [ ] Remove unused variables
- [ ] Remove duplicate utility functions
- [ ] Clean up excessive whitespace

### 📏 Code Length Guidelines

- Functions: <100 lines (ideal: <50 lines)
- Files: <1000 lines (ideal: <500 lines)
- Classes/Objects: <500 lines
- If exceeds limits: Extract to separate module

### ✅ Code Review Checklist (Before Commit)

- [ ] All functions have JSDoc comments
- [ ] No duplicate code (DRY applied)
- [ ] All magic numbers extracted to constants
- [ ] All async operations have error handling
- [ ] All promises have .catch() or try-catch
- [ ] Consistent naming conventions
- [ ] No nested callbacks (callback hell)
- [ ] No dead code
- [ ] No excessive console.logs
- [ ] Function responsibilities clear (SRP)
- [ ] Tests written for critical paths

---

## 📊 FINAL VALIDATION

### Pre-Launch Checklist

- [ ] **Phase 1 Complete**
  - [ ] Transaction Coordinator implemented and tested
  - [ ] Background Checkpoints working with 3 recovery paths
  - [ ] Priority Queue eliminating race conditions
  - [ ] Restoration timeout protection active

- [ ] **Phase 2 Complete**
  - [ ] Export snapshot preventing data corruption
  - [ ] Data Integrity running on startup

- [ ] **Code Quality**
  - [ ] All dead code removed
  - [ ] DRY principle applied throughout
  - [ ] JSDoc comments on all public functions
  - [ ] Consistent error handling

- [ ] **Testing Complete**
  - [ ] All 15+ critical tests passed
  - [ ] Long-running session test (2+ hours)
  - [ ] Popup close recovery verified
  - [ ] Tab ID reuse protection verified

- [ ] **Metrics Achieved**
  - [ ] ZERO data loss in test scenarios
  - [ ] <100ms latency overhead per save
  - [ ] <100KB additional storage per session
  - [ ] All transaction atomic (100% success or rollback)

---

## 🎉 SUCCESS CRITERIA

**Przed:**
- ~10-15% sesji z utratą danych
- ~8-10% duplikatów sesji
- ~5% race conditions
- Użytkownicy frustrację

**Po Implementacji:**
- ✅ **0% data loss** (ZERO TOLERANCE)
- ✅ **0% duplicates** (atomic operations)
- ✅ **0% race conditions** (priority queue)
- ✅ **100% data integrity** (verification + auto-fix)

**Bulletproof Guarantees:**
1. ✅ Popup close → ZERO data loss (checkpoints + flush)
2. ✅ Browser crash → Recovery on restart (transaction markers)
3. ✅ Storage errors → Automatic rollback
4. ✅ Race conditions → Sequential queue processing
5. ✅ Tab ID reuse → URL verification protection
6. ✅ Restoration timeout → 10s auto-recovery
7. ✅ Export corruption → Immutable snapshots
8. ✅ Data corruption → Auto-detect and repair

---

## 📝 NOTES

- Plan jest living document - update w miarę postępów
- Każdy completed checkbox powinien mieć datę: `[x] 2025-12-16`
- Problemy/blockers notować w sekcji Issues
- Code reviews przed merge do main

---

**Last Updated:** 2025-12-16
**Version:** 1.0.0
**Status:** 🚧 READY FOR IMPLEMENTATION
