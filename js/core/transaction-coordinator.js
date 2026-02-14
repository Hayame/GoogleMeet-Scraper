/**
 * Transaction Coordinator - Ensures atomic storage operations
 * Provides rollback on failure, transaction verification, crash recovery, and timeout protection.
 */

window.TransactionCoordinator = {
    _activeTransactions: new Map(),

    get _transactionTimeout() {
        return window.AppConstants.TIMING.TRANSACTION_TIMEOUT;
    },

    /**
     * Execute atomic storage transaction with rollback support.
     * All operations succeed or all fail.
     *
     * @param {Array<{key: string, value: *}>} operations - Key-value pairs to save atomically
     * @returns {Promise<{success: boolean, transactionId: string, duration: number, error?: string}>}
     */
    async executeTransaction(operations) {
        const transactionId = this._generateTransactionId();
        const startTime = Date.now();
        let rollbackData = {};

        try {
            if (!Array.isArray(operations) || operations.length === 0) {
                throw new Error('Operations must be non-empty array');
            }

            this._activeTransactions.set(transactionId, {
                startTime,
                operations: operations.map(op => op.key)
            });

            // Read current state for rollback capability
            const keysToRead = operations.map(op => op.key);
            const currentState = await window.StorageManager.getStorageData(keysToRead);

            const updates = {};
            for (const operation of operations) {
                if (!operation.key) {
                    throw new Error('Operation missing required "key" property');
                }
                rollbackData[operation.key] = currentState[operation.key];
                updates[operation.key] = operation.value;
            }

            // Add transaction marker for crash recovery
            const markerKey = `__transaction_${transactionId}`;
            updates[markerKey] = {
                id: transactionId,
                timestamp: Date.now(),
                keys: Object.keys(updates),
                status: 'IN_PROGRESS'
            };

            await this._executeWithTimeout(
                window.StorageManager.setStorageData(updates),
                this._transactionTimeout
            );

            const verifyResult = await this._verifyTransaction(updates);
            if (!verifyResult.success) {
                throw new Error(`Transaction verification failed: ${verifyResult.error}`);
            }

            await window.StorageManager.removeStorageData([markerKey]);
            this._activeTransactions.delete(transactionId);

            return { success: true, transactionId, duration: Date.now() - startTime };

        } catch (error) {
            console.error('❌ [TRANSACTION] Failed:', {
                transactionId, error: error.message, duration: Date.now() - startTime
            });

            try {
                await this._rollback(transactionId, rollbackData);
            } catch (rollbackError) {
                console.error('❌ [TRANSACTION] Rollback failed:', rollbackError);
                this._logCriticalFailure(transactionId, error, rollbackError);
            }

            this._activeTransactions.delete(transactionId);
            return { success: false, transactionId, error: error.message, duration: Date.now() - startTime };
        }
    },

    /**
     * Save complete recording state atomically (convenience wrapper)
     */
    async saveRecordingState(state) {
        const KEYS = window.AppConstants.STORAGE_KEYS;
        const stateKeyMap = {
            transcriptData: KEYS.TRANSCRIPT_DATA,
            currentSessionId: KEYS.CURRENT_SESSION_ID,
            sessionHistory: KEYS.SESSION_HISTORY,
            realtimeMode: KEYS.REALTIME_MODE,
            recordingStartTime: KEYS.RECORDING_START_TIME,
            sessionStartTime: KEYS.SESSION_START_TIME,
            meetTabId: KEYS.MEET_TAB_ID
        };

        const operations = [];
        for (const [prop, storageKey] of Object.entries(stateKeyMap)) {
            if (state[prop] !== undefined) {
                operations.push({ key: storageKey, value: state[prop] });
            }
        }

        return this.executeTransaction(operations);
    },

    _executeWithTimeout(promise, timeout) {
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Transaction timeout')), timeout)
            )
        ]);
    },

    async _verifyTransaction(updates) {
        try {
            const keysToVerify = Object.keys(updates).filter(k => !k.startsWith('__transaction_'));
            const verifyResult = await window.StorageManager.getStorageData(keysToVerify);

            for (const key of keysToVerify) {
                if (verifyResult[key] === undefined && updates[key] !== undefined) {
                    return { success: false, error: `Key ${key} not found in storage after write` };
                }
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async _rollback(transactionId, rollbackData) {
        console.warn('⚠️ [TRANSACTION] Rolling back:', transactionId);

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

    _logCriticalFailure(transactionId, originalError, rollbackError) {
        const criticalLog = {
            timestamp: new Date().toISOString(),
            transactionId,
            originalError: originalError.message,
            rollbackError: rollbackError.message,
            activeTransactions: Array.from(this._activeTransactions.keys())
        };

        console.error('🚨 [TRANSACTION] CRITICAL FAILURE:', criticalLog);

        try {
            chrome.storage.local.set({ __transaction_failure_log: criticalLog });
        } catch (e) {
            console.error('Failed to log critical failure:', e);
        }
    },

    _generateTransactionId() {
        return `tx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    },

    /**
     * Clean up stale transaction markers from previous crashed sessions
     */
    async recoverIncompleteTransactions() {
        try {
            const allKeys = await chrome.storage.local.get(null);
            const STALE_THRESHOLD_MS = 300000; // 5 minutes
            const transactionMarkers = Object.keys(allKeys).filter(k => k.startsWith('__transaction_'));

            if (transactionMarkers.length === 0) return;

            console.warn('⚠️ [TRANSACTION] Found incomplete transactions:', transactionMarkers.length);

            const staleMarkers = transactionMarkers.filter(key => {
                const age = Date.now() - allKeys[key].timestamp;
                return age > STALE_THRESHOLD_MS;
            });

            if (staleMarkers.length > 0) {
                await window.StorageManager.removeStorageData(staleMarkers);
                console.log('✅ [TRANSACTION] Cleaned up stale markers:', staleMarkers.length);
            }
        } catch (error) {
            console.error('❌ [TRANSACTION] Recovery failed:', error);
        }
    },

    getStatus() {
        return {
            activeTransactions: Array.from(this._activeTransactions.entries()).map(([id, data]) => ({
                id,
                duration: Date.now() - data.startTime,
                operations: data.operations
            })),
            activeCount: this._activeTransactions.size
        };
    },

    initialize() {
        console.log('💳 [TRANSACTION] TransactionCoordinator initialized');
        this.recoverIncompleteTransactions();
    }
};
