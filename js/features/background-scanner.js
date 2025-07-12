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
        
        if (!window.realtimeMode) {
            console.log('🟡 [BACKGROUND DEBUG] Ignoring - not in realtime mode');
            return;
        }
        
        if (window.recordingStopped) {
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
            recordingPaused: window.recordingPaused,
            recordingStopped: window.recordingStopped,
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
            const isContinuation = window.sessionStartTime !== null || window.recordingStartTime !== null;
            
            if (isContinuation) {
                console.log('🔄 [CONTINUATION] Initializing transcript data for continued session');
                console.log('🔄 [CONTINUATION] SessionStartTime exists:', !!window.sessionStartTime);
                console.log('🔄 [CONTINUATION] RecordingStartTime exists:', !!window.recordingStartTime);
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
            
            if (exportTxtBtn) {
                exportTxtBtn.disabled = false;
            }
            
            // Auto-save session to history
            if (window.RecordingManager && window.RecordingManager.autoSaveCurrentSession) {
                window.RecordingManager.autoSaveCurrentSession();
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
            if (window.RecordingManager && window.RecordingManager.autoSaveCurrentSession) {
                window.RecordingManager.autoSaveCurrentSession();
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

    /**
     * Secondary state restoration for recording continuation
     * Source: popup.js lines 416-445
     */
    initializeSecondaryStateRestoration() {
        chrome.storage.local.get(['realtimeMode', 'transcriptData', 'currentSessionId', 'recordingStartTime', 'sessionStartTime', 'meetTabId'], (result) => {
            if (result.currentSessionId) {
                window.currentSessionId = result.currentSessionId;
            }
            if (result.recordingStartTime) {
                window.recordingStartTime = new Date(result.recordingStartTime);
                console.log('🔄 [SECONDARY] Recordtime restored (secondary restoration):', window.recordingStartTime);
            }
            if (result.sessionStartTime) {
                window.sessionStartTime = new Date(result.sessionStartTime);
                console.log('🔄 [SECONDARY] SessionStartTime restored:', window.sessionStartTime);
            }
            if (result.realtimeMode) {
                // Don't call activateRealtimeMode here - it would try to restart background scanning
                // The state restoration is already handled in restoreStateFromStorage()
                console.log('🔄 [SECONDARY] Recording mode already restored in restoreStateFromStorage');
                
                // Ensure timer is running - if popup was reopened while recording was active
                if (window.recordingStartTime && !window.durationTimer) {
                    console.log('🔄 [SECONDARY] Starting timer for active recording (popup reopened)');
                    if (window.startDurationTimer) {
                        window.startDurationTimer();
                    }
                }
            }
            if (result.transcriptData) {
                window.transcriptData = result.transcriptData;
                if (window.displayTranscript) {
                    window.displayTranscript(window.transcriptData);
                }
                if (window.updateStats) {
                    window.updateStats(window.transcriptData);
                }
                const exportTxtBtn = document.getElementById('exportTxtBtn');
                if (exportTxtBtn) exportTxtBtn.disabled = false;
            }
        });
    },

    /**
     * Auto-save interval functionality (periodic background save)
     * Source: popup.js lines 2117-2132
     */
    initializeAutoSaveInterval() {
        // Auto-save functionality
        setInterval(() => {
            if (window.transcriptData && window.transcriptData.messages.length > 0 && window.currentSessionId) {
                // Auto-save current session
                const existingIndex = window.sessionHistory.findIndex(s => s.id === window.currentSessionId);
                if (existingIndex >= 0) {
                    // Update existing session silently (preserve original date)
                    const uniqueParticipants = new Set(window.transcriptData.messages.map(e => e.speaker)).size;
                    window.sessionHistory[existingIndex].transcript = window.transcriptData;
                    window.sessionHistory[existingIndex].participantCount = uniqueParticipants;
                    window.sessionHistory[existingIndex].entryCount = window.transcriptData.messages.length;
                    // Don't update date field - preserve the original session creation date
                    
                    chrome.storage.local.set({ sessionHistory: window.sessionHistory });
                }
            }
        }, 30000); // Auto-save every 30 seconds
    },

    /**
     * Get current scanning status
     */
    getScanningStatus() {
        return {
            isScanning: window.realtimeMode && !window.recordingStopped,
            hasTranscriptData: !!window.transcriptData,
            messageCount: window.transcriptData ? window.transcriptData.messages.length : 0,
            lastUpdate: window.transcriptData ? window.transcriptData.scrapedAt : null
        };
    },

    /**
     * Initialize all background scanner functionality
     */
    initialize() {
        this.initializeMessageListener();
        this.initializeSecondaryStateRestoration();
        this.initializeAutoSaveInterval();
        console.log('🔄 Background Scanner initialized');
    }
};