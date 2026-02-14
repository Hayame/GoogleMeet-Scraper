/**
 * Transcript Refresh Manager
 * Handles manual transcript refresh and background scanner restart
 */
window.TranscriptRefreshManager = {
    /**
     * Handle refresh button click - reload transcript and restart scanner if needed
     */
    async handleRefreshClick() {
        if (!window.realtimeMode) {
            return;
        }

        this.setRefreshInProgress(true);
        window.updateStatus?.('Odświeżanie transkrypcji...', 'info');

        try {
            const result = await window.StorageManager.getStorageData([
                window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA
            ]);
            const transcriptData = result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA];

            if (!transcriptData?.messages) {
                throw new Error('Brak danych transkrypcji');
            }

            window.transcriptData = transcriptData;
            window.displayTranscript?.(transcriptData);
            window.updateStats?.(transcriptData);

            console.log('✅ [REFRESH] Transcript reloaded:', transcriptData.messages.length, 'messages');

            // Check if scanner is running and restart if needed
            const scannerResult = await window.StorageManager.getStorageData([
                window.AppConstants.STORAGE_KEYS.REALTIME_MODE,
                window.AppConstants.STORAGE_KEYS.MEET_TAB_ID
            ]);
            const isRunning = scannerResult[window.AppConstants.STORAGE_KEYS.REALTIME_MODE] === true
                && scannerResult[window.AppConstants.STORAGE_KEYS.MEET_TAB_ID] !== undefined;

            if (!isRunning) {
                await this.restartBackgroundScanner();
            }

            window.updateStatus?.('Transkrypcja odświeżona', 'success');
        } catch (error) {
            console.error('❌ [REFRESH] Refresh failed:', error);
            window.updateStatus?.(`Błąd odświeżania: ${error.message}`, 'error');
        } finally {
            this.setRefreshInProgress(false);
        }
    },

    /**
     * Restart background scanner for the active Meet tab
     * @private
     */
    async restartBackgroundScanner() {
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
                } else if (response?.success) {
                    console.log('✅ [REFRESH] Background scanner restarted');
                    resolve(response);
                } else {
                    reject(new Error('Failed to restart scanner'));
                }
            });
        });
    },

    /**
     * Set visual feedback for refresh in progress
     * @private
     */
    setRefreshInProgress(inProgress) {
        const refreshBtn = document.getElementById('refreshTranscriptBtn');
        if (!refreshBtn) {
            return;
        }

        refreshBtn.disabled = inProgress;
        refreshBtn.classList.toggle('disabled', inProgress);
    },

    initialize() {
        console.log('🔄 [REFRESH] TranscriptRefreshManager initialized');
    }
};
