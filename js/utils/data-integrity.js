/**
 * Data Integrity Verification System
 * Detects and repairs data corruption issues automatically
 *
 * @module DataIntegrity
 * @version 1.0.0
 */

window.DataIntegrity = {
    /**
     * Verify storage integrity and detect issues
     * Runs 4 comprehensive checks on application data
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
                const sessionExists = data.sessionHistory.find(s => s.id === data.currentSessionId);

                if (!sessionExists && data.transcriptData?.messages?.length > 0) {
                    issues.push({
                        type: 'ORPHANED_SESSION',
                        severity: 'HIGH',
                        description: `Session "${data.currentSessionId}" not in history`,
                        data: {
                            currentSessionId: data.currentSessionId,
                            messageCount: data.transcriptData.messages.length
                        },
                        autoFix: () => this._recreateSessionInHistory(data)
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
                        description: `${duplicateCount} duplicate messages found`,
                        data: {
                            duplicateCount,
                            totalMessages: hashes.length
                        },
                        autoFix: () => this._deduplicateMessages(data.transcriptData)
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
                    type: 'ORPHANED_SCANS',
                    severity: 'LOW',
                    description: `${orphanedScans.length} stale background scan keys`,
                    data: { keys: orphanedScans },
                    autoFix: () => this._cleanupOrphanedScans(orphanedScans)
                });
            }

            // CHECK 4: Stale transaction markers (>5 minutes)
            const staleTransactions = Object.keys(allKeys).filter(k => {
                if (!k.startsWith('__transaction_')) return false;
                const age = Date.now() - (allKeys[k].timestamp || 0);
                return age > 300000; // 5 minutes
            });

            if (staleTransactions.length > 0) {
                issues.push({
                    type: 'STALE_TRANSACTIONS',
                    severity: 'LOW',
                    description: `${staleTransactions.length} stale transaction markers`,
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

        const fixedCount = results.filter(r => r.status === 'FIXED').length;
        console.log(`🔧 [INTEGRITY] Auto-fix complete: ${fixedCount}/${issues.length} fixed`);
        return results;
    },

    /**
     * Recreate missing session in history
     * @private
     */
    async _recreateSessionInHistory(data) {
        const newSession = {
            id: data.currentSessionId,
            title: window.generateSessionTitle ? window.generateSessionTitle() : 'Recovered Session',
            date: new Date().toISOString(),
            transcript: data.transcriptData
        };

        data.sessionHistory.push(newSession);

        await window.StorageManager.setStorageData({
            [window.AppConstants.STORAGE_KEYS.SESSION_HISTORY]: data.sessionHistory
        });
        console.log('✅ [INTEGRITY] Recreated session in history:', newSession.id);
    },

    /**
     * Remove duplicate messages
     * @private
     */
    async _deduplicateMessages(transcriptData) {
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

        await window.StorageManager.setStorageData({
            [window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA]: transcriptData
        });
        console.log(`✅ [INTEGRITY] Removed ${removedCount} duplicate messages`);
    },

    /**
     * Cleanup orphaned background scan keys
     * @private
     */
    async _cleanupOrphanedScans(keys) {
        await chrome.storage.local.remove(keys);
        console.log(`✅ [INTEGRITY] Cleaned ${keys.length} orphaned scans`);
    },

    /**
     * Initialize Data Integrity module
     */
    initialize() {
        console.log('🔍 [INTEGRITY] DataIntegrity initialized');
    }
};
