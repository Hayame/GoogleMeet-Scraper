/**
 * Background Scanner Module
 * Extracted from popup.js - handles background scanning functionality and message processing
 */

// Create background scanner manager with all extracted functions
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
     * Source: popup.js lines 283-399
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
            data: data,
            priority: priority,
            timestamp: Date.now(),
            retryCount: 0,
            onComplete: onComplete  // NEW: Callback for completion notification
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
        // Already processing
        if (this._isMerging) {
            console.log('🔄 [MERGE QUEUE] Already processing');
            return;
        }

        // Process all queued operations
        while (this._mergeQueue.length > 0) {
            this._isMerging = true;
            const operation = this._mergeQueue.shift();

            console.log(`🔄 [MERGE] Processing #${operation.id} (${this._mergeQueue.length} remaining)`);

            try {
                await this._performMerge(operation.data);
                console.log(`✅ [MERGE] Completed #${operation.id}`);

                // NEW: Notify completion callback if provided
                if (operation.onComplete && typeof operation.onComplete === 'function') {
                    try {
                        await operation.onComplete();
                        console.log(`📢 [MERGE] Callback executed for #${operation.id}`);
                    } catch (callbackError) {
                        console.error(`❌ [MERGE] Callback failed for #${operation.id}:`, callbackError);
                        // Continue - merge succeeded even if callback fails
                    }
                }

            } catch (error) {
                console.error(`❌ [MERGE] Failed #${operation.id}:`, error);

                // RETRY LOGIC: Re-queue with lower priority
                const MAX_RETRIES = 3;
                if (operation.retryCount < MAX_RETRIES) {
                    operation.retryCount++;
                    operation.priority = Math.max(0, operation.priority - 10); // Lower priority

                    this._mergeQueue.push(operation);
                    this._mergeQueue.sort((a, b) => b.priority - a.priority);

                    console.log(`🔄 [MERGE] Re-queued #${operation.id} (retry ${operation.retryCount}/${MAX_RETRIES})`);
                } else {
                    console.error(`💀 [MERGE] Dropped #${operation.id} after ${MAX_RETRIES} retries`);
                }
            }
        }

        this._isMerging = false;
        console.log('✅ [MERGE QUEUE] Queue processing complete');
    },

    /**
     * Perform actual merge operation
     * Extracted from mergeAccumulatedData for queue system
     * @private
     * @param {Object} data - Transcript data to merge
     */
    async _performMerge(data) {
        console.log('🔄 [MERGE] Performing merge operation');

        if (!data || !data.messages || data.messages.length === 0) {
            console.log('🔄 [MERGE] No messages to merge');
            return;
        }

        const exportTxtBtn = document.getElementById('exportTxtBtn');

        // Get current transcript state
        const currentMessages = window.transcriptData?.messages || [];
        const newMessages = data.messages;

        console.log('🔄 [MERGE] Comparing data:', {
            currentMessagesCount: currentMessages.length,
            newMessagesCount: newMessages.length
        });

        // Detect changes using hash comparison
        const changes = this.detectChanges(currentMessages, newMessages);

        console.log('🔄 [MERGE] Detected changes:', {
            added: changes.added.length,
            updated: changes.updated.length,
            removed: changes.removed.length
        });

        // If no changes, skip merge
        if (changes.added.length === 0 && changes.updated.length === 0) {
            console.log('✅ [MERGE] No new messages, data up to date');
            return;
        }

        // Initialize or update transcriptData
        if (!window.transcriptData) {
            console.log('🔄 [MERGE] Initializing transcript data');
            window.transcriptData = {
                messages: newMessages,
                scrapedAt: data.scrapedAt,
                meetingUrl: data.meetingUrl
            };
        } else {
            console.log('🔄 [MERGE] Updating existing data');
            window.transcriptData.messages = newMessages;
            window.transcriptData.scrapedAt = data.scrapedAt;
            if (data.meetingUrl) {
                window.transcriptData.meetingUrl = data.meetingUrl;
            }
        }

        // Update display with incremental changes
        if (window.displayTranscript) {
            window.displayTranscript(window.transcriptData, changes);
        }

        // Update stats
        if (window.updateStats) {
            window.updateStats(window.transcriptData);
        }

        // Complete pending filter restoration
        if (window.SearchFilterManager && window.SearchFilterManager.completePendingRestoration) {
            window.SearchFilterManager.completePendingRestoration();
        }

        // Enable export button
        if (exportTxtBtn) {
            exportTxtBtn.disabled = false;
        }

        // Save atomically using TransactionCoordinator
        const saveResult = await window.TransactionCoordinator.saveRecordingState({
            transcriptData: window.transcriptData,
            currentSessionId: window.currentSessionId,
            sessionHistory: window.sessionHistory
        });

        if (!saveResult.success) {
            throw new Error(`Save failed: ${saveResult.error}`);
        }

        // Auto-save session
        try {
            if (window.SessionHistoryManager && window.SessionHistoryManager.autoSaveCurrentSession) {
                await window.SessionHistoryManager.autoSaveCurrentSession();
            }
        } catch (error) {
            console.error('❌ [BACKGROUND] Auto-save failed:', error);
            // Session data remains in memory - will retry on next update
        }

        // Update status
        if (window.updateStatus) {
            window.updateStatus(
                `Restored ${changes.added.length} new entries (${window.transcriptData.messages.length} total)`,
                'success'
            );
        }

        console.log('✅ [MERGE] Merge completed successfully:', {
            totalMessages: window.transcriptData.messages.length,
            newlyAdded: changes.added.length
        });
    },

    /**
     * Initialize background scan message listener
     * Source: popup.js lines 402-409
     */
    initializeMessageListener() {
        // Listen for background scan updates
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {        
            if (request.action === 'backgroundScanUpdate') {
                console.log('🔄 Background scan update received');
                this.handleBackgroundScanUpdate(request.data);
            }
            
            return true;
        });
    },

    /**
     * Start background scanning for a specific tab
     * @param {number} tabId - The tab ID to start scanning on
     * @returns {Promise} Promise that resolves when scanning starts
     */
    async startBackgroundScanning(tabId) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'startBackgroundScanning',
                tabId: tabId
            }, (response) => {
                if (response && response.success) {
                    console.log('🟢 Background scanning started for tab:', tabId);
                    resolve(response);
                } else {
                    console.error('❌ Failed to start background scanning for tab:', tabId);
                    reject(new Error('Failed to start background scanning'));
                }
            });
        });
    },

    /**
     * Stop background scanning
     * @returns {Promise} Promise that resolves when scanning stops
     */
    async stopBackgroundScanning() {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'stopBackgroundScanning'
            }, (response) => {
                if (response && response.success) {
                    console.log('✅ Background scanning stopped');
                    resolve(response);
                } else {
                    console.error('❌ Failed to stop background scanning');
                    reject(new Error('Failed to stop background scanning'));
                }
            });
        });
    },


    // 30-second auto-save interval removed to prevent duplicate sessions
    // Real-time auto-save in handleBackgroundScanUpdate() handles all saves properly

    // ========================================
    // REACTIVATION HELPER FUNCTIONS
    // ========================================

    /**
     * Find or verify Meet tab for reactivation
     * @private
     * @returns {Promise<number|null>} Meet tab ID or null
     */
    async _findOrVerifyMeetTab() {
        let meetTabId = null;

        // Try to get stored MEET_TAB_ID
        const result = await window.StorageManager.getStorageData([window.AppConstants.STORAGE_KEYS.MEET_TAB_ID]);
        const storedTabId = result[window.AppConstants.STORAGE_KEYS.MEET_TAB_ID];

        if (storedTabId) {
            console.log('🔍 [REACTIVATE] Found stored MEET_TAB_ID:', storedTabId);

            // Verify tab still exists and is a Meet tab
            const tabValid = await this.verifyMeetTab(storedTabId);

            if (tabValid) {
                meetTabId = storedTabId;
                console.log('✅ [REACTIVATE] Stored tab is still active');
            } else {
                console.warn('⚠️ [REACTIVATE] Stored tab no longer exists or is not a Meet tab');
            }
        }

        // FALLBACK: If no stored ID or tab invalid, find active Meet tab
        if (!meetTabId) {
            console.log('🔍 [REACTIVATE] Searching for active Meet tab as fallback...');
            meetTabId = await this.findActiveMeetTab();

            if (meetTabId) {
                console.log('✅ [REACTIVATE] Found active Meet tab:', meetTabId);

                // Save newly found ID to storage
                await window.StorageManager.setStorageData({
                    [window.AppConstants.STORAGE_KEYS.MEET_TAB_ID]: meetTabId
                });
                console.log('💾 [REACTIVATE] Saved new MEET_TAB_ID to storage');
            }
        }

        return meetTabId;
    },

    /**
     * Handle case when no Meet tab is found
     * @private
     */
    _handleNoMeetTab() {
        console.error('❌ [REACTIVATE] No Google Meet tab found');
        if (window.updateStatus) {
            window.updateStatus('Nie znaleziono aktywnej karty Google Meet', 'error');
        }
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
            console.log('📭 [REACTIVATE] No accumulated data to recover');
            return false;
        }

        console.log('📦 [REACTIVATE] Found accumulated data, merging...');

        try {
            await this.mergeAccumulatedData(accumulatedData);

            // Only remove from storage if merge succeeded
            const storageKey = `backgroundScan_${tabId}`;
            await window.StorageManager.removeStorageData([storageKey]);
            console.log('🧹 [REACTIVATE] Data merged and cleaned from storage');

            return true;

        } catch (mergeError) {
            console.error('❌ [REACTIVATE] Merge failed, keeping data in storage for retry:', mergeError);

            // Keep data in storage - can retry later
            if (window.updateStatus) {
                window.updateStatus('Częściowy błąd przywracania danych - dane zachowane', 'warning');
            }

            return false;
        }
    },

    /**
     * Restart background scanning for tab
     * @private
     * @param {number} tabId - Meet tab ID
     * @returns {Promise<boolean>} Success status
     */
    async _restartBackgroundScanning(tabId) {
        console.log('🔄 [REACTIVATE] Restarting background scanning for tab:', tabId);
        return await this.startBackgroundScanningWithRetry(tabId);
    },

    /**
     * Handle successful reactivation
     * @private
     * @param {boolean} success - Reactivation success status
     */
    _handleReactivationResult(success) {
        if (success) {
            console.log('✅ [REACTIVATE] ===== REACTIVATION COMPLETED SUCCESSFULLY =====');
            if (window.updateStatus) {
                window.updateStatus('Skanowanie w tle wznowione pomyślnie', 'success');
            }
        } else {
            console.error('❌ [REACTIVATE] ===== REACTIVATION FAILED =====');
            if (window.updateStatus) {
                window.updateStatus('Nie udało się wznowić skanowania w tle', 'error');
            }
        }
    },

    /**
     * Handle reactivation error
     * @private
     * @param {Error} error - Error object
     */
    _handleReactivationError(error) {
        console.error('❌ [REACTIVATE] Critical error during reactivation:', error);
        if (window.updateStatus) {
            window.updateStatus('Błąd reaktywacji: ' + error.message, 'error');
        }
    },

    /**
     * BULLETPROOF Reaktywacja background scannera po otwarciu popup
     * Naprawia wszystkie 9 failure modes:
     * - Usuwa check restoration flag
     * - Dodaje fallback dla brakującego MEET_TAB_ID
     * - Konwertuje chrome.tabs.get na Promise
     * - Dodaje retry mechanism
     * - Odzyskuje zgromadzone dane ze storage
     *
     * @returns {Promise<Object>} Result object with success status and details
     */
    async reactivateAfterRestore() {
        try {
            console.log('🔄 [REACTIVATE] ===== STARTING BULLETPROOF REACTIVATION =====');

            // Phase 0: Find Meet tab (with fallback)
            const meetTabId = await this._findOrVerifyMeetTab();

            if (!meetTabId) {
                this._handleNoMeetTab();
                return { success: false, reason: 'NO_MEET_TAB' };  // NEW: Return result
            }

            // Phase 1: Recover accumulated data (BLOCKS until merge complete)
            const mergeSuccess = await this._recoverAccumulatedData(meetTabId);
            console.log(`✅ [REACTIVATE] Merge phase complete (success: ${mergeSuccess})`);

            // Phase 2: Restart background scanning
            const restartSuccess = await this._restartBackgroundScanning(meetTabId);

            // Handle result
            this._handleReactivationResult(restartSuccess);

            return {  // NEW: Return detailed result
                success: true,
                mergeSuccess: mergeSuccess,
                restartSuccess: restartSuccess
            };

        } catch (error) {
            this._handleReactivationError(error);
            return { success: false, error: error.message };  // NEW: Return error result
        }
    },

    /**
     * Pobranie zgromadzonych danych ze skanowania w tle
     * Wywoływane gdy popup otwiera się ponownie podczas aktywnego nagrywania
     * @param {number} tabId - ID karty która była skanowana
     * @returns {Promise<Object|null>} Zgromadzone dane lub null
     */
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
     * Merge accumulated data with existing transcript
     * Now uses priority queue system (priority: 100 = restoration is critical)
     * @param {Object} accumulatedData - Accumulated transcript data from storage
     * @param {Function|null} onComplete - Optional callback fired after merge completes
     * @returns {Promise<void>} Promise that resolves when merge completes
     */
    async mergeAccumulatedData(accumulatedData, onComplete = null) {
        console.log('🔄 [MERGE] Scheduling accumulated data merge (high priority)');

        return new Promise((resolve) => {
            const completionCallback = async () => {
                if (onComplete) {
                    try {
                        await onComplete();
                    } catch (error) {
                        console.error('❌ [MERGE] Custom callback failed:', error);
                    }
                }
                resolve(); // Always resolve Promise after merge
            };

            this.scheduleMerge(accumulatedData, 100, completionCallback);
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
     * @param {number} tabId - Tab ID
     * @returns {Promise<Object|null>} Data or null
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
     * Try meeting URL match recovery (protection against tab ID reuse)
     * @private
     * @returns {Promise<Object|null>} Data or null
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
     * @returns {Promise<void>}
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
     * Weryfikuj czy karta istnieje i jest kartą Google Meet
     * Konwertuje callback-based chrome.tabs.get na Promise
     * @param {number} tabId - ID karty do weryfikacji
     * @returns {Promise<boolean>} true jeśli karta jest aktywną kartą Meet
     */
    async verifyMeetTab(tabId) {
        return new Promise((resolve) => {
            chrome.tabs.get(tabId, (tab) => {
                if (chrome.runtime.lastError) {
                    console.log('🔍 [VERIFY] Karta nie istnieje:', chrome.runtime.lastError.message);
                    resolve(false);
                    return;
                }

                if (!tab || !tab.url) {
                    console.log('🔍 [VERIFY] Karta nie ma URL');
                    resolve(false);
                    return;
                }

                const isMeetTab = tab.url.includes('meet.google.com');
                console.log('🔍 [VERIFY] Karta', tabId, isMeetTab ? 'JEST' : 'NIE JEST', 'kartą Meet');
                resolve(isMeetTab);
            });
        });
    },

    /**
     * Znajdź aktywną kartę Google Meet jako fallback
     * Używane gdy MEET_TAB_ID nie istnieje w storage lub jest nieważny
     * @returns {Promise<number|null>} ID karty Meet lub null
     */
    async findActiveMeetTab() {
        try {
            // Try 1: Find active tab in current window
            const activeTabs = await chrome.tabs.query({
                active: true,
                currentWindow: true,
                url: 'https://meet.google.com/*'
            });

            if (activeTabs && activeTabs.length > 0) {
                console.log('🔍 [FIND] Znaleziono aktywną kartę Meet w bieżącym oknie:', activeTabs[0].id);
                return activeTabs[0].id;
            }

            // Try 2: Find ANY Meet tab (even inactive)
            const anyMeetTabs = await chrome.tabs.query({
                url: 'https://meet.google.com/*'
            });

            if (anyMeetTabs && anyMeetTabs.length > 0) {
                console.log('🔍 [FIND] Znaleziono kartę Meet (nieaktywna):', anyMeetTabs[0].id);
                return anyMeetTabs[0].id;
            }

            console.log('🔍 [FIND] Nie znaleziono żadnej karty Meet');
            return null;

        } catch (error) {
            console.error('❌ [FIND] Error finding Meet tab:', error);
            return null;
        }
    },

    /**
     * Restart background scanning z retry mechanism
     * Próbuje 3 razy z opóźnieniem 1 sekundy
     * @param {number} tabId - ID karty do skanowania
     * @returns {Promise<boolean>} true jeśli sukces
     */
    async startBackgroundScanningWithRetry(tabId, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 [RETRY] Próba ${attempt}/${maxRetries} restart skanowania...`);

                await this.startBackgroundScanning(tabId);

                console.log(`✅ [RETRY] Sukces na próbie ${attempt}`);
                return true;

            } catch (error) {
                console.warn(`⚠️ [RETRY] Próba ${attempt} nieudana:`, error.message);

                if (attempt < maxRetries) {
                    console.log(`🔄 [RETRY] Oczekiwanie 1 sekundę przed następną próbą...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    console.error(`❌ [RETRY] Wszystkie ${maxRetries} próby wyczerpane`);
                    return false;
                }
            }
        }

        return false;
    },

    /**
     * Detect changes between old and new transcript messages
     * Source: popup-old.js lines 2239-2348
     * @param {Array} oldMessages - Previous transcript messages
     * @param {Array} newMessages - New transcript messages
     * @returns {Object} Object with added, updated, and removed arrays
     */
    detectChanges(oldMessages, newMessages) {
        const changes = {
            added: [],
            updated: [],
            removed: []
        };
        
        // Debug: log input parameters
        console.log('🔍 [DEBUG] detectChanges input:', {
            oldCount: oldMessages ? oldMessages.length : 0,
            newCount: newMessages ? newMessages.length : 0
        });
        
        // Handle null/empty cases
        if (!oldMessages || oldMessages.length === 0) {
            // All new messages are added
            if (newMessages && newMessages.length > 0) {
                changes.added = [...newMessages];
                console.log('🔍 [DEBUG] No old messages, all new messages added:', changes.added.length);
            }
            return changes;
        }
        
        if (!newMessages || newMessages.length === 0) {
            // All old messages are removed
            changes.removed = [...oldMessages];
            console.log('🔍 [DEBUG] No new messages, all old messages removed:', changes.removed.length);
            return changes;
        }
        
        // Create hash maps for efficient lookups
        const oldHashes = new Map();
        const newHashes = new Map();
        
        // Map old messages by hash for quick lookup
        oldMessages.forEach((msg, index) => {
            oldHashes.set(msg.hash, { ...msg, originalIndex: index });
        });
        
        // Map new messages by hash  
        newMessages.forEach((msg, index) => {
            newHashes.set(msg.hash, { ...msg, originalIndex: index });
        });
        
        console.log('🔍 [DEBUG] Hash comparison:', {
            oldHashes: oldHashes.size,
            newHashes: newHashes.size,
            oldHashSample: Array.from(oldHashes.keys()).slice(0, 3),
            newHashSample: Array.from(newHashes.keys()).slice(0, 3)
        });
        
        // First pass: Position-based comparison for updates (same position, same speaker, different text)
        const minLength = Math.min(oldMessages.length, newMessages.length);
        for (let i = 0; i < minLength; i++) {
            const oldMsg = oldMessages[i];
            const newMsg = newMessages[i];
            
            if (oldMsg.speaker === newMsg.speaker && oldMsg.hash !== newMsg.hash) {
                // Same speaker at same position but different hash = update
                changes.updated.push({
                    ...newMsg,
                    index: i,  // Preserve position index
                    previousText: oldMsg.text
                });
                console.log(`🔍 [DEBUG] Updated message at position ${i}:`, newMsg.speaker, `"${oldMsg.text.substring(0, 20)}" -> "${newMsg.text.substring(0, 20)}"`);
                
                // Remove from hash maps to avoid double-processing
                oldHashes.delete(oldMsg.hash);
                newHashes.delete(newMsg.hash);
            } else if (oldMsg.hash === newMsg.hash) {
                // Identical messages - remove from hash maps
                oldHashes.delete(oldMsg.hash);
                newHashes.delete(newMsg.hash);
            }
        }
        
        // Second pass: Hash-based comparison for additions/removals
        // Find new messages (in new but not in old)
        newHashes.forEach((newMsg, hash) => {
            if (!oldHashes.has(hash)) {
                changes.added.push(newMsg);
                console.log(`🔍 [DEBUG] Added new message:`, newMsg.speaker, newMsg.text.substring(0, 30));
            }
        });
        
        // Find removed messages (in old but not in new)
        oldHashes.forEach((oldMsg, hash) => {
            if (!newHashes.has(hash)) {
                changes.removed.push(oldMsg);
                console.log(`🔍 [DEBUG] Removed message:`, oldMsg.speaker, oldMsg.text.substring(0, 30));
            }
        });
        
        console.log('🔍 [DEBUG] detectChanges final result:', {
            added: changes.added.length,
            updated: changes.updated.length,
            removed: changes.removed.length
        });
        
        // Log samples for debugging
        if (changes.updated.length > 0) {
            console.log('🔍 [DEBUG] Updated message sample:', {
                speaker: changes.updated[0].speaker,
                oldText: changes.updated[0].previousText?.substring(0, 30),
                newText: changes.updated[0].text.substring(0, 30)
            });
        }
        
        return changes;
    },

    /**
     * Initialize all background scanner functionality
     */
    initialize() {
        this.initializeMessageListener();
        // 30-second auto-save interval removed - real-time auto-save handles all saves
        
        // CRITICAL FIX: Expose detectChanges globally for backward compatibility
        window.detectChanges = this.detectChanges.bind(this);
        console.log('🔗 [BACKGROUND] detectChanges exposed globally');
        
        console.log('🔄 Background Scanner initialized');
    }
};