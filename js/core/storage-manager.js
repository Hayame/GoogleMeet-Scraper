/**
 * Storage Manager - Handles all Chrome storage operations
 * Centralizes chrome.storage.local.get/set/remove operations
 */

function getStorageData(keys) {
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

function setStorageData(data) {
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

function removeStorageData(keys) {
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

async function saveTranscriptData(transcriptData) {
    await setStorageData({
        [window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA]: transcriptData
    });
}

/**
 * Save session state to storage, only writing keys that are present in the input
 */
async function saveSessionState(state) {
    const KEYS = window.AppConstants.STORAGE_KEYS;
    const storageData = {};

    const keyMap = {
        currentSessionId: KEYS.CURRENT_SESSION_ID,
        realtimeMode: KEYS.REALTIME_MODE,
        recordingStartTime: KEYS.RECORDING_START_TIME,
        sessionStartTime: KEYS.SESSION_START_TIME,
        sessionTotalDuration: KEYS.SESSION_TOTAL_DURATION,
        meetTabId: KEYS.MEET_TAB_ID
    };

    for (const [prop, storageKey] of Object.entries(keyMap)) {
        if (state[prop] !== undefined && state[prop] !== null) {
            storageData[storageKey] = state[prop];
        }
    }

    if (Object.keys(storageData).length > 0) {
        await setStorageData(storageData);
    }
}

async function saveSessionHistory(sessionHistory) {
    await setStorageData({
        [window.AppConstants.STORAGE_KEYS.SESSION_HISTORY]: sessionHistory
    });
}

async function saveExpandedEntries(expandedEntries) {
    await setStorageData({
        [window.AppConstants.STORAGE_KEYS.EXPANDED_ENTRIES]: Array.from(expandedEntries)
    });
}

/**
 * Wrapper for setStorageData used by TransactionCoordinator for explicit intent
 */
async function executeAtomicUpdate(updates) {
    return setStorageData(updates);
}

async function clearCurrentSessionDuration() {
    await removeStorageData([window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_DURATION]);
}

/**
 * Set session to paused state: remove active recording keys but preserve session data.
 * MEET_TAB_ID is preserved to enable background scanning restart.
 */
async function setPausedSessionState() {
    const KEYS = window.AppConstants.STORAGE_KEYS;

    await removeStorageData([
        KEYS.REALTIME_MODE,
        KEYS.RECORDING_START_TIME,
        KEYS.CURRENT_SESSION_DURATION
    ]);

    await setStorageData({
        [KEYS.SESSION_STATE]: window.AppConstants.SESSION_STATES.PAUSED_SESSION,
        [KEYS.RECORDING_PAUSED]: true,
        [KEYS.RECORDING_STOPPED]: true
    });

    console.log('⏸️ [STORAGE] Set session to paused state');
}

window.StorageManager = {
    // Core operations
    getStorageData,
    setStorageData,
    removeStorageData,
    executeAtomicUpdate,

    // Convenience methods
    saveTranscriptData,
    saveSessionState,
    saveSessionHistory,
    saveExpandedEntries,
    clearCurrentSessionDuration,
    setPausedSessionState,

    initialize() {
        console.log('💾 [STORAGE] StorageManager initialized');
        this.setupGlobalAliases();
    },

    setupGlobalAliases() {
        window.storageGet = (keys) => new Promise((resolve) => chrome.storage.local.get(keys, resolve));
        window.storageSet = (data) => new Promise((resolve) => chrome.storage.local.set(data, resolve));
        window.storageRemove = (keys) => new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
        console.log('🔗 [STORAGE] Global storage aliases created');
    }
};