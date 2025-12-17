/**
 * Transcript Refresh Manager
 * Handles manual transcript refresh and background scanner restart
 */
window.TranscriptRefreshManager = {
    /**
     * Handle refresh button click - reload transcript and restart scanner if needed
     */
    async handleRefreshClick() {
        console.log('🔄 [REFRESH] Refresh button clicked');

        if (!window.realtimeMode) {
            console.warn('⚠️ [REFRESH] Refresh only available during recording');
            return;
        }

        this.setRefreshInProgress(true);
        window.updateStatus('Odświeżanie transkrypcji...', 'info');

        try {
            // Load latest transcript from storage
            const result = await this.reloadTranscriptFromStorage();

            if (!result.success) {
                throw new Error(result.error);
            }

            // Check if scanner is running and restart if needed
            const scannerState = await this.checkBackgroundScannerState();

            if (!scannerState.isRunning) {
                console.warn('⚠️ [REFRESH] Scanner not running, restarting');
                await this.restartBackgroundScanner();
            }

            window.updateStatus('Transkrypcja odświeżona', 'success');
        } catch (error) {
            console.error('❌ [REFRESH] Refresh failed:', error);
            window.updateStatus(`Błąd odświeżania: ${error.message}`, 'error');
        } finally {
            this.setRefreshInProgress(false);
        }
    },

    /**
     * Reload transcript data from Chrome storage
     * @private
     */
    async reloadTranscriptFromStorage() {
        try {
            const result = await window.StorageManager.getStorageData([
                window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA
            ]);

            const transcriptData = result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA];

            if (transcriptData && transcriptData.messages) {
                window.transcriptData = transcriptData;

                if (window.displayTranscript) {
                    window.displayTranscript(transcriptData);
                }
                if (window.updateStats) {
                    window.updateStats(transcriptData);
                }

                console.log('✅ [REFRESH] Transcript reloaded:', transcriptData.messages.length, 'messages');
                return { success: true };
            } else {
                return { success: false, error: 'Brak danych transkrypcji' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Check if background scanner is currently running
     * @private
     */
    async checkBackgroundScannerState() {
        try {
            const result = await window.StorageManager.getStorageData([
                window.AppConstants.STORAGE_KEYS.REALTIME_MODE,
                window.AppConstants.STORAGE_KEYS.MEET_TAB_ID
            ]);

            const isRunning = result[window.AppConstants.STORAGE_KEYS.REALTIME_MODE] === true &&
                            result[window.AppConstants.STORAGE_KEYS.MEET_TAB_ID] !== undefined;

            return { isRunning };
        } catch (error) {
            console.error('❌ [REFRESH] Failed to check scanner state:', error);
            return { isRunning: false };
        }
    },

    /**
     * Attempt to restart background scanner
     * @private
     */
    async restartBackgroundScanner() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab || !tab.url.includes('meet.google.com')) {
                throw new Error('Google Meet tab not found');
            }

            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'startBackgroundScanning',
                    tabId: tab.id
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else if (response && response.success) {
                        console.log('✅ [REFRESH] Background scanner restarted');
                        resolve(response);
                    } else {
                        reject(new Error('Failed to restart scanner'));
                    }
                });
            });
        } catch (error) {
            console.error('❌ [REFRESH] Failed to restart scanner:', error);
            throw error;
        }
    },

    /**
     * Set visual feedback for refresh in progress
     * @private
     */
    setRefreshInProgress(inProgress) {
        const refreshBtn = document.getElementById('refreshTranscriptBtn');
        if (!refreshBtn) return;

        refreshBtn.disabled = inProgress;
        if (inProgress) {
            refreshBtn.classList.add('disabled');
        } else {
            refreshBtn.classList.remove('disabled');
        }
    },

    /**
     * Initialize TranscriptRefreshManager
     */
    initialize() {
        console.log('🔄 [REFRESH] TranscriptRefreshManager initialized');
    }
};
