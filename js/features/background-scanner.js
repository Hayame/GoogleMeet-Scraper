/**
 * Background Scanner Module
 * Handles background scanning functionality and message processing
 */

window.BackgroundScanner = {
    // Priority queue system for merge coordination (replaces simple mutex)
    _mergeQueue: [],          // Array of {id, data, priority, timestamp, retryCount}
    _isMerging: false,        // True while processing queue
    _mergeSequence: 0,        // Unique ID generator
    get _maxQueueSize() {     // Prevent memory leak
        return window.AppConstants.TIMING.MERGE_QUEUE_MAX_SIZE;
    },

    /**
     * Handle background scan updates from content script
     * @param {Object} data - Transcript data from background scan
     */
    async handleBackgroundScanUpdate(data) {
        if (!window.realtimeMode) {
            return;
        }

        if (window.StateManager?.getRecordingStopped()) {
            return;
        }

        if (!data || !data.messages || data.messages.length === 0) {
            return;
        }

        // Schedule with priority 1 (background updates are low priority, restoration goes first)
        await this.scheduleMerge(data, 1);
    },

    /**
     * Schedule merge operation with priority
     * Higher priority = executes first (100 = restoration, 10 = manual, 1 = background)
     *
     * @param {Object} data - Transcript data to merge
     * @param {number} priority - Priority level (default: 0)
     * @param {Function|null} onComplete - Optional callback fired after merge completes (default: null)
     * @returns {Promise<void>}
     */
    async scheduleMerge(data, priority = 0, onComplete = null) {
        const operation = {
            id: ++this._mergeSequence,
            data,
            priority,
            timestamp: Date.now(),
            retryCount: 0,
            onComplete
        };

        // Queue size protection - prevent memory leak
        if (this._mergeQueue.length >= this._maxQueueSize) {
            console.warn('⚠️ [MERGE QUEUE] Queue full, dropping lowest priority operation');
            this._mergeQueue.sort((a, b) => b.priority - a.priority);
            this._mergeQueue.pop();
        }

        this._mergeQueue.push(operation);
        this._mergeQueue.sort((a, b) => b.priority - a.priority); // Highest priority first

        console.log(`📋 [MERGE] Scheduled #${operation.id} (priority: ${priority}, queue: ${this._mergeQueue.length})`);

        // Start processing queue
        await this._processMergeQueue();
    },

    /**
     * Process merge queue sequentially
     * Ensures no concurrent merges, implements retry logic
     * @private
     */
    async _processMergeQueue() {
        if (this._isMerging) {
            return;
        }

        const MAX_RETRIES = 3;

        while (this._mergeQueue.length > 0) {
            this._isMerging = true;
            const operation = this._mergeQueue.shift();

            console.log(`🔄 [MERGE] Processing #${operation.id} (${this._mergeQueue.length} remaining)`);

            try {
                await this._performMerge(operation.data);
                console.log(`✅ [MERGE] Completed #${operation.id}`);

                if (typeof operation.onComplete === 'function') {
                    try {
                        await operation.onComplete();
                    } catch (callbackError) {
                        console.error(`❌ [MERGE] Callback failed for #${operation.id}:`, callbackError);
                    }
                }
            } catch (error) {
                console.error(`❌ [MERGE] Failed #${operation.id}:`, error);

                if (operation.retryCount < MAX_RETRIES) {
                    operation.retryCount++;
                    operation.priority = Math.max(0, operation.priority - 10);
                    this._mergeQueue.push(operation);
                    this._mergeQueue.sort((a, b) => b.priority - a.priority);
                    console.log(`🔄 [MERGE] Re-queued #${operation.id} (retry ${operation.retryCount}/${MAX_RETRIES})`);
                } else {
                    console.error(`💀 [MERGE] Dropped #${operation.id} after ${MAX_RETRIES} retries`);
                }
            }
        }

        this._isMerging = false;
    },

    /**
     * Perform actual merge operation
     * @private
     * @param {Object} data - Transcript data to merge
     */
    async _performMerge(data) {
        if (!data?.messages) {
            console.log('🔄 [MERGE] Invalid data structure');
            return;
        }

        const currentMessages = window.transcriptData?.messages || [];
        const newMessages = data.messages;

        // Protect against data loss: empty scan with existing data means CC was closed
        if (newMessages.length === 0 && currentMessages.length > 0) {
            console.warn('⚠️ [MERGE] Ignoring empty scan - preserving existing', currentMessages.length, 'messages');
            return;
        }

        const changes = this.detectChanges(currentMessages, newMessages);

        if (changes.added.length === 0 && changes.updated.length === 0) {
            return;
        }

        // Initialize or update transcriptData
        if (!window.transcriptData) {
            window.transcriptData = {
                messages: newMessages,
                scrapedAt: data.scrapedAt,
                meetingUrl: data.meetingUrl
            };
        } else {
            window.transcriptData.messages = newMessages;
            window.transcriptData.scrapedAt = data.scrapedAt;
            if (data.meetingUrl) {
                window.transcriptData.meetingUrl = data.meetingUrl;
            }
        }

        window.displayTranscript?.(window.transcriptData, changes);
        window.updateStats?.(window.transcriptData);
        window.SearchFilterManager?.completePendingRestoration?.();

        const exportTxtBtn = document.getElementById('exportTxtBtn');
        if (exportTxtBtn) {
            exportTxtBtn.disabled = false;
        }

        const saveResult = await window.TransactionCoordinator.saveRecordingState({
            transcriptData: window.transcriptData,
            currentSessionId: window.currentSessionId,
            sessionHistory: window.sessionHistory
        });

        if (!saveResult.success) {
            throw new Error(`Save failed: ${saveResult.error}`);
        }

        try {
            await window.SessionHistoryManager?.autoSaveCurrentSession();
        } catch (error) {
            console.error('❌ [BACKGROUND] Auto-save failed:', error);
        }

        window.updateStatus?.(
            `Restored ${changes.added.length} new entries (${window.transcriptData.messages.length} total)`,
            'success'
        );

        console.log('✅ [MERGE] Merge completed:', changes.added.length, 'added,', window.transcriptData.messages.length, 'total');
    },

    /**
     * Initialize background scan message listener
     */
    initializeMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'backgroundScanUpdate') {
                this.handleBackgroundScanUpdate(request.data);
            }
            return true;
        });
    },

    /**
     * Send a runtime message and return a Promise
     * @private
     * @param {Object} message - Message to send
     * @param {string} errorText - Error message on failure
     * @returns {Promise<Object>} Response from the runtime
     */
    _sendRuntimeMessage(message, errorText) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (response && response.success) {
                    resolve(response);
                } else {
                    reject(new Error(errorText));
                }
            });
        });
    },

    /**
     * Start background scanning for a specific tab
     * @param {number} tabId - The tab ID to start scanning on
     * @returns {Promise<Object>} Response when scanning starts
     */
    async startBackgroundScanning(tabId) {
        const response = await this._sendRuntimeMessage(
            { action: 'startBackgroundScanning', tabId },
            'Failed to start background scanning'
        );
        console.log('🟢 Background scanning started for tab:', tabId);
        return response;
    },

    /**
     * Stop background scanning
     * @returns {Promise<Object>} Response when scanning stops
     */
    async stopBackgroundScanning() {
        const response = await this._sendRuntimeMessage(
            { action: 'stopBackgroundScanning' },
            'Failed to stop background scanning'
        );
        console.log('✅ Background scanning stopped');
        return response;
    },

    /**
     * Find or verify Meet tab for reactivation
     * Tries stored tab ID first, then falls back to searching all tabs
     * @private
     * @returns {Promise<number|null>} Meet tab ID or null
     */
    async _findOrVerifyMeetTab() {
        const result = await window.StorageManager.getStorageData([window.AppConstants.STORAGE_KEYS.MEET_TAB_ID]);
        const storedTabId = result[window.AppConstants.STORAGE_KEYS.MEET_TAB_ID];

        if (storedTabId && await this.verifyMeetTab(storedTabId)) {
            console.log('✅ [REACTIVATE] Stored Meet tab verified:', storedTabId);
            return storedTabId;
        }

        console.log('🔍 [REACTIVATE] Searching for active Meet tab...');
        const meetTabId = await this.findActiveMeetTab();

        if (meetTabId) {
            await window.StorageManager.setStorageData({
                [window.AppConstants.STORAGE_KEYS.MEET_TAB_ID]: meetTabId
            });
            console.log('✅ [REACTIVATE] Found and saved Meet tab:', meetTabId);
        }

        return meetTabId;
    },

    /**
     * Recover and merge accumulated scan data
     * @private
     * @param {number} tabId - Meet tab ID
     * @returns {Promise<boolean>} Success status
     */
    async _recoverAccumulatedData(tabId) {
        const accumulatedData = await this.retrieveAccumulatedScanData(tabId);
        if (!accumulatedData) {
            return false;
        }

        try {
            await this.mergeAccumulatedData(accumulatedData);
            await window.StorageManager.removeStorageData([`backgroundScan_${tabId}`]);
            console.log('✅ [REACTIVATE] Data merged and cleaned from storage');
            return true;
        } catch (mergeError) {
            console.error('❌ [REACTIVATE] Merge failed, keeping data for retry:', mergeError);
            window.updateStatus?.('Częściowy błąd przywracania danych - dane zachowane', 'warning');
            return false;
        }
    },

    /**
     * Reactivate background scanner after popup opens
     * Handles multiple failure modes with proper fallbacks and retry logic
     * @returns {Promise<Object>} Result object with success status and details
     */
    async reactivateAfterRestore() {
        try {
            console.log('🔄 [REACTIVATE] Starting reactivation');

            const meetTabId = await this._findOrVerifyMeetTab();
            if (!meetTabId) {
                console.error('❌ [REACTIVATE] No Google Meet tab found');
                window.updateStatus?.('Nie znaleziono aktywnej karty Google Meet', 'error');
                return { success: false, reason: 'NO_MEET_TAB' };
            }

            const mergeSuccess = await this._recoverAccumulatedData(meetTabId);
            const restartSuccess = await this.startBackgroundScanningWithRetry(meetTabId);

            if (restartSuccess) {
                console.log('✅ [REACTIVATE] Reactivation completed successfully');
                window.updateStatus?.('Skanowanie w tle wznowione pomyślnie', 'success');
            } else {
                console.error('❌ [REACTIVATE] Reactivation failed');
                window.updateStatus?.('Nie udało się wznowić skanowania w tle', 'error');
            }

            return { success: true, mergeSuccess, restartSuccess };
        } catch (error) {
            console.error('❌ [REACTIVATE] Critical error:', error);
            window.updateStatus?.('Błąd reaktywacji: ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    },

    /** Maximum age for accumulated scan data: 1 hour */
    _MAX_DATA_AGE: 60 * 60 * 1000,

    /**
     * Retrieve accumulated scan data with multi-path recovery
     * Tries: Primary key, Checkpoints, Meeting URL match
     * @param {number} tabId - Meet tab ID
     * @returns {Promise<Object|null>} Accumulated transcript data or null
     */
    async retrieveAccumulatedScanData(tabId) {
        console.log('🔍 [RETRIEVE] Searching for accumulated data, tabId:', tabId);

        const data = await this._tryPrimaryKey(tabId)
            || await this._tryCheckpoints(tabId)
            || await this._tryMeetingUrlMatch();

        if (data) {
            return data;
        }

        console.log('⚠️ [RETRIEVE] No accumulated data found');
        return null;
    },

    /**
     * Merge accumulated data with existing transcript using high-priority queue
     * @param {Object} accumulatedData - Accumulated transcript data from storage
     * @param {Function|null} onComplete - Optional callback fired after merge completes
     * @returns {Promise<void>} Promise that resolves when merge completes
     */
    async mergeAccumulatedData(accumulatedData, onComplete = null) {
        return new Promise((resolve) => {
            this.scheduleMerge(accumulatedData, 100, async () => {
                if (onComplete) {
                    try {
                        await onComplete();
                    } catch (error) {
                        console.error('❌ [MERGE] Custom callback failed:', error);
                    }
                }
                resolve();
            });
        });
    },

    /**
     * Try primary storage key recovery
     * @private
     * @param {number} tabId - Tab ID
     * @returns {Promise<Object|null>} Data or null
     */
    async _tryPrimaryKey(tabId) {
        try {
            const storageKey = `backgroundScan_${tabId}`;
            const result = await window.StorageManager.getStorageData([storageKey]);
            const scanData = result[storageKey];

            if (!scanData?.data) {
                return null;
            }

            if (Date.now() - scanData.timestamp > this._MAX_DATA_AGE) {
                console.warn(`⚠️ [RETRIEVE] Primary data too old (${Math.round((Date.now() - scanData.timestamp) / 60000)} min)`);
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
     * @param {number} tabId - Tab ID
     * @returns {Promise<Object|null>} Data or null
     */
    async _tryCheckpoints(tabId) {
        try {
            const allData = await chrome.storage.local.get(null);
            const checkpointKeys = Object.keys(allData)
                .filter(k => k.startsWith(`checkpoint_${tabId}_`))
                .sort()
                .reverse();

            if (checkpointKeys.length === 0) {
                return null;
            }

            const latestCheckpoint = allData[checkpointKeys[0]];

            if (Date.now() - latestCheckpoint.timestamp > this._MAX_DATA_AGE) {
                console.warn('⚠️ [RETRIEVE] Checkpoint too old, removing');
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
     * Try meeting URL match recovery (protection against tab ID reuse)
     * @private
     * @returns {Promise<Object|null>} Data or null
     */
    async _tryMeetingUrlMatch() {
        try {
            const currentMeetingUrl = window.transcriptData?.meetingUrl;
            if (!currentMeetingUrl) {
                return null;
            }

            const allData = await chrome.storage.local.get(null);

            for (const [key, value] of Object.entries(allData)) {
                if (!key.startsWith('backgroundScan_') || value.meetingUrl !== currentMeetingUrl) {
                    continue;
                }

                if (Date.now() - value.timestamp > this._MAX_DATA_AGE) {
                    console.warn('⚠️ [RETRIEVE] URL-matched data too old');
                    return null;
                }

                console.log(`🔗 [RETRIEVE] Found data by URL match: ${key}`);
                return value.data;
            }

            return null;
        } catch (error) {
            console.error('❌ [RETRIEVE] URL match failed:', error);
            return null;
        }
    },

    /**
     * Flush pending data immediately (called on popup close)
     * @returns {Promise<void>}
     */
    async flushPendingData() {
        try {
            const result = await window.StorageManager.getStorageData([
                window.AppConstants.STORAGE_KEYS.MEET_TAB_ID
            ]);
            const tabId = result[window.AppConstants.STORAGE_KEYS.MEET_TAB_ID];

            if (!tabId) {
                return;
            }

            const accumulatedData = await this.retrieveAccumulatedScanData(tabId);
            if (!accumulatedData?.messages?.length) {
                return;
            }

            console.log(`💾 [FLUSH] Merging ${accumulatedData.messages.length} pending messages`);
            await this.mergeAccumulatedData(accumulatedData);
            await this._cleanupBackgroundScanData(tabId);
            console.log('✅ [FLUSH] Data flushed successfully');
        } catch (error) {
            console.error('❌ [FLUSH] Failed to flush data:', error);
        }
    },

    /**
     * Cleanup background scan data after successful merge
     * @private
     * @param {number} tabId - Tab ID
     * @returns {Promise<void>}
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
    },

    /**
     * Verify that tab exists and is a Google Meet tab
     * @param {number} tabId - Tab ID to verify
     * @returns {Promise<boolean>} true if tab is an active Meet tab
     */
    async verifyMeetTab(tabId) {
        return new Promise((resolve) => {
            chrome.tabs.get(tabId, (tab) => {
                if (chrome.runtime.lastError || !tab?.url) {
                    resolve(false);
                    return;
                }
                resolve(tab.url.includes('meet.google.com'));
            });
        });
    },

    /**
     * Find active Google Meet tab as fallback
     * Tries active tab in current window first, then any Meet tab
     * @returns {Promise<number|null>} Meet tab ID or null
     */
    async findActiveMeetTab() {
        try {
            const meetUrl = 'https://meet.google.com/*';

            const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true, url: meetUrl });
            if (activeTabs?.length > 0) {
                return activeTabs[0].id;
            }

            const anyMeetTabs = await chrome.tabs.query({ url: meetUrl });
            if (anyMeetTabs?.length > 0) {
                return anyMeetTabs[0].id;
            }

            return null;
        } catch (error) {
            console.error('❌ [FIND] Error finding Meet tab:', error);
            return null;
        }
    },

    /**
     * Restart background scanning with retry mechanism
     * Tries 3 times with 1 second delay between attempts
     * @param {number} tabId - Tab ID to scan
     * @returns {Promise<boolean>} true if successful
     */
    async startBackgroundScanningWithRetry(tabId, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.startBackgroundScanning(tabId);
                return true;
            } catch (error) {
                console.warn(`⚠️ [RETRY] Attempt ${attempt}/${maxRetries} failed:`, error.message);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        console.error(`❌ [RETRY] All ${maxRetries} attempts exhausted`);
        return false;
    },

    /**
     * Detect changes between old and new transcript messages
     * @param {Array} oldMessages - Previous transcript messages
     * @param {Array} newMessages - New transcript messages
     * @returns {Object} Object with added, updated, and removed arrays
     */
    detectChanges(oldMessages, newMessages) {
        const changes = { added: [], updated: [], removed: [] };

        if (!oldMessages || oldMessages.length === 0) {
            if (newMessages?.length > 0) {
                changes.added = [...newMessages];
            }
            return changes;
        }

        if (!newMessages || newMessages.length === 0) {
            changes.removed = [...oldMessages];
            return changes;
        }

        // Build hash maps for efficient lookups
        const oldHashes = new Map();
        const newHashes = new Map();

        oldMessages.forEach((msg, index) => {
            oldHashes.set(msg.hash, { ...msg, originalIndex: index });
        });
        newMessages.forEach((msg, index) => {
            newHashes.set(msg.hash, { ...msg, originalIndex: index });
        });

        // First pass: Position-based comparison for updates (same position, same speaker, different text)
        const minLength = Math.min(oldMessages.length, newMessages.length);
        for (let i = 0; i < minLength; i++) {
            const oldMsg = oldMessages[i];
            const newMsg = newMessages[i];

            if (oldMsg.hash === newMsg.hash) {
                oldHashes.delete(oldMsg.hash);
                newHashes.delete(newMsg.hash);
            } else if (oldMsg.speaker === newMsg.speaker) {
                changes.updated.push({ ...newMsg, index: i, previousText: oldMsg.text });
                oldHashes.delete(oldMsg.hash);
                newHashes.delete(newMsg.hash);
            }
        }

        // Second pass: Hash-based comparison for additions/removals
        for (const [hash, newMsg] of newHashes) {
            if (!oldHashes.has(hash)) {
                changes.added.push(newMsg);
            }
        }
        for (const [hash, oldMsg] of oldHashes) {
            if (!newHashes.has(hash)) {
                changes.removed.push(oldMsg);
            }
        }

        console.log('🔍 [CHANGES] added:', changes.added.length, 'updated:', changes.updated.length, 'removed:', changes.removed.length);
        return changes;
    },

    /**
     * Initialize all background scanner functionality
     */
    initialize() {
        this.initializeMessageListener();
        window.detectChanges = this.detectChanges.bind(this);
        console.log('🔄 [SCANNER] BackgroundScanner initialized');
    }
};