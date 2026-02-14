/**
 * Recording Management Module
 * Handles recording start/stop logic and state management
 */

window.RecordingManager = {
    /**
     * Activate realtime recording mode
     * @param {boolean} isContinuation - Whether this is continuing an existing session
     */
    async activateRealtimeMode(isContinuation = false) {
        console.log('🟢 [ACTIVATION] Starting realtime mode, continuation:', isContinuation);

        const realtimeBtn = document.getElementById('recordBtn');
        if (!realtimeBtn) {
            console.error('Record button not found!');
            return;
        }

        window.StateManager?.setRecordingStopped(false);
        window.StateManager?.setRecordingPaused(false);

        if (!isContinuation && window.SearchFilterManager) {
            window.SearchFilterManager.resetSearch();
        }

        window.realtimeMode = true;
        realtimeBtn.classList.add('active');
        document.querySelector('.record-text').textContent = 'Zatrzymaj nagrywanie';

        window.hideMeetingName?.();
        window.updateStatus?.('Nagrywanie aktywne - skanowanie w tle', 'info');
        window.updateButtonVisibility?.('RECORDING');

        // Set recording start time (always needed for duration tracking)
        const startTime = new Date();
        window.StateManager?.setRecordingStartTime(startTime);
        if (!isContinuation) {
            window.StateManager?.setSessionStartTime(startTime);
        }

        window.startDurationTimer?.();
        window.updateClearButtonState?.();

        if (!window.currentSessionId) {
            window.currentSessionId = window.generateSessionId ? window.generateSessionId() : 'session_' + Date.now();
            console.log('🔄 [RECORDING] Generated new currentSessionId:', window.currentSessionId);
        }

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url.includes('meet.google.com')) {
                return;
            }

            if (!isContinuation) {
                this.autoEnableCaptions();
            }

            const saveResult = await window.TransactionCoordinator.executeTransaction([
                { key: window.AppConstants.STORAGE_KEYS.REALTIME_MODE, value: true },
                { key: window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME, value: window.StateManager?.getRecordingStartTime()?.toISOString() },
                { key: window.AppConstants.STORAGE_KEYS.SESSION_START_TIME, value: window.StateManager?.getSessionStartTime()?.toISOString() },
                { key: window.AppConstants.STORAGE_KEYS.MEET_TAB_ID, value: tab.id },
                { key: window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID, value: window.currentSessionId }
            ]);

            if (!saveResult.success) {
                console.error('❌ [RECORDING] Failed to save recording state:', saveResult.error);
                window.updateStatus?.('Błąd zapisu stanu nagrywania', 'error');
                return;
            }

            console.log('✅ [RECORDING] Recording state saved atomically in', saveResult.duration, 'ms');

            chrome.runtime.sendMessage({
                action: 'startBackgroundScanning',
                tabId: tab.id
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ [ACTIVATION] Runtime error starting background scanning:', chrome.runtime.lastError);
                    window.updateStatus?.('Błąd uruchomienia skanowania w tle', 'error');
                    return;
                }

                if (response && response.success) {
                    console.log('✅ [ACTIVATION] Background scanning started');
                    window.updateStatus?.('Nagrywanie aktywne - skanowanie w tle', 'success');
                } else {
                    console.error('❌ [ACTIVATION] Failed to start background scanning');
                    window.updateStatus?.('Błąd uruchomienia skanowania w tle', 'error');
                }
            });
        } catch (error) {
            console.error('Error starting realtime mode:', error);
            window.updateStatus?.('Błąd uruchomienia trybu rzeczywistego', 'error');
        }
    },

    /**
     * Deactivate realtime recording mode
     */
    async deactivateRealtimeMode() {
        console.log('🔴 [RECORDING] deactivateRealtimeMode() called');

        const realtimeBtn = document.getElementById('recordBtn');
        if (!realtimeBtn) {
            console.error('Record button not found!');
            return;
        }

        // Load latest state from storage to prevent data loss from worker failures
        try {
            const storageData = await window.StorageManager.getStorageData([
                window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA,
                window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION
            ]);

            const storedTranscript = storageData[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA];
            if (storedTranscript &&
                storedTranscript.messages.length > (window.transcriptData?.messages?.length || 0)) {
                window.transcriptData = storedTranscript;
                console.log('✅ [RECORDING] Restored transcript from storage:', storedTranscript.messages.length, 'messages');
            }

            const storedDuration = storageData[window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION];
            if (storedDuration !== undefined && storedDuration > (window.StateManager?.getSessionTotalDuration() || 0)) {
                window.StateManager?.setSessionTotalDuration(storedDuration);
            }
        } catch (error) {
            console.warn('⚠️ [RECORDING] Failed to restore state from storage:', error);
        }

        window.realtimeMode = false;
        realtimeBtn.classList.remove('active');
        document.querySelector('.record-text').textContent = 'Rozpocznij nagrywanie';

        window.updateStatus?.('Nagrywanie zatrzymane', 'success');
        window.updateButtonVisibility?.('NEW');

        window.StorageManager?.setPausedSessionState();
        window.TimerManager?.accumulateSessionDuration();
        window.stopDurationTimer?.();
        window.updateClearButtonState?.();

        window.StateManager?.setRecordingStopped(true);
        window.StateManager?.setRecordingPaused(true);

        chrome.runtime.sendMessage({ action: 'stopBackgroundScanning' }, (response) => {
            if (response && response.success) {
                console.log('✅ Background scanning stopped');
            } else {
                console.error('❌ Failed to stop background scanning');
            }

            window.performFinalTranscriptRead?.();
        });
    },

    /**
     * Continue current recording session
     */
    async continueCurrentSession() {
        console.log('🔄 [RECORDING] Continuing current session:', window.currentSessionId);
        await this.activateRealtimeMode(true);
    },

    /**
     * Handle recording button click logic
     */
    handleRecordButtonClick() {
        if (window.realtimeMode) {
            this.deactivateRealtimeMode();
            return;
        }

        const hasExistingTranscript = window.transcriptData?.messages?.length > 0;

        if (window.StateManager?.getRecordingPaused() && hasExistingTranscript) {
            console.log('🔄 Resuming paused recording in same session');
            window.StateManager?.setRecordingPaused(false);
            window.StateManager?.setRecordingStopped(false);
            this.continueCurrentSession();
        } else if (hasExistingTranscript) {
            window.showResumeOptions?.();
        } else {
            this.activateRealtimeMode();
        }
    },

    /**
     * Automatically enable captions on Google Meet
     * Only triggers for NEW recordings (not continuations)
     * Silently fails if captions cannot be enabled
     */
    async autoEnableCaptions() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url.includes('meet.google.com')) {
                return;
            }

            chrome.tabs.sendMessage(tab.id, { action: 'enableCaptions' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('⚠️ [RECORDING] Could not send enableCaptions message:', chrome.runtime.lastError.message);
                    return;
                }
                if (response?.success) {
                    console.log('✅ [RECORDING] Captions:', response.alreadyEnabled ? 'already enabled' : 'enabled automatically');
                } else {
                    console.log('⚠️ [RECORDING] Could not enable captions:', response?.error || 'Unknown error');
                }
            });
        } catch (error) {
            console.log('⚠️ [RECORDING] Exception during auto-enable:', error.message);
        }
    },

    /**
     * Get current recording status
     */
    getRecordingStatus() {
        return {
            isRecording: window.realtimeMode,
            recordingStartTime: window.StateManager?.getRecordingStartTime(),
            sessionStartTime: window.StateManager?.getSessionStartTime(),
            sessionTotalDuration: window.StateManager?.getSessionTotalDuration() || 0,
            currentSessionId: window.currentSessionId,
            recordingPaused: window.StateManager?.getRecordingPaused() || false,
            recordingStopped: window.StateManager?.getRecordingStopped() || false
        };
    },

    initialize() {
        console.log('🎙️ [RECORDING] RecordingManager initialized');
        this.setupGlobalAliases();
    },

    setupGlobalAliases() {
        window.deactivateRealtimeMode = this.deactivateRealtimeMode.bind(this);
        window.activateRealtimeMode = this.activateRealtimeMode.bind(this);
    }
};