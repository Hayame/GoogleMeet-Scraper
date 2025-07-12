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
 * Save theme preference
 * @param {string} theme - Theme name
 */
async function saveTheme(theme) {
    await setStorageData({ 
        [window.AppConstants.STORAGE_KEYS.THEME]: theme 
    });
}

/**
 * Save sidebar collapsed state
 * @param {boolean} collapsed - Whether sidebar is collapsed
 */
async function saveSidebarState(collapsed) {
    await setStorageData({ 
        [window.AppConstants.STORAGE_KEYS.SIDEBAR_COLLAPSED]: collapsed 
    });
}

/**
 * Clear all session-related storage data
 */
async function clearSessionData() {
    await removeStorageData([
        window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA,
        window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID,
        window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME,
        window.AppConstants.STORAGE_KEYS.SESSION_START_TIME,
        window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION,
        window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_DURATION,
        window.AppConstants.STORAGE_KEYS.REALTIME_MODE,
        window.AppConstants.STORAGE_KEYS.MEET_TAB_ID
    ]);
}

/**
 * Clear current session duration (used to prevent accumulation)
 */
async function clearCurrentSessionDuration() {
    await removeStorageData([window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_DURATION]);
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
    saveTheme,
    saveSidebarState,
    clearSessionData,
    clearCurrentSessionDuration
};