/**
 * Background Scanner Module
 * Extracted from popup.js - handles background scanning functionality and message processing
 */

// Create background scanner manager with all extracted functions
window.BackgroundScanner = {
    /**
     * Handle background scan updates from content script
     * Source: popup.js lines 283-399
     * @param {Object} data - Transcript data from background scan
     */
    handleBackgroundScanUpdate(data) {
        const timestamp = new Date().toISOString();
        console.log('🟡 [BACKGROUND DEBUG] Handling background scan update at:', timestamp);
        console.log('🟡 [BACKGROUND DEBUG] Data messages length:', data ? data.messages?.length : 'undefined');
        console.log('🟡 [BACKGROUND DEBUG] Current state:', {
            realtimeMode: window.realtimeMode,
            currentSessionId: window.currentSessionId,
            currentSessionIdType: typeof window.currentSessionId,
            hasTranscriptData: !!window.transcriptData,
            hasSessionHistory: !!window.sessionHistory,
            sessionHistoryLength: window.sessionHistory?.length || 0,
            restorationInProgress: window.StateManager?.isRestorationInProgress()
        });
        
        // ENHANCED DEBUG: Show session ID format analysis
        if (window.currentSessionId && window.sessionHistory && window.sessionHistory.length > 0) {
            console.log('🟡 [BACKGROUND DEBUG] Session ID analysis:', {
                currentSessionId: window.currentSessionId,
                currentSessionIdType: typeof window.currentSessionId,
                sessionHistoryIds: window.sessionHistory.slice(0, 3).map(s => ({ id: s.id, type: typeof s.id })),
                exactMatchExists: !!window.sessionHistory.find(s => s.id === window.currentSessionId)
            });
        }
        
        // CRITICAL FIX: Check if state restoration is in progress
        if (window.StateManager?.isRestorationInProgress()) {
            console.log('🟡 [BACKGROUND DEBUG] Ignoring - state restoration in progress');
            return;
        }
        
        // REMOVED: Problematic session history check that created infinite loop for new users
        // The check for sessionHistory.length === 0 incorrectly treated empty arrays as "not loaded"
        // This is now handled by the enhanced session existence verification in the auto-save logic
        
        if (!window.realtimeMode) {
            console.log('🟡 [BACKGROUND DEBUG] Ignoring - not in realtime mode');
            return;
        }
        
        if (window.StateManager?.getRecordingStopped()) {
            console.log('🟡 [BACKGROUND DEBUG] Ignoring - recording stopped');
            return;
        }
        
        if (!data || !data.messages || data.messages.length === 0) {
            console.log('🟡 [BACKGROUND DEBUG] No messages in background scan update');
            return;
        }
        
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        
        // Debug: log state before detecting changes
        console.log('🔍 [DEBUG] handleBackgroundScanUpdate - Before detectChanges:', {
            hasTranscriptData: !!window.transcriptData,
            oldMessagesCount: window.transcriptData ? window.transcriptData.messages.length : 0,
            newMessagesCount: data.messages.length,
            recordingPaused: window.StateManager?.getRecordingPaused(),
            recordingStopped: window.StateManager?.getRecordingStopped(),
            oldHashesSample: window.transcriptData ? window.transcriptData.messages.slice(0,3).map(m => ({ speaker: m.speaker, hash: m.hash, text: m.text.substring(0,30) })) : [],
            newHashesSample: data.messages.slice(0,3).map(m => ({ speaker: m.speaker, hash: m.hash, text: m.text.substring(0,30) }))
        });
        
        // Detect changes using hash comparison
        const changes = window.detectChanges ? window.detectChanges(window.transcriptData ? window.transcriptData.messages : [], data.messages) : { added: [], updated: [], removed: [] };
        
        // Debug: log changes detected
        console.log('🔍 [DEBUG] detectChanges result:', {
            added: changes.added.length,
            updated: changes.updated.length,
            removed: changes.removed.length,
            addedSample: changes.added.slice(0,3).map(m => ({ speaker: m.speaker, hash: m.hash, text: m.text.substring(0,30) }))
        });
        
        if (!window.transcriptData) {
            // Check if this is a session continuation (has sessionStartTime) or completely new session
            const isContinuation = window.StateManager?.getSessionStartTime() !== null || window.StateManager?.getRecordingStartTime() !== null;
            
            if (isContinuation) {
                console.log('🔄 [CONTINUATION] Initializing transcript data for continued session');
                console.log('🔄 [CONTINUATION] SessionStartTime exists:', !!window.StateManager?.getSessionStartTime());
                console.log('🔄 [CONTINUATION] RecordingStartTime exists:', !!window.StateManager?.getRecordingStartTime());
            } else {
                console.log('✅ [NEW] Initializing transcript data for completely new session');
            }
            
            // Initialize with new data structure
            window.transcriptData = {
                messages: data.messages,
                scrapedAt: data.scrapedAt,
                meetingUrl: data.meetingUrl
            };
            
            // For continuations, treat all messages as "added" for proper incremental display
            if (isContinuation && data.messages.length > 0) {
                const continuationChanges = {
                    added: data.messages,
                    updated: [],
                    removed: []
                };
                console.log(`🔄 [CONTINUATION] Treating ${data.messages.length} messages as newly added`);
                if (window.displayTranscript) {
                    window.displayTranscript(window.transcriptData, continuationChanges);
                }
            } else {
                // New session - use normal display
                if (window.displayTranscript) {
                    window.displayTranscript(window.transcriptData, changes);
                }
            }
            
            if (window.updateStats) {
                window.updateStats(window.transcriptData);
            }
            
            // Complete pending filter restoration when new data arrives
            if (window.SearchFilterManager && window.SearchFilterManager.completePendingRestoration) {
                window.SearchFilterManager.completePendingRestoration();
            }
            
            if (exportTxtBtn) {
                exportTxtBtn.disabled = false;
            }
            
            // Auto-save session to history
            if (window.SessionHistoryManager && window.SessionHistoryManager.autoSaveCurrentSession) {
                window.SessionHistoryManager.autoSaveCurrentSession();
            }
            
            if (window.updateStatus) {
                window.updateStatus(`Nagrywanie w tle... (${window.transcriptData.messages.length} wpisów)`, 'info');
            }
        } else if (changes.added.length > 0 || changes.updated.length > 0) {
            // Update data with changes
            window.transcriptData.messages = data.messages;
            window.transcriptData.scrapedAt = data.scrapedAt;

            // Update display with incremental changes
            if (window.displayTranscript) {
                window.displayTranscript(window.transcriptData, changes);
            }
            if (window.updateStats) {
                window.updateStats(window.transcriptData);
            }
            
            // Complete pending filter restoration when new data arrives
            if (window.SearchFilterManager && window.SearchFilterManager.completePendingRestoration) {
                window.SearchFilterManager.completePendingRestoration();
            }
            
            if (exportTxtBtn) {
                exportTxtBtn.disabled = false;
            }
            
            // Scroll to bottom if new messages added
            if (changes.added.length > 0) {
                const preview = document.getElementById('transcriptContent');
                if (preview) {
                    preview.scrollTop = preview.scrollHeight;
                }
            }
            
            // Auto-save session to history on every update
            if (window.SessionHistoryManager && window.SessionHistoryManager.autoSaveCurrentSession) {
                window.SessionHistoryManager.autoSaveCurrentSession();
            }
            
            if (window.updateStatus) {
                window.updateStatus(`Nagrywanie w tle... (${window.transcriptData.messages.length} wpisów)`, 'info');
            }
        }
        
        // Save to storage
        chrome.storage.local.set({ transcriptData: window.transcriptData });        
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


    /**
     * Reactivate background scanner after state restoration
     * Called when popup reopens and finds active recording state
     */
    async reactivateAfterRestore() {
        try {
            console.log('🔄 [REACTIVATE] Reactivating background scanner after state restoration');
            
            // Get stored meeting tab ID
            const result = await window.StorageManager.getStorageData([window.AppConstants.STORAGE_KEYS.MEET_TAB_ID]);
            const meetTabId = result[window.AppConstants.STORAGE_KEYS.MEET_TAB_ID];
            
            if (!meetTabId) {
                console.warn('⚠️ [REACTIVATE] No meeting tab ID found - cannot restart background scanning');
                return;
            }
            
            // Verify tab still exists and is a Meet tab
            chrome.tabs.get(meetTabId, (tab) => {
                if (chrome.runtime.lastError) {
                    console.warn('⚠️ [REACTIVATE] Meeting tab no longer exists:', chrome.runtime.lastError.message);
                    return;
                }
                
                if (!tab.url || !tab.url.includes('meet.google.com')) {
                    console.warn('⚠️ [REACTIVATE] Tab is no longer a Google Meet session');
                    return;
                }
                
                // Restart background scanning for this tab
                this.startBackgroundScanning(meetTabId)
                    .then(() => {
                        console.log('✅ [REACTIVATE] Background scanning restarted successfully');
                    })
                    .catch((error) => {
                        console.error('❌ [REACTIVATE] Failed to restart background scanning:', error);
                    });
            });
            
        } catch (error) {
            console.error('❌ [REACTIVATE] Error during background scanner reactivation:', error);
        }
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