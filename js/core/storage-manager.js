/**
 * Storage Manager - Handles all Chrome storage operations
 * Centralizes chrome.storage.local.get/set/remove operations
 */

/**
 * Get data from Chrome storage
 * @param {string|Array<string>} keys - Storage keys to retrieve
 * @returns {Promise<Object>} Storage data
 */
async function getStorageData(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result);
            }
        });
    });
}

/**
 * Set data in Chrome storage
 * @param {Object} data - Data to store
 * @returns {Promise<void>}
 */
async function setStorageData(data) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(data, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Remove data from Chrome storage
 * @param {string|Array<string>} keys - Storage keys to remove
 * @returns {Promise<void>}
 */
async function removeStorageData(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.remove(keys, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Save transcript data to storage
 * @param {Object} transcriptData - Transcript data to save
 */
async function saveTranscriptData(transcriptData) {
    await setStorageData({ 
        [window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA]: transcriptData 
    });
}

/**
 * Save session state to storage
 * @param {Object} sessionState - Session state data
 */
async function saveSessionState(sessionState) {
    const storageData = {};
    
    if (sessionState.currentSessionId) {
        storageData[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID] = sessionState.currentSessionId;
    }
    if (sessionState.realtimeMode !== undefined) {
        storageData[window.AppConstants.STORAGE_KEYS.REALTIME_MODE] = sessionState.realtimeMode;
    }
    if (sessionState.recordingStartTime) {
        storageData[window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME] = sessionState.recordingStartTime;
    }
    if (sessionState.sessionStartTime) {
        storageData[window.AppConstants.STORAGE_KEYS.SESSION_START_TIME] = sessionState.sessionStartTime;
    }
    if (sessionState.sessionTotalDuration !== undefined) {
        storageData[window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION] = sessionState.sessionTotalDuration;
    }
    if (sessionState.meetTabId) {
        storageData[window.AppConstants.STORAGE_KEYS.MEET_TAB_ID] = sessionState.meetTabId;
    }
    
    await setStorageData(storageData);
}

/**
 * Save session history to storage
 * @param {Array} sessionHistory - Session history array
 */
async function saveSessionHistory(sessionHistory) {
    await setStorageData({ 
        [window.AppConstants.STORAGE_KEYS.SESSION_HISTORY]: sessionHistory 
    });
}

/**
 * Save expanded entries state
 * @param {Set} expandedEntries - Set of expanded entry IDs
 */
async function saveExpandedEntries(expandedEntries) {
    const expandedArray = Array.from(expandedEntries);
    await setStorageData({ 
        [window.AppConstants.STORAGE_KEYS.EXPANDED_ENTRIES]: expandedArray 
    });
}


/**
 * Clear current session duration (used to prevent accumulation)
 */
async function clearCurrentSessionDuration() {
    await removeStorageData([window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_DURATION]);
}

/**
 * Save recording state for popup close without stopping recording
 * CRITICAL FIX: Keep REALTIME_MODE in storage when popup is just minimized
 */
async function saveRecordingStateForPopupClose() {
    // Just ensure all current recording data is saved, but keep REALTIME_MODE active
    // This will allow proper restoration when popup reopens
    console.log('💾 [STORAGE] Saving recording state for popup close - keeping recording active');
    
    // We don't need to do anything special here - the recording state should already be in storage
    // The key difference is we DON'T remove REALTIME_MODE
}

/**
 * Set session to paused state when recording stops
 * CRITICAL FIX: Preserve session data but mark as paused for proper restoration
 */
async function setPausedSessionState() {
    // Remove only active recording keys, preserve session data
    await removeStorageData([
        window.AppConstants.STORAGE_KEYS.REALTIME_MODE,
        window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME,
        window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_DURATION,
        window.AppConstants.STORAGE_KEYS.MEET_TAB_ID
    ]);
    
    // Set session state to paused
    await setStorageData({
        [window.AppConstants.STORAGE_KEYS.SESSION_STATE]: window.AppConstants.SESSION_STATES.PAUSED_SESSION
    });
    
    console.log('⏸️ [STORAGE] Set session to paused state - preserved transcript data and total duration');
}

/**
 * Clear all recording-related storage keys when recording stops (legacy function)
 * DEPRECATED: Use setPausedSessionState() instead
 */
async function clearRecordingState() {
    await removeStorageData([
        window.AppConstants.STORAGE_KEYS.REALTIME_MODE,
        window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME,
        window.AppConstants.STORAGE_KEYS.SESSION_START_TIME,
        window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION,
        window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_DURATION,
        window.AppConstants.STORAGE_KEYS.MEET_TAB_ID
    ]);
    console.log('🧹 [STORAGE] Cleared all recording state keys');
}

// Export all storage functions
window.StorageManager = {
    getStorageData,
    setStorageData,
    removeStorageData,
    saveTranscriptData,
    saveSessionState,
    saveSessionHistory,
    saveExpandedEntries,
    clearCurrentSessionDuration,
    clearRecordingState,
    setPausedSessionState,
    saveRecordingStateForPopupClose,

    /**
     * Initialize StorageManager module
     */
    initialize() {
        console.log('💾 [STORAGE] StorageManager initialized');
        
        // Set up global aliases for easier migration from direct chrome.storage calls
        this.setupGlobalAliases();
    },

    /**
     * Set up global storage function aliases for easier migration
     */
    setupGlobalAliases() {
        // Simple wrapper functions for common operations
        window.storageGet = (keys) => {
            return new Promise((resolve) => {
                chrome.storage.local.get(keys, resolve);
            });
        };
        
        window.storageSet = (data) => {
            return new Promise((resolve) => {
                chrome.storage.local.set(data, resolve);
            });
        };
        
        window.storageRemove = (keys) => {
            return new Promise((resolve) => {
                chrome.storage.local.remove(keys, resolve);
            });
        };
        
        console.log('🔗 [STORAGE] Global storage wrapper functions created');
    }
};