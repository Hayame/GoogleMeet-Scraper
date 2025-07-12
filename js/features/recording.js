/**
 * Recording Management Module
 * Extracted from popup.js - handles recording start/stop logic and state management
 */

// Create recording manager with all extracted functions
window.RecordingManager = {
    /**
     * Activate realtime recording mode
     * Source: popup.js lines 481-572
     * @param {boolean} isContinuation - Whether this is continuing an existing session
     */
    async activateRealtimeMode(isContinuation = false) {
        const activationTime = new Date().toISOString();
        console.log('🟢 [ACTIVATION DEBUG] Starting realtime mode at:', activationTime);
        console.log('🟢 [ACTIVATION DEBUG] Is continuation:', isContinuation);
        
        const realtimeBtn = document.getElementById('recordBtn');
        if (!realtimeBtn) {
            console.error('Record button not found!');
            return;
        }
        
        // Reset recording stopped and paused flags
        window.recordingStopped = false;
        window.recordingPaused = false;
        console.log('🟢 [ACTIVATION DEBUG] recordingStopped reset to:', window.recordingStopped);
        
        window.realtimeMode = true;
        realtimeBtn.classList.add('active');
        document.querySelector('.record-text').textContent = 'Zatrzymaj nagrywanie';
        // Hide meeting name and show status for recording
        if (window.hideMeetingName) {
            window.hideMeetingName();
        }
        if (window.updateStatus) {
            window.updateStatus('Nagrywanie aktywne - skanowanie w tle', 'info');
        }
        // Update button visibility for recording state
        if (window.updateButtonVisibility) {
            window.updateButtonVisibility('RECORDING');
        }
        
        // Set recording start time only for new recordings (not continuations)
        if (!isContinuation) {
            window.recordingStartTime = new Date();
            window.sessionStartTime = window.recordingStartTime; // Also set session start time for new sessions
            console.log('🟢 [ACTIVATION DEBUG] New session - setting recordingStartTime:', window.recordingStartTime);
        } else {
            // For continuation, set new recordingStartTime to track current recording segment
            window.recordingStartTime = new Date();
            // Keep existing sessionStartTime for consistent session naming
            console.log('🟢 [ACTIVATION DEBUG] Continuation - setting new recordingStartTime:', window.recordingStartTime);
            console.log('🟢 [ACTIVATION DEBUG] Continuation - keeping existing sessionStartTime:', window.sessionStartTime);
        }
        
        // Start duration timer
        if (window.startDurationTimer) {
            window.startDurationTimer();
        }
        
        // Update clear button state (disable during recording)
        if (window.updateClearButtonState) {
            window.updateClearButtonState();
        }
        
        // Save recording start time and session start time to storage
        chrome.storage.local.set({ 
            recordingStartTime: window.recordingStartTime ? window.recordingStartTime.toISOString() : null,
            sessionStartTime: window.sessionStartTime ? window.sessionStartTime.toISOString() : null
        });
        
        // Create new session ID if none exists (session will be added to history when first entry appears)
        if (!window.currentSessionId) {
            window.currentSessionId = window.generateSessionId ? window.generateSessionId() : 'session_' + Date.now();
            chrome.storage.local.set({ currentSessionId: window.currentSessionId });
        }
        
        // Uruchom skanowanie w tle
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url.includes('meet.google.com')) {
                console.log('🟢 [ACTIVATION DEBUG] Starting background scanning for tab:', tab.id);
                
                // Zapisz stan wraz z ID karty Meet
                chrome.storage.local.set({ 
                    realtimeMode: true, 
                    recordingStartTime: window.recordingStartTime ? window.recordingStartTime.toISOString() : null,
                    sessionStartTime: window.sessionStartTime ? window.sessionStartTime.toISOString() : null,
                    meetTabId: tab.id  // Save the Meet tab ID
                });
                
                // Rozpocznij skanowanie w tle
                chrome.runtime.sendMessage({
                    action: 'startBackgroundScanning',
                    tabId: tab.id
                }, (response) => {
                    const scanStartTime = new Date().toISOString();
                    if (response && response.success) {
                        console.log('🟢 [ACTIVATION DEBUG] Background scanning started at:', scanStartTime);
                        if (window.updateStatus) {
                            window.updateStatus('Nagrywanie aktywne - skanowanie w tle', 'success');
                        }
                    } else {
                        console.error('🟢 [ACTIVATION DEBUG] Failed to start background scanning at:', scanStartTime);
                        if (window.updateStatus) {
                            window.updateStatus('Błąd uruchomienia skanowania w tle', 'error');
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error starting realtime mode:', error);
            if (window.updateStatus) {
                window.updateStatus('Błąd uruchomienia trybu rzeczywistego', 'error');
            }
        }
    },

    /**
     * Deactivate realtime recording mode
     * Source: popup.js lines 1532-1579
     */
    deactivateRealtimeMode() {        
        const realtimeBtn = document.getElementById('recordBtn');
        if (!realtimeBtn) {
            console.error('Record button not found!');
            return;
        }
        
        window.realtimeMode = false;
        realtimeBtn.classList.remove('active');
        document.querySelector('.record-text').textContent = 'Rozpocznij nagrywanie';
        if (window.updateStatus) {
            window.updateStatus('Nagrywanie zatrzymane', 'success');
        }
        // Update button visibility - for now keep as recording state since session is still active
        if (window.updateButtonVisibility) {
            window.updateButtonVisibility('NEW');
        }
        
        // Add current session duration to total
        if (window.recordingStartTime) {
            const now = new Date();
            const currentSessionDuration = Math.floor((now - window.recordingStartTime) / 1000);
            window.sessionTotalDuration += currentSessionDuration;
        }
        
        // Stop duration timer
        if (window.stopDurationTimer) {
            window.stopDurationTimer();
        }
        
        // Update clear button state (enable after recording)
        if (window.updateClearButtonState) {
            window.updateClearButtonState();
        }
        
        // Set flags to ignore background updates and mark as paused
        window.recordingStopped = true;
        window.recordingPaused = true;
        
        // Zatrzymaj skanowanie w tle PRZED zapisem sesji
        chrome.runtime.sendMessage({
            action: 'stopBackgroundScanning'
        }, (response) => {
            if (response && response.success) {
                console.log('✅ Background scanning stopped');
            } else {
                console.error('❌ Failed to stop background scanning');
            }
            
            // Perform one final transcript read to ensure no messages are lost
            if (window.performFinalTranscriptRead) {
                window.performFinalTranscriptRead();
            }
        });
    },

    /**
     * Continue current recording session
     * Source: popup.js lines 469-479
     */
    async continueCurrentSession() {
        console.log('Continuing current session');
        console.log('Current state:', {
            realtimeMode: window.realtimeMode,
            currentSessionId: window.currentSessionId,
            transcriptData: window.transcriptData ? window.transcriptData.messages.length : 0,
            sessionTotalDuration: window.sessionTotalDuration
        });
        // Don't reset sessionTotalDuration or create new session
        await this.activateRealtimeMode(true); // true = isContinuation
    },

    /**
     * Handle recording button click logic
     * Source: popup.js lines 448-467
     */
    handleRecordButtonClick() {
        if (window.realtimeMode) {
            this.deactivateRealtimeMode();
        } else {
            // Check if recording was paused in current session
            if (window.recordingPaused && window.transcriptData && window.transcriptData.messages.length > 0) {
                // Resume paused recording directly
                console.log('🔄 Resuming paused recording in same session');
                window.recordingPaused = false;
                window.recordingStopped = false;
                this.continueCurrentSession();
            } else if (window.transcriptData && window.transcriptData.messages.length > 0) {
                // Different session - show resume options
                if (window.showResumeOptions) {
                    window.showResumeOptions();
                }
            } else {
                // Completely new recording
                this.activateRealtimeMode();
            }
        }
    },

    /**
     * Auto-save current recording session
     * Source: popup.js lines 1823-1890
     * @param {Object} data - Optional data to save (defaults to current transcriptData)
     */
    autoSaveCurrentSession(data = null) {
        if (!window.transcriptData || window.transcriptData.messages.length === 0) {
            return;
        }
        
        // Simplified: just use all messages from transcriptData
        const validMessages = window.transcriptData.messages;
        
        const sessionId = window.currentSessionId || (window.generateSessionId ? window.generateSessionId() : 'session_' + Date.now());
        const uniqueParticipants = new Set(validMessages.map(m => m.speaker)).size;
        
        // Check if session already exists and preserve its original date and title
        const existingIndex = window.sessionHistory.findIndex(s => s.id === sessionId);
        const originalDate = existingIndex >= 0 ? window.sessionHistory[existingIndex].date : new Date().toISOString();
        const originalTitle = existingIndex >= 0 ? window.sessionHistory[existingIndex].title : (window.generateSessionTitle ? window.generateSessionTitle() : 'Recording Session');
        
        // Calculate current total duration
        let currentTotalDuration = window.sessionTotalDuration || 0;
        if (window.recordingStartTime) {
            const now = new Date();
            const currentSessionDuration = Math.floor((now - window.recordingStartTime) / 1000);
            currentTotalDuration += currentSessionDuration;
        }
        
        const filteredTranscriptData = {
            messages: validMessages,
            scrapedAt: window.transcriptData.scrapedAt,
            meetingUrl: window.transcriptData.meetingUrl
        };
        
        const session = {
            id: sessionId,
            title: originalTitle, // Preserve original title or generate new one
            date: originalDate, // Preserve original date or set new one
            participantCount: uniqueParticipants,
            entryCount: validMessages.length,
            transcript: filteredTranscriptData,
            totalDuration: currentTotalDuration
        };
        
        console.log('🔄 [AUTOSAVE DEBUG] Creating session with:', {
            id: sessionId,
            entryCount: validMessages.length,
            participantCount: uniqueParticipants
        });
        
        if (existingIndex >= 0) {
            window.sessionHistory[existingIndex] = session;
            console.log('🔄 [AUTOSAVE DEBUG] Updated existing session in history');
        } else {
            window.sessionHistory.unshift(session);
            console.log('🔄 [AUTOSAVE DEBUG] Added new session to history');
        }
        
        // Limit history to 50 sessions
        if (window.sessionHistory.length > 50) {
            window.sessionHistory = window.sessionHistory.slice(0, 50);
        }
        
        // Save to storage silently (no status message)
        chrome.storage.local.set({ sessionHistory: window.sessionHistory }, () => {
            if (window.renderSessionHistory) {
                window.renderSessionHistory();
            }
            console.log('🔄 [AUTOSAVE DEBUG] Session saved to storage and history rendered');
            
            // Highlight the new/updated session if it's the current one
            if (sessionId === window.currentSessionId && existingIndex < 0) {
                // New session was added, it will be highlighted automatically by renderSessionHistory
                console.log('🔄 [AUTOSAVE DEBUG] New session highlighted in list');
            }
        });
    },

    /**
     * Restore recording state from storage
     * Source: popup.js lines 104-198 (restoreStateFromStorage function)
     */
    async restoreStateFromStorage() {
        try {
            console.log('🔄 [RESTORE] Restoring state from storage');
            
            const result = await chrome.storage.local.get([
                'realtimeMode', 
                'recordingStartTime', 
                'sessionStartTime',
                'transcriptData',
                'currentSessionId',
                'sessionTotalDuration',
                'currentSessionDuration',
                'meetTabId'  // Add Meet tab ID to restoration
            ]);
            
            console.log('🔄 [RESTORE DEBUG] Storage contents:', {
                realtimeMode: result.realtimeMode,
                currentSessionId: result.currentSessionId,
                hasTranscriptData: !!result.transcriptData,
                sessionHistoryLength: window.sessionHistory ? window.sessionHistory.length : 0
            });
            
            // Restore recording state
            if (result.realtimeMode) {
                console.log('🔄 [RESTORE] Restoring recording state');
                window.realtimeMode = true;
                
                // Restore recording start time and timer
                if (result.recordingStartTime) {
                    window.recordingStartTime = new Date(result.recordingStartTime);
                    console.log('🔄 [RESTORE] Restored recording start time:', window.recordingStartTime);
                    // Ensure immediate timer update with restored time
                    if (window.updateDurationDisplay) {
                        window.updateDurationDisplay();
                    }
                    if (window.startDurationTimer) {
                        window.startDurationTimer();
                    }
                }
                
                // Restore session start time
                if (result.sessionStartTime) {
                    window.sessionStartTime = new Date(result.sessionStartTime);
                    console.log('🔄 [RESTORE] Restored session start time:', window.sessionStartTime);
                }
                
                // Restore session data
                if (result.currentSessionId) {
                    window.currentSessionId = result.currentSessionId;
                }
                
                if (result.sessionTotalDuration) {
                    window.sessionTotalDuration = result.sessionTotalDuration;
                }
                
                // Remove any stale currentSessionDuration to prevent accumulation
                chrome.storage.local.remove(['currentSessionDuration']);
                
                // Update UI to show recording state
                const realtimeBtn = document.getElementById('recordBtn');
                if (realtimeBtn) {
                    realtimeBtn.classList.add('active');
                    document.querySelector('.record-text').textContent = 'Zatrzymaj nagrywanie';
                }
                
                if (window.updateStatus) {
                    window.updateStatus('Nagrywanie wznowione', 'success');
                }
                
                // Restart background scanning if we have a saved Meet tab ID
                if (result.meetTabId) {
                    console.log('🔄 [RESTORE] Checking saved Meet tab:', result.meetTabId);
                    try {
                        const tab = await chrome.tabs.get(result.meetTabId);
                        if (tab && tab.url && tab.url.includes('meet.google.com')) {
                            console.log('🔄 [RESTORE] Meet tab still exists, restarting background scanning');
                            chrome.runtime.sendMessage({
                                action: 'startBackgroundScanning',
                                tabId: result.meetTabId
                            }, (response) => {
                                if (response && response.success) {
                                    console.log('🔄 [RESTORE] Background scanning restarted successfully');
                                } else {
                                    console.error('🔄 [RESTORE] Failed to restart background scanning');
                                    if (window.updateStatus) {
                                        window.updateStatus('Błąd: Nie można wznowić skanowania', 'error');
                                    }
                                }
                            });
                        } else {
                            console.error('🔄 [RESTORE] Meet tab no longer exists or is not a Meet page');
                            if (window.updateStatus) {
                                window.updateStatus('Błąd: Karta Meet została zamknięta', 'error');
                            }
                            // Optionally deactivate recording mode
                            this.deactivateRealtimeMode();
                        }
                    } catch (error) {
                        console.error('🔄 [RESTORE] Error checking Meet tab:', error);
                        if (window.updateStatus) {
                            window.updateStatus('Błąd: Karta Meet niedostępna', 'error');
                        }
                        this.deactivateRealtimeMode();
                    }
                }
            }
            
            // Restore transcript data if available
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
            
        } catch (error) {
            console.error('🔄 [RESTORE] Error restoring state:', error);
        }
    },

    /**
     * Get current recording status
     * Source: popup.js lines 635-644
     */
    getRecordingStatus() {
        const isRecording = window.realtimeMode;
        return {
            isRecording: isRecording,
            recordingStartTime: window.recordingStartTime,
            sessionStartTime: window.sessionStartTime,
            sessionTotalDuration: window.sessionTotalDuration || 0,
            currentSessionId: window.currentSessionId,
            recordingPaused: window.recordingPaused || false,
            recordingStopped: window.recordingStopped || false
        };
    }
};