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
        window.StateManager?.setRecordingStopped(false);
        window.StateManager?.setRecordingPaused(false);
        console.log('🟢 [ACTIVATION DEBUG] recordingStopped reset to:', window.StateManager?.getRecordingStopped());
        
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
            const startTime = new Date();
            window.StateManager?.setRecordingStartTime(startTime);
            window.StateManager?.setSessionStartTime(startTime); // Also set session start time for new sessions
            console.log('🟢 [ACTIVATION DEBUG] New session - setting recordingStartTime:', startTime);
        } else {
            // For continuation, set new recordingStartTime to track current recording segment
            const startTime = new Date();
            window.StateManager?.setRecordingStartTime(startTime);
            // Keep existing sessionStartTime for consistent session naming
            console.log('🟢 [ACTIVATION DEBUG] Continuation - setting new recordingStartTime:', startTime);
            console.log('🟢 [ACTIVATION DEBUG] Continuation - keeping existing sessionStartTime:', window.StateManager?.getSessionStartTime());
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
            recordingStartTime: window.StateManager?.getRecordingStartTime() ? window.StateManager?.getRecordingStartTime().toISOString() : null,
            sessionStartTime: window.StateManager?.getSessionStartTime() ? window.StateManager?.getSessionStartTime().toISOString() : null
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
                    recordingStartTime: window.StateManager?.getRecordingStartTime() ? window.StateManager?.getRecordingStartTime().toISOString() : null,
                    sessionStartTime: window.StateManager?.getSessionStartTime() ? window.StateManager?.getSessionStartTime().toISOString() : null,
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
        
        // CRITICAL FIX: Clear all recording state from storage
        // This prevents conflicts and ensures clean state after recording stops
        if (window.StorageManager) {
            window.StorageManager.clearRecordingState();
        }
        
        // Add current session duration to total using TimerManager
        if (window.TimerManager) {
            window.TimerManager.accumulateSessionDuration();
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
        window.StateManager?.setRecordingStopped(true);
        window.StateManager?.setRecordingPaused(true);
        
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
            sessionTotalDuration: window.StateManager?.getSessionTotalDuration()
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
            if (window.StateManager?.getRecordingPaused() && window.transcriptData && window.transcriptData.messages.length > 0) {
                // Resume paused recording directly
                console.log('🔄 Resuming paused recording in same session');
                window.StateManager?.setRecordingPaused(false);
                window.StateManager?.setRecordingStopped(false);
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
        
        // Calculate current total duration using TimerManager
        const currentTotalDuration = window.TimerManager ? 
            window.TimerManager.getTotalDuration() : 
            (window.StateManager?.getSessionTotalDuration() || 0);
        
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
     * Get current recording status
     * Source: popup.js lines 635-644
     */
    getRecordingStatus() {
        const isRecording = window.realtimeMode;
        return {
            isRecording: isRecording,
            recordingStartTime: window.StateManager?.getRecordingStartTime(),
            sessionStartTime: window.StateManager?.getSessionStartTime(),
            sessionTotalDuration: window.StateManager?.getSessionTotalDuration() || 0,
            currentSessionId: window.currentSessionId,
            recordingPaused: window.StateManager?.getRecordingPaused() || false,
            recordingStopped: window.StateManager?.getRecordingStopped() || false
        };
    },

    /**
     * Initialize RecordingManager module
     */
    initialize() {
        console.log('🎙️ [RECORDING] RecordingManager initialized');
        // RecordingManager doesn't need special initialization
        // Recording functionality is managed through button clicks and state changes
        
        // Set up global aliases for backward compatibility
        this.setupGlobalAliases();
    },

    /**
     * Set up global function aliases for backward compatibility
     * This fixes the critical bug where other modules expect global functions
     */
    setupGlobalAliases() {
        // Critical fix: Expose recording functions globally as expected by other modules
        window.deactivateRealtimeMode = this.deactivateRealtimeMode.bind(this);
        window.activateRealtimeMode = this.activateRealtimeMode.bind(this);
        
        console.log('🔗 [RECORDING] Global recording function aliases created for backward compatibility');
    }
};