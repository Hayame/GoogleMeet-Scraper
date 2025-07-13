/**
 * State Manager - Manages all global application state
 * Centralizes global variables and state management functions
 */

// Global state variables (originally from popup.js lines 1-17)
let transcriptData = null;
let realtimeMode = false;
let realtimeInterval = null;
let currentSessionId = null;
// CRITICAL FIX: Remove local sessionHistory - use window.sessionHistory directly
// let sessionHistory = []; ← REMOVED - this was overwriting loaded data
let durationTimer = null;
let expandedEntries = new Set(); // Track which entries are expanded
let currentSearchQuery = '';
let searchDebounceTimer = null;
let originalMessages = [];
let activeParticipantFilters = new Set(); // Active participant filters
let allParticipants = []; // List of all participants

// Consolidated session state object
let sessionState = {
    recordingStartTime: null,     // Current recording start timestamp
    sessionStartTime: null,       // Original session start time for stable titles
    totalDuration: 0,            // Total accumulated duration across pauses
    isRecordingStopped: false,   // Flag to ignore background updates after recording stops
    isRecordingPaused: false     // Flag to track if recording is paused (vs completely stopped)
};


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
    sessionState.recordingStartTime = startTime;
}

/**
 * Get recording start time
 * @returns {Date} Recording start timestamp
 */
function getRecordingStartTime() {
    return sessionState.recordingStartTime;
}

/**
 * Set session start time
 * @param {Date} startTime - Session start timestamp
 */
function setSessionStartTime(startTime) {
    sessionState.sessionStartTime = startTime;
}

/**
 * Get session start time
 * @returns {Date} Session start timestamp
 */
function getSessionStartTime() {
    return sessionState.sessionStartTime;
}


/**
 * Set session total duration
 * @param {number} duration - Total duration in seconds
 */
function setSessionTotalDuration(duration) {
    sessionState.totalDuration = duration;
}

/**
 * Get session total duration
 * @returns {number} Total duration in seconds
 */
function getSessionTotalDuration() {
    return sessionState.totalDuration;
}

/**
 * Set recording stopped flag
 * @param {boolean} stopped - Whether recording is stopped
 */
function setRecordingStopped(stopped) {
    sessionState.isRecordingStopped = stopped;
}

/**
 * Get recording stopped flag
 * @returns {boolean} Whether recording is stopped
 */
function getRecordingStopped() {
    return sessionState.isRecordingStopped;
}

/**
 * Set recording paused flag
 * @param {boolean} paused - Whether recording is paused
 */
function setRecordingPaused(paused) {
    sessionState.isRecordingPaused = paused;
}

/**
 * Get recording paused flag
 * @returns {boolean} Whether recording is paused
 */
function getRecordingPaused() {
    return sessionState.isRecordingPaused;
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
 * Save UI state to storage
 * @param {Object} uiState - UI state object containing sidebar, search, filter states
 */
async function saveUIState(uiState) {
    try {
        const stateToSave = {
            sidebarCollapsed: uiState.sidebarCollapsed || false,
            searchPanelOpen: uiState.searchPanelOpen || false,
            filterPanelOpen: uiState.filterPanelOpen || false,
            theme: uiState.theme || 'light',
            timestamp: Date.now()
        };
        
        await window.StorageManager.setStorageData({
            [window.AppConstants.STORAGE_KEYS.LAST_UI_STATE]: stateToSave,
            [window.AppConstants.STORAGE_KEYS.SIDEBAR_COLLAPSED]: stateToSave.sidebarCollapsed,
            [window.AppConstants.STORAGE_KEYS.SEARCH_PANEL_OPEN]: stateToSave.searchPanelOpen,
            [window.AppConstants.STORAGE_KEYS.FILTER_PANEL_OPEN]: stateToSave.filterPanelOpen,
            [window.AppConstants.STORAGE_KEYS.THEME]: stateToSave.theme
        });
        
        console.log('💾 [UI STATE] Saved UI state:', stateToSave);
    } catch (error) {
        console.error('💾 [UI STATE ERROR] Failed to save UI state:', error);
    }
}

/**
 * Restore UI state from storage
 * @returns {Object} Restored UI state
 */
async function restoreUIState() {
    try {
        const result = await window.StorageManager.getStorageData([
            window.AppConstants.STORAGE_KEYS.LAST_UI_STATE,
            window.AppConstants.STORAGE_KEYS.SIDEBAR_COLLAPSED,
            window.AppConstants.STORAGE_KEYS.SEARCH_PANEL_OPEN,
            window.AppConstants.STORAGE_KEYS.FILTER_PANEL_OPEN,
            window.AppConstants.STORAGE_KEYS.THEME
        ]);
        
        // Use lastUIState if available, otherwise fallback to individual keys
        const uiState = result[window.AppConstants.STORAGE_KEYS.LAST_UI_STATE] || {
            sidebarCollapsed: result[window.AppConstants.STORAGE_KEYS.SIDEBAR_COLLAPSED] || false,
            searchPanelOpen: result[window.AppConstants.STORAGE_KEYS.SEARCH_PANEL_OPEN] || false,
            filterPanelOpen: result[window.AppConstants.STORAGE_KEYS.FILTER_PANEL_OPEN] || false,
            theme: result[window.AppConstants.STORAGE_KEYS.THEME] || 'light'
        };
        
        console.log('🔄 [UI STATE] Restored UI state:', uiState);
        return uiState;
    } catch (error) {
        console.error('🔄 [UI STATE ERROR] Failed to restore UI state:', error);
        return {
            sidebarCollapsed: false,
            searchPanelOpen: false,
            filterPanelOpen: false,
            theme: 'light'
        };
    }
}

/**
 * Initialize global variables without overwriting existing data
 * PHASE 4: Prevent variable exposure from overwriting loaded data
 */
function initializeGlobalVariables() {
    // Only set globals if they don't exist yet
    if (window.transcriptData === undefined) window.transcriptData = transcriptData;
    if (window.realtimeMode === undefined) window.realtimeMode = realtimeMode;
    if (window.currentSessionId === undefined) window.currentSessionId = currentSessionId;
    if (window.expandedEntries === undefined) window.expandedEntries = expandedEntries;
    if (window.currentSearchQuery === undefined) window.currentSearchQuery = currentSearchQuery;
    if (window.originalMessages === undefined) window.originalMessages = originalMessages;
    if (window.activeParticipantFilters === undefined) window.activeParticipantFilters = activeParticipantFilters;
    if (window.allParticipants === undefined) window.allParticipants = allParticipants;
    
    // CRITICAL: Never overwrite sessionHistory if it already exists
    if (!window.sessionHistory) {
        window.sessionHistory = [];
        console.log('🔧 [STATE] Initialized empty sessionHistory');
    } else {
        console.log('🔧 [STATE] Preserving existing sessionHistory with', window.sessionHistory.length, 'sessions');
    }
    
    console.log('🌐 [STATE] Global variables initialized (no overwrites)');
}

/**
 * Expose state variables globally for backward compatibility
 * CRITICAL FIX: Other modules expect window.transcriptData, window.realtimeMode, etc.
 */
function exposeGlobalVariables() {
    // Store previous values for comparison
    const previousValues = {
        transcriptData: window.transcriptData,
        realtimeMode: window.realtimeMode,
        currentSessionId: window.currentSessionId,
        sessionHistoryLength: window.sessionHistory?.length || 0
    };
    
    // Set new values
    window.transcriptData = transcriptData;
    window.realtimeMode = realtimeMode;
    window.currentSessionId = currentSessionId;
    
    // CRITICAL FIX: Only set window.sessionHistory if it doesn't exist or is empty
    // This prevents overwriting data loaded by SessionHistoryManager
    if (!window.sessionHistory || window.sessionHistory.length === 0) {
        window.sessionHistory = window.sessionHistory || [];
        console.log('🔧 [STATE] Initialized empty sessionHistory');
    } else {
        console.log('🔧 [STATE] Preserving existing sessionHistory with', window.sessionHistory.length, 'sessions');
    }
    
    window.expandedEntries = expandedEntries;
    window.currentSearchQuery = currentSearchQuery;
    window.originalMessages = originalMessages;
    window.activeParticipantFilters = activeParticipantFilters;
    window.allParticipants = allParticipants;
    
    // Detailed logging for debugging
    const currentValues = {
        hasTranscriptData: !!window.transcriptData,
        transcriptDataEntries: window.transcriptData?.messages?.length || 0,
        realtimeMode: window.realtimeMode,
        currentSessionId: window.currentSessionId,
        sessionHistoryLength: window.sessionHistory?.length || 0
    };
    
    console.log('🌐 [STATE] Global variables exposed:', currentValues);
    
    // Log changes for debugging
    if (previousValues.realtimeMode !== currentValues.realtimeMode) {
        console.log('🔄 [STATE] RealtimeMode changed:', previousValues.realtimeMode, '->', currentValues.realtimeMode);
    }
    if (previousValues.currentSessionId !== currentValues.currentSessionId) {
        console.log('🔄 [STATE] CurrentSessionId changed:', previousValues.currentSessionId, '->', currentValues.currentSessionId);
    }
    if (previousValues.sessionHistoryLength !== currentValues.sessionHistoryLength) {
        console.log('🔄 [STATE] SessionHistory length changed:', previousValues.sessionHistoryLength, '->', currentValues.sessionHistoryLength);
    }
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
            window.AppConstants.STORAGE_KEYS.MEET_TAB_ID,
            window.AppConstants.STORAGE_KEYS.SESSION_STATE
        ]);
        
        console.log('🔄 [RESTORE DEBUG] Storage contents:', {
            realtimeMode: result[window.AppConstants.STORAGE_KEYS.REALTIME_MODE],
            currentSessionId: result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID],
            hasTranscriptData: !!result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA],
            sessionHistoryLength: sessionHistory.length,
            sessionState: result[window.AppConstants.STORAGE_KEYS.SESSION_STATE],
            meetTabId: result[window.AppConstants.STORAGE_KEYS.MEET_TAB_ID],
            allStorageKeys: Object.keys(result)
        });
        
        // CRITICAL DEBUG: Log detailed recording state analysis
        if (result[window.AppConstants.STORAGE_KEYS.REALTIME_MODE]) {
            console.log('🔴 [RESTORE DEBUG] Active recording detected in storage!');
            console.log('🔴 [RESTORE DEBUG] Recording details:', {
                recordingStartTime: result[window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME],
                sessionStartTime: result[window.AppConstants.STORAGE_KEYS.SESSION_START_TIME],
                sessionTotalDuration: result[window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION],
                currentSessionDuration: result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_DURATION]
            });
        } else {
            console.log('🔍 [RESTORE DEBUG] No active recording in storage');
            console.log('🔍 [RESTORE DEBUG] Checking for paused session:', result[window.AppConstants.STORAGE_KEYS.SESSION_STATE]);
        }
        
        // Restore recording state
        if (result[window.AppConstants.STORAGE_KEYS.REALTIME_MODE]) {
            console.log('🔄 [RESTORE] Restoring recording state');
            realtimeMode = true;
            
            // CRITICAL FIX: Restore transcript data for active recording
            // This was missing and caused empty chat during recording restoration
            if (result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA]) {
                transcriptData = result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA];
                console.log('🔄 [RESTORE] Restored transcript data for recording:', transcriptData?.messages?.length || 0, 'messages');
            }
            
            // Restore recording start time and timer
            if (result[window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME]) {
                sessionState.recordingStartTime = new Date(result[window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME]);
                console.log('🔄 [RESTORE] Restored recording start time:', sessionState.recordingStartTime);
                // Note: UI update functions will be called from popup.js
            }
            
            // Restore session start time
            if (result[window.AppConstants.STORAGE_KEYS.SESSION_START_TIME]) {
                sessionState.sessionStartTime = new Date(result[window.AppConstants.STORAGE_KEYS.SESSION_START_TIME]);
                console.log('🔄 [RESTORE] Restored session start time:', sessionState.sessionStartTime);
            }
            
            // Restore session data
            if (result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]) {
                currentSessionId = result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID];
            }
            
            if (result[window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION]) {
                sessionState.totalDuration = result[window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION];
            }
            
            // Remove any stale currentSessionDuration to prevent accumulation
            await window.StorageManager.clearCurrentSessionDuration();
            
            // Update UI state flags
            sessionState.isRecordingStopped = false;
            sessionState.isRecordingPaused = false;
            
            // CRITICAL FIX: Expose global variables after state restoration
            exposeGlobalVariables();
            
            return {
                restored: true,
                realtimeMode: true,
                meetTabId: result[window.AppConstants.STORAGE_KEYS.MEET_TAB_ID],
                transcriptData: result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA],
                currentSessionId: result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]
            };
        }
        
        // CRITICAL FIX: Check for paused session state
        const pausedSessionState = result[window.AppConstants.STORAGE_KEYS.SESSION_STATE];
        if (pausedSessionState === window.AppConstants.SESSION_STATES.PAUSED_SESSION) {
            console.log('⏸️ [RESTORE] Restoring paused session state');
            
            if (result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA] && result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]) {
                transcriptData = result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA];
                currentSessionId = result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID];
                
                // Restore session start time and total duration for paused session
                if (result[window.AppConstants.STORAGE_KEYS.SESSION_START_TIME]) {
                    sessionState.sessionStartTime = new Date(result[window.AppConstants.STORAGE_KEYS.SESSION_START_TIME]);
                }
                if (result[window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION]) {
                    sessionState.totalDuration = result[window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION];
                }
                
                exposeGlobalVariables();
                
                return {
                    restored: true,
                    realtimeMode: false,
                    sessionState: window.AppConstants.SESSION_STATES.PAUSED_SESSION,
                    transcriptData: transcriptData,
                    currentSessionId: currentSessionId,
                    sessionStartTime: result[window.AppConstants.STORAGE_KEYS.SESSION_START_TIME],
                    sessionTotalDuration: result[window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION]
                };
            }
        }
        
        // Check for historical session state
        if (pausedSessionState === window.AppConstants.SESSION_STATES.HISTORICAL_SESSION) {
            console.log('📜 [RESTORE] Restoring historical session state');
            
            if (result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA] && result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]) {
                transcriptData = result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA];
                currentSessionId = result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID];
                
                exposeGlobalVariables();
                
                return {
                    restored: true,
                    realtimeMode: false,
                    sessionState: window.AppConstants.SESSION_STATES.HISTORICAL_SESSION,
                    transcriptData: transcriptData,
                    currentSessionId: currentSessionId
                };
            }
        }
        
        // DEPRECATED: Legacy restoration logic for old sessions without sessionState
        // Restore transcript data only for active recording or historical sessions
        if (result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA] && result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]) {
            const isActiveRecording = result[window.AppConstants.STORAGE_KEYS.REALTIME_MODE];
            
            // CRITICAL FIX: Use window.sessionHistory instead of local sessionHistory
            const isHistoricalSession = window.sessionHistory?.find(s => s.id === result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]);
            
            console.log('🔍 [RESTORE DEBUG] Legacy session lookup:', {
                sessionId: result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID],
                sessionHistoryLength: window.sessionHistory?.length || 0,
                isActiveRecording,
                foundHistoricalSession: !!isHistoricalSession
            });
            
            if (isActiveRecording || isHistoricalSession) {
                transcriptData = result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA];
                currentSessionId = result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID];
                
                // CRITICAL FIX: Expose global variables after state restoration
                exposeGlobalVariables();
                
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
    initialize() {
        console.log('🗂️ [STATE] StateManager initialized');
        
        // CRITICAL FIX: Only initialize empty globals, don't overwrite existing data
        // This prevents overwriting sessionHistory loaded by SessionHistoryManager
        initializeGlobalVariables();
        
        // State is managed through getters/setters and restored via restoreStateFromStorage()
    },
    restoreStateFromStorage,
    saveUIState,
    restoreUIState,
    exposeGlobalVariables,
    initializeGlobalVariables
};