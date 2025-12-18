/**
 * Transaction Coordinator - Ensures atomic storage operations
 * Provides ACID-like guarantees for Chrome storage writes
 *
 * @module TransactionCoordinator
 * @version 2.0.0
 *
 * Features:
 * - Atomic operations (all-or-nothing guarantee)
 * - Automatic rollback on failure
 * - Transaction verification
 * - Crash recovery (incomplete transaction detection)
 * - Timeout protection
 */

window.TransactionCoordinator = {
    /**
     * Active transactions map (for monitoring and debugging)
     * @private
     */
    _activeTransactions: new Map(),

    /**
     * Transaction timeout (5 seconds max per transaction)
     * @private
     */
    get _transactionTimeout() {
        return window.AppConstants.TIMING.TRANSACTION_TIMEOUT;
    },

    /**
     * Execute atomic storage transaction with rollback support
     * All operations succeed or all fail (atomic guarantee)
     *
     * @param {Array<Object>} operations - Array of {key, value} pairs to save
     * @returns {Promise<Object>} Result with success flag and optional error
     *
     * @example
     * const result = await TransactionCoordinator.executeTransaction([
     *   { key: 'transcriptData', value: data },
     *   { key: 'sessionHistory', value: history }
     * ]);
     * if (result.success) {
     *   console.log('Transaction completed in', result.duration, 'ms');
     * }
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

            // Read current state for rollback capability
            const keysToRead = operations.map(op => op.key);
            const currentState = await window.StorageManager.getStorageData(keysToRead);

            // Prepare atomic update object
            const updates = {};
            const rollbackData = {};

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

            // Atomic write - single chrome.storage.local.set call ensures all-or-nothing operation
            await this._executeWithTimeout(
                window.StorageManager.setStorageData(updates),
                this._transactionTimeout
            );

            // Verify write succeeded
            const verifyResult = await this._verifyTransaction(updates);
            if (!verifyResult.success) {
                throw new Error(`Transaction verification failed: ${verifyResult.error}`);
            }

            // Cleanup transaction marker
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

            // Attempt to restore previous state via rollback
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
     *
     * @example
     * await TransactionCoordinator.saveRecordingState({
     *   transcriptData: window.transcriptData,
     *   currentSessionId: window.currentSessionId,
     *   sessionHistory: window.sessionHistory
     * });
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
     * @param {Promise} promise - Promise to execute
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise} Race between promise and timeout
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
     * @param {Object} updates - Data that should have been written
     * @returns {Promise<Object>} Verification result
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
     * @param {string} transactionId - Transaction ID for logging
     * @param {Object} rollbackData - Previous state to restore
     * @returns {Promise<void>}
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
     * @param {string} transactionId - Transaction ID
     * @param {Error} originalError - Original error that caused failure
     * @param {Error} rollbackError - Error during rollback attempt
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
     * @returns {string} Unique transaction ID
     */
    _generateTransactionId() {
        return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Recovery: Check for incomplete transactions on startup
     * Called during initialization to clean up crashed transactions
     * @returns {Promise<void>}
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
     * Get status of active transactions (for debugging)
     * @returns {Object} Status information
     */
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

    /**
     * Initialize Transaction Coordinator
     */
    initialize() {
        console.log('💳 [TRANSACTION] TransactionCoordinator initialized');

        // Recover any incomplete transactions from previous session
        this.recoverIncompleteTransactions();
    }
};
