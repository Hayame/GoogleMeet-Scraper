/**
 * State Manager - Manages all global application state
 * Centralizes global variables and state management functions
 */

// Global state variables (originally from popup.js lines 1-17)
let transcriptData = null;
let realtimeMode = false;
let realtimeInterval = null;
let currentSessionId = null;
let sessionHistory = [];
let recordingStartTime = null;
let sessionStartTime = null; // Original session start time for stable titles
let durationTimer = null;
let expandedEntries = new Set(); // Track which entries are expanded
let sessionTotalDuration = 0; // Track total session duration across pauses
let recordingStopped = false; // Flag to ignore background updates after recording stops
let recordingPaused = false; // Flag to track if recording is paused (vs completely stopped)
let currentSearchQuery = '';
let searchDebounceTimer = null;
let originalMessages = [];
let activeParticipantFilters = new Set(); // Active participant filters
let allParticipants = []; // List of all participants

/**
 * Get current application state
 * @returns {Object} Current state object
 */
function getCurrentState() {
    return {
        transcriptData,
        realtimeMode,
        realtimeInterval,
        currentSessionId,
        sessionHistory,
        recordingStartTime,
        sessionStartTime,
        durationTimer,
        expandedEntries,
        sessionTotalDuration,
        recordingStopped,
        recordingPaused,
        currentSearchQuery,
        searchDebounceTimer,
        originalMessages,
        activeParticipantFilters,
        allParticipants
    };
}

/**
 * Set transcript data
 * @param {Object} data - Transcript data
 */
function setTranscriptData(data) {
    transcriptData = data;
}

/**
 * Get transcript data
 * @returns {Object} Current transcript data
 */
function getTranscriptData() {
    return transcriptData;
}

/**
 * Set realtime mode state
 * @param {boolean} active - Whether realtime mode is active
 */
function setRealtimeMode(active) {
    realtimeMode = active;
}

/**
 * Get realtime mode state
 * @returns {boolean} Whether realtime mode is active
 */
function getRealtimeMode() {
    return realtimeMode;
}

/**
 * Set current session ID
 * @param {string} sessionId - Session identifier
 */
function setCurrentSessionId(sessionId) {
    currentSessionId = sessionId;
}

/**
 * Get current session ID
 * @returns {string} Current session identifier
 */
function getCurrentSessionId() {
    return currentSessionId;
}

/**
 * Set recording start time
 * @param {Date} startTime - Recording start timestamp
 */
function setRecordingStartTime(startTime) {
    recordingStartTime = startTime;
}

/**
 * Get recording start time
 * @returns {Date} Recording start timestamp
 */
function getRecordingStartTime() {
    return recordingStartTime;
}

/**
 * Set session start time
 * @param {Date} startTime - Session start timestamp
 */
function setSessionStartTime(startTime) {
    sessionStartTime = startTime;
}

/**
 * Get session start time
 * @returns {Date} Session start timestamp
 */
function getSessionStartTime() {
    return sessionStartTime;
}

/**
 * Set session history
 * @param {Array} history - Session history array
 */
function setSessionHistory(history) {
    sessionHistory = history;
}

/**
 * Get session history
 * @returns {Array} Session history array
 */
function getSessionHistory() {
    return sessionHistory;
}

/**
 * Add session to history
 * @param {Object} session - Session object to add
 */
function addSessionToHistory(session) {
    sessionHistory.push(session);
}

/**
 * Set expanded entries
 * @param {Set} entries - Set of expanded entry IDs
 */
function setExpandedEntries(entries) {
    expandedEntries = entries;
}

/**
 * Get expanded entries
 * @returns {Set} Set of expanded entry IDs
 */
function getExpandedEntries() {
    return expandedEntries;
}

/**
 * Set session total duration
 * @param {number} duration - Total duration in seconds
 */
function setSessionTotalDuration(duration) {
    sessionTotalDuration = duration;
}

/**
 * Get session total duration
 * @returns {number} Total duration in seconds
 */
function getSessionTotalDuration() {
    return sessionTotalDuration;
}

/**
 * Set recording stopped flag
 * @param {boolean} stopped - Whether recording is stopped
 */
function setRecordingStopped(stopped) {
    recordingStopped = stopped;
}

/**
 * Get recording stopped flag
 * @returns {boolean} Whether recording is stopped
 */
function getRecordingStopped() {
    return recordingStopped;
}

/**
 * Set recording paused flag
 * @param {boolean} paused - Whether recording is paused
 */
function setRecordingPaused(paused) {
    recordingPaused = paused;
}

/**
 * Get recording paused flag
 * @returns {boolean} Whether recording is paused
 */
function getRecordingPaused() {
    return recordingPaused;
}

/**
 * Set duration timer
 * @param {number} timer - Timer ID
 */
function setDurationTimer(timer) {
    durationTimer = timer;
}

/**
 * Get duration timer
 * @returns {number} Timer ID
 */
function getDurationTimer() {
    return durationTimer;
}

/**
 * Clear duration timer
 */
function clearDurationTimer() {
    if (durationTimer) {
        clearInterval(durationTimer);
        durationTimer = null;
    }
}

/**
 * Set realtime interval
 * @param {number} interval - Interval ID
 */
function setRealtimeInterval(interval) {
    realtimeInterval = interval;
}

/**
 * Get realtime interval
 * @returns {number} Interval ID
 */
function getRealtimeInterval() {
    return realtimeInterval;
}

/**
 * Clear realtime interval
 */
function clearRealtimeInterval() {
    if (realtimeInterval) {
        clearInterval(realtimeInterval);
        realtimeInterval = null;
    }
}

/**
 * Reset all state to initial values
 */
function resetState() {
    transcriptData = null;
    realtimeMode = false;
    clearRealtimeInterval();
    currentSessionId = null;
    recordingStartTime = null;
    sessionStartTime = null;
    clearDurationTimer();
    expandedEntries = new Set();
    sessionTotalDuration = 0;
    recordingStopped = false;
    recordingPaused = false;
    currentSearchQuery = '';
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
    }
    originalMessages = [];
    activeParticipantFilters = new Set();
    allParticipants = [];
}

/**
 * Restore state from storage - Main state restoration function
 * This was originally the restoreStateFromStorage function from popup.js (lines ~104-220)
 */
async function restoreStateFromStorage() {
    try {
        console.log('🔄 [RESTORE] Restoring state from storage');
        
        const result = await window.StorageManager.getStorageData([
            window.AppConstants.STORAGE_KEYS.REALTIME_MODE,
            window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME,
            window.AppConstants.STORAGE_KEYS.SESSION_START_TIME,
            window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA,
            window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID,
            window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION,
            window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_DURATION,
            window.AppConstants.STORAGE_KEYS.MEET_TAB_ID
        ]);
        
        console.log('🔄 [RESTORE DEBUG] Storage contents:', {
            realtimeMode: result[window.AppConstants.STORAGE_KEYS.REALTIME_MODE],
            currentSessionId: result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID],
            hasTranscriptData: !!result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA],
            sessionHistoryLength: sessionHistory.length
        });
        
        // Restore recording state
        if (result[window.AppConstants.STORAGE_KEYS.REALTIME_MODE]) {
            console.log('🔄 [RESTORE] Restoring recording state');
            realtimeMode = true;
            
            // Restore recording start time and timer
            if (result[window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME]) {
                recordingStartTime = new Date(result[window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME]);
                console.log('🔄 [RESTORE] Restored recording start time:', recordingStartTime);
                // Note: UI update functions will be called from popup.js
            }
            
            // Restore session start time
            if (result[window.AppConstants.STORAGE_KEYS.SESSION_START_TIME]) {
                sessionStartTime = new Date(result[window.AppConstants.STORAGE_KEYS.SESSION_START_TIME]);
                console.log('🔄 [RESTORE] Restored session start time:', sessionStartTime);
            }
            
            // Restore session data
            if (result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]) {
                currentSessionId = result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID];
            }
            
            if (result[window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION]) {
                sessionTotalDuration = result[window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION];
            }
            
            // Remove any stale currentSessionDuration to prevent accumulation
            await window.StorageManager.clearCurrentSessionDuration();
            
            // Update UI state flags
            recordingStopped = false;
            recordingPaused = false;
            
            return {
                restored: true,
                realtimeMode: true,
                meetTabId: result[window.AppConstants.STORAGE_KEYS.MEET_TAB_ID],
                transcriptData: result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA],
                currentSessionId: result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]
            };
        }
        
        // Restore transcript data only for active recording or historical sessions
        if (result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA] && result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]) {
            const isActiveRecording = result[window.AppConstants.STORAGE_KEYS.REALTIME_MODE];
            const isHistoricalSession = sessionHistory.find(s => s.id === result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]);
            
            if (isActiveRecording || isHistoricalSession) {
                transcriptData = result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA];
                currentSessionId = result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID];
                
                return {
                    restored: true,
                    realtimeMode: false,
                    transcriptData: transcriptData,
                    currentSessionId: currentSessionId
                };
            }
        }
        
        return { restored: false };
        
    } catch (error) {
        console.error('🔄 [RESTORE ERROR] Failed to restore state:', error);
        return { restored: false, error: error };
    }
}

// Export all state management functions
window.StateManager = {
    // State getters and setters
    getCurrentState,
    setTranscriptData,
    getTranscriptData,
    setRealtimeMode,
    getRealtimeMode,
    setCurrentSessionId,
    getCurrentSessionId,
    setRecordingStartTime,
    getRecordingStartTime,
    setSessionStartTime,
    getSessionStartTime,
    setSessionHistory,
    getSessionHistory,
    addSessionToHistory,
    setExpandedEntries,
    getExpandedEntries,
    setSessionTotalDuration,
    getSessionTotalDuration,
    setRecordingStopped,
    getRecordingStopped,
    setRecordingPaused,
    getRecordingPaused,
    setDurationTimer,
    getDurationTimer,
    clearDurationTimer,
    setRealtimeInterval,
    getRealtimeInterval,
    clearRealtimeInterval,
    
    // State management functions
    resetState,
    restoreStateFromStorage
};