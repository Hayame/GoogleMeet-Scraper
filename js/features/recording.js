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
        
        // Reset search when starting new recording (not continuation)
        if (!isContinuation && window.SearchFilterManager) {
            window.SearchFilterManager.resetSearch();
        }
        
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

        // Create new session ID if none exists
        if (!window.currentSessionId) {
            window.currentSessionId = window.generateSessionId ? window.generateSessionId() : 'session_' + Date.now();
            console.log('🔄 [RECORDING DEBUG] Recording activation - Generated new currentSessionId:', window.currentSessionId);
        } else {
            console.log('🔄 [RECORDING DEBUG] Recording activation - Using existing currentSessionId:', window.currentSessionId);
        }

        // Start background scanning
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url.includes('meet.google.com')) {
                console.log('🟢 [ACTIVATION DEBUG] Starting background scanning for tab:', tab.id);

                // NEW: Auto-enable captions for NEW recordings only (not continuations)
                if (!isContinuation) {
                    console.log('🎬 [ACTIVATION] New recording - auto-enabling captions');
                    this.autoEnableCaptions(); // Fire and forget - don't await
                } else {
                    console.log('🎬 [ACTIVATION] Continuation - skipping caption auto-enable');
                }

                // Save complete recording state atomically using TransactionCoordinator
                // This ensures all related data is saved together (no partial states)
                const saveResult = await window.TransactionCoordinator.executeTransaction([
                    {
                        key: window.AppConstants.STORAGE_KEYS.REALTIME_MODE,
                        value: true
                    },
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
                        value: tab.id
                    },
                    {
                        key: window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID,
                        value: window.currentSessionId
                    }
                ]);

                if (!saveResult.success) {
                    console.error('❌ [RECORDING] Failed to save recording state:', saveResult.error);
                    if (window.updateStatus) {
                        window.updateStatus('Błąd zapisu stanu nagrywania', 'error');
                    }
                    return;
                }

                console.log('✅ [RECORDING] Recording state saved atomically in', saveResult.duration, 'ms');

                // Start background scanning
                chrome.runtime.sendMessage({
                    action: 'startBackgroundScanning',
                    tabId: tab.id
                }, (response) => {
                    const scanStartTime = new Date().toISOString();

                    // Check for chrome.runtime.lastError
                    if (chrome.runtime.lastError) {
                        console.error('🟢 [ACTIVATION DEBUG] Runtime error starting background scanning:', chrome.runtime.lastError);
                        if (window.updateStatus) {
                            window.updateStatus('Błąd uruchomienia skanowania w tle', 'error');
                        }
                        return;
                    }

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
    async deactivateRealtimeMode() {
        // CRITICAL DEBUG: Log who is calling deactivateRealtimeMode
        console.log('🔴 [RECORDING DEBUG] deactivateRealtimeMode() called');
        console.log('🔴 [RECORDING DEBUG] Call stack:', new Error().stack);
        console.log('🔴 [RECORDING DEBUG] Current recording state:', {
            realtimeMode: window.realtimeMode,
            currentSessionId: window.currentSessionId,
            hasTranscriptData: !!window.transcriptData,
            messageCount: window.transcriptData?.messages?.length || 0
        });

        const realtimeBtn = document.getElementById('recordBtn');
        if (!realtimeBtn) {
            console.error('Record button not found!');
            return;
        }

        // NEW: Load latest state from storage to prevent data loss from worker failures
        try {
            console.log('🔄 [RECORDING] Loading latest state from storage before stop');
            const storageData = await window.StorageManager.getStorageData([
                window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA,
                window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION
            ]);

            // Restore transcript if storage has newer/more complete version
            if (storageData[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA]) {
                const storedTranscript = storageData[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA];
                if (!window.transcriptData ||
                    storedTranscript.messages.length > (window.transcriptData.messages?.length || 0)) {
                    window.transcriptData = storedTranscript;
                    console.log('✅ [RECORDING] Restored transcript from storage:', storedTranscript.messages.length, 'messages');
                }
            }

            // Restore session duration if storage has larger value
            if (storageData[window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION] !== undefined) {
                const storedDuration = storageData[window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION];
                if (storedDuration > (window.StateManager?.getSessionTotalDuration() || 0)) {
                    window.StateManager?.setSessionTotalDuration(storedDuration);
                }
            }
        } catch (error) {
            console.warn('⚠️ [RECORDING] Failed to restore state from storage:', error);
            // Continue - error is non-fatal
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
        
        // CRITICAL FIX: Set session to paused state when user manually stops recording
        // This preserves session data and duration while stopping active recording
        if (window.StorageManager) {
            window.StorageManager.setPausedSessionState();
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

    // autoSaveCurrentSession() method removed - use SessionHistoryManager.autoSaveCurrentSession() instead

    /**
     * Automatically enable captions on Google Meet
     * Only triggers for NEW recordings (not continuations)
     * Silently fails if captions cannot be enabled
     */
    async autoEnableCaptions() {
        console.log('🎬 [RECORDING] Auto-enabling captions...');

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab || !tab.url.includes('meet.google.com')) {
                console.log('⚠️ [RECORDING] Not on Google Meet tab, skipping auto-enable');
                return;
            }

            // Send message to content script to enable captions
            chrome.tabs.sendMessage(tab.id, { action: 'enableCaptions' }, (response) => {
                // Check for chrome.runtime.lastError
                if (chrome.runtime.lastError) {
                    console.log('⚠️ [RECORDING] Could not send enableCaptions message:', chrome.runtime.lastError.message);
                    return;
                }

                if (response && response.success) {
                    if (response.alreadyEnabled) {
                        console.log('✅ [RECORDING] Captions were already enabled');
                    } else if (response.toggled) {
                        console.log('✅ [RECORDING] Captions enabled automatically');
                    }
                } else {
                    // Silent failure - continue recording anyway
                    console.log('⚠️ [RECORDING] Could not enable captions:', response?.error || 'Unknown error');
                }
            });
        } catch (error) {
            // Silent failure - continue recording anyway
            console.log('⚠️ [RECORDING] Exception during auto-enable:', error.message);
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