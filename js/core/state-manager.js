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
    isRecordingPaused: false,    // Flag to track if recording is paused (vs completely stopped)
    isRestorationInProgress: false  // CRITICAL FIX: Flag to prevent duplicate sessions during state restoration
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
 * Set current session ID with proper persistence
 * @param {string} sessionId - Session identifier
 */
async function setCurrentSessionId(sessionId) {
    currentSessionId = sessionId;
    window.currentSessionId = sessionId;

    // CRITICAL FIX: Automatically save to storage when currentSessionId changes
    if (sessionId) {
        try {
            await window.StorageManager.setStorageData({
                [window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]: sessionId
            });
            console.log('🔄 [STATE DEBUG] currentSessionId saved to storage:', sessionId);
        } catch (error) {
            console.error('❌ [STATE] Failed to save currentSessionId:', sessionId, error);
            // Non-fatal - state is in memory, will retry on next operation
        }
    }
}

/**
 * Get current session ID
 * @returns {string} Current session identifier
 */
function getCurrentSessionId() {
    return currentSessionId;
}

// updateCurrentSessionId() method removed - use setCurrentSessionId() instead

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
 * Set restoration in progress flag
 * @param {boolean} inProgress - Whether state restoration is in progress
 */
function setRestorationInProgress(inProgress) {
    sessionState.isRestorationInProgress = inProgress;
}

/**
 * Get restoration in progress flag
 * @returns {boolean} Whether state restoration is in progress
 */
function isRestorationInProgress() {
    return sessionState.isRestorationInProgress;
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
            searchQuery: uiState.searchQuery || '',
            activeParticipantFilters: uiState.activeParticipantFilters || [],
            theme: uiState.theme || 'light',
            timestamp: Date.now()
        };
        
        await window.StorageManager.setStorageData({
            [window.AppConstants.STORAGE_KEYS.LAST_UI_STATE]: stateToSave,
            [window.AppConstants.STORAGE_KEYS.SIDEBAR_COLLAPSED]: stateToSave.sidebarCollapsed,
            [window.AppConstants.STORAGE_KEYS.SEARCH_PANEL_OPEN]: stateToSave.searchPanelOpen,
            [window.AppConstants.STORAGE_KEYS.FILTER_PANEL_OPEN]: stateToSave.filterPanelOpen,
            [window.AppConstants.STORAGE_KEYS.SEARCH_QUERY]: stateToSave.searchQuery,
            [window.AppConstants.STORAGE_KEYS.ACTIVE_PARTICIPANT_FILTERS]: stateToSave.activeParticipantFilters,
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
            window.AppConstants.STORAGE_KEYS.SEARCH_QUERY,
            window.AppConstants.STORAGE_KEYS.ACTIVE_PARTICIPANT_FILTERS,
            window.AppConstants.STORAGE_KEYS.THEME
        ]);
        
        // Use lastUIState if available, otherwise fallback to individual keys
        const uiState = result[window.AppConstants.STORAGE_KEYS.LAST_UI_STATE] || {
            sidebarCollapsed: result[window.AppConstants.STORAGE_KEYS.SIDEBAR_COLLAPSED] || false,
            searchPanelOpen: result[window.AppConstants.STORAGE_KEYS.SEARCH_PANEL_OPEN] || false,
            filterPanelOpen: result[window.AppConstants.STORAGE_KEYS.FILTER_PANEL_OPEN] || false,
            searchQuery: result[window.AppConstants.STORAGE_KEYS.SEARCH_QUERY] || '',
            activeParticipantFilters: result[window.AppConstants.STORAGE_KEYS.ACTIVE_PARTICIPANT_FILTERS] || [],
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
    
    // CRITICAL DEBUG: Log currentSessionId exposure
    console.log('🔄 [EXPOSE DEBUG] Exposing currentSessionId:', {
        localCurrentSessionId: currentSessionId,
        localCurrentSessionIdType: typeof currentSessionId,
        windowCurrentSessionId: window.currentSessionId,
        windowCurrentSessionIdType: typeof window.currentSessionId,
        successful: window.currentSessionId === currentSessionId
    });
    
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

// ========================================
// RESTORATION HELPER FUNCTIONS
// ========================================

/**
 * Load all required storage data for restoration
 * @private
 * @returns {Promise<Object>} Storage data object
 */
async function _loadStorageData() {
    return await window.StorageManager.getStorageData([
        window.AppConstants.STORAGE_KEYS.REALTIME_MODE,
        window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME,
        window.AppConstants.STORAGE_KEYS.SESSION_START_TIME,
        window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA,
        window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID,
        window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION,
        window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_DURATION,
        window.AppConstants.STORAGE_KEYS.MEET_TAB_ID,
        window.AppConstants.STORAGE_KEYS.SESSION_STATE,
        window.AppConstants.STORAGE_KEYS.RECORDING_PAUSED,
        window.AppConstants.STORAGE_KEYS.RECORDING_STOPPED
    ]);
}

/**
 * Check if storage contains an active recording
 * @private
 * @param {Object} result - Storage data
 * @returns {boolean} True if active recording
 */
function _isActiveRecording(result) {
    return !!result[window.AppConstants.STORAGE_KEYS.REALTIME_MODE];
}

/**
 * Check if storage contains a paused session
 * @private
 * @param {Object} result - Storage data
 * @returns {boolean} True if paused session
 */
function _isPausedSession(result) {
    return result[window.AppConstants.STORAGE_KEYS.SESSION_STATE] === window.AppConstants.SESSION_STATES.PAUSED_SESSION;
}

/**
 * Check if storage contains a historical session
 * @private
 * @param {Object} result - Storage data
 * @returns {boolean} True if historical session
 */
function _isHistoricalSession(result) {
    return result[window.AppConstants.STORAGE_KEYS.SESSION_STATE] === window.AppConstants.SESSION_STATES.HISTORICAL_SESSION;
}

/**
 * Restore active recording state
 * @private
 * @param {Object} result - Storage data
 * @returns {Promise<Object>} Restoration result
 */
async function _restoreActiveRecording(result) {
    console.log('🔄 [RESTORE] Restoring recording state');
    realtimeMode = true;

    // Restore transcript data
    if (result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA]) {
        transcriptData = result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA];
        console.log('🔄 [RESTORE] Restored transcript data:', transcriptData?.messages?.length || 0, 'messages');
    }

    // Restore recording start time with validation
    if (result[window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME]) {
        const timestamp = result[window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME];
        const date = new Date(timestamp);

        // Validate the date is valid
        if (!isNaN(date.getTime())) {
            sessionState.recordingStartTime = date;
            console.log('🔄 [RESTORE] Restored recording start time:', date.toISOString());
        } else {
            console.error('❌ [RESTORE] Invalid recordingStartTime timestamp:', timestamp);
            console.error('❌ [RESTORE] This will cause timer NaN - skipping restoration');
            // Don't set recordingStartTime - leave it undefined instead of Invalid Date
        }
    } else {
        console.log('ℹ️ [RESTORE] No recordingStartTime in storage (likely paused session)');
    }

    // Restore session start time with validation
    if (result[window.AppConstants.STORAGE_KEYS.SESSION_START_TIME]) {
        const timestamp = result[window.AppConstants.STORAGE_KEYS.SESSION_START_TIME];
        const date = new Date(timestamp);

        // Validate the date is valid
        if (!isNaN(date.getTime())) {
            sessionState.sessionStartTime = date;
            console.log('🔄 [RESTORE] Restored session start time:', date.toISOString());
        } else {
            console.error('❌ [RESTORE] Invalid sessionStartTime timestamp:', timestamp);
            // Don't set sessionStartTime - leave it undefined instead of Invalid Date
        }
    }

    // Restore or generate session ID
    if (result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]) {
        currentSessionId = result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID];
        console.log('🔄 [RESTORE DEBUG] Active recording - currentSessionId restored:', currentSessionId);
    } else {
        console.log('🔄 [RESTORE DEBUG] Active recording - No currentSessionId, generating new one');
        currentSessionId = window.generateSessionId ? window.generateSessionId() : 'session_' + Date.now();
        console.log('🔄 [RESTORE DEBUG] Generated new currentSessionId:', currentSessionId);

        // Save generated currentSessionId to storage
        try {
            await window.StorageManager.setStorageData({
                [window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]: currentSessionId
            });
            console.log('🔄 [RESTORE DEBUG] Saved generated currentSessionId to storage');
        } catch (error) {
            console.error('❌ [RESTORE] Failed to save generated currentSessionId:', error);
            // Continue restoration - ID is in memory
        }
    }

    // Restore session duration
    if (result[window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION]) {
        sessionState.totalDuration = result[window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION];
    }

    // Clear stale duration data
    await window.StorageManager.clearCurrentSessionDuration();

    // Reset recording flags
    sessionState.isRecordingStopped = false;
    sessionState.isRecordingPaused = false;

    // Expose global variables
    exposeGlobalVariables();
    setRestorationInProgress(false);
    console.log('🔄 [RESTORE] Restoration complete - active recording restored');

    return {
        restored: true,
        realtimeMode: true,
        meetTabId: result[window.AppConstants.STORAGE_KEYS.MEET_TAB_ID],
        transcriptData: result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA],
        currentSessionId: result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]
    };
}

/**
 * Restore paused session state
 * @private
 * @param {Object} result - Storage data
 * @returns {Object} Restoration result
 */
function _restorePausedSession(result) {
    console.log('⏸️ [RESTORE] Restoring paused session state');

    if (result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA] && result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]) {
        transcriptData = result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA];
        currentSessionId = result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID];
        console.log('🔄 [RESTORE DEBUG] Paused session - currentSessionId restored:', currentSessionId);

        // Restore timing data
        if (result[window.AppConstants.STORAGE_KEYS.SESSION_START_TIME]) {
            sessionState.sessionStartTime = new Date(result[window.AppConstants.STORAGE_KEYS.SESSION_START_TIME]);
        }
        if (result[window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION]) {
            sessionState.totalDuration = result[window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION];
        }

        // Restore pause/stop flags
        if (result[window.AppConstants.STORAGE_KEYS.RECORDING_PAUSED]) {
            sessionState.isRecordingPaused = result[window.AppConstants.STORAGE_KEYS.RECORDING_PAUSED];
            console.log('🔄 [RESTORE DEBUG] Paused session - recordingPaused flag restored:', sessionState.isRecordingPaused);
        }
        if (result[window.AppConstants.STORAGE_KEYS.RECORDING_STOPPED]) {
            sessionState.isRecordingStopped = result[window.AppConstants.STORAGE_KEYS.RECORDING_STOPPED];
            console.log('🔄 [RESTORE DEBUG] Paused session - recordingStopped flag restored:', sessionState.isRecordingStopped);
        }

        exposeGlobalVariables();
        setRestorationInProgress(false);
        console.log('🔄 [RESTORE] Restoration complete - paused session restored with resume capability');

        return {
            restored: true,
            realtimeMode: false,
            sessionState: window.AppConstants.SESSION_STATES.PAUSED_SESSION,
            transcriptData: transcriptData,
            currentSessionId: currentSessionId,
            sessionStartTime: result[window.AppConstants.STORAGE_KEYS.SESSION_START_TIME],
            sessionTotalDuration: result[window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION],
            recordingPaused: result[window.AppConstants.STORAGE_KEYS.RECORDING_PAUSED],
            recordingStopped: result[window.AppConstants.STORAGE_KEYS.RECORDING_STOPPED]
        };
    }

    return null;
}

/**
 * Restore historical session state
 * @private
 * @param {Object} result - Storage data
 * @returns {Object} Restoration result
 */
function _restoreHistoricalSession(result) {
    console.log('📜 [RESTORE] Restoring historical session state');

    if (result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA] && result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]) {
        transcriptData = result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA];
        currentSessionId = result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID];
        console.log('🔄 [RESTORE DEBUG] Historical session - currentSessionId restored:', currentSessionId);

        exposeGlobalVariables();
        setRestorationInProgress(false);
        console.log('🔄 [RESTORE] Restoration complete - historical session restored');

        return {
            restored: true,
            realtimeMode: false,
            sessionState: window.AppConstants.SESSION_STATES.HISTORICAL_SESSION,
            transcriptData: transcriptData,
            currentSessionId: currentSessionId
        };
    }

    return null;
}

/**
 * Restore state from storage - Main state restoration function
 * This was originally the restoreStateFromStorage function from popup.js (lines ~104-220)
 */
async function restoreStateFromStorage() {
    try {
        console.log('🔄 [RESTORE] Restoring state from storage');

        // Set restoration flag to prevent duplicate sessions
        setRestorationInProgress(true);
        console.log('🔄 [RESTORE] Restoration in progress flag set to true');

        // Load all storage data
        const result = await _loadStorageData();

        // Debug logging
        console.log('🔄 [RESTORE DEBUG] Storage contents:', {
            realtimeMode: result[window.AppConstants.STORAGE_KEYS.REALTIME_MODE],
            currentSessionId: result[window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID],
            hasTranscriptData: !!result[window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA],
            sessionState: result[window.AppConstants.STORAGE_KEYS.SESSION_STATE],
            meetTabId: result[window.AppConstants.STORAGE_KEYS.MEET_TAB_ID]
        });

        // Try restoration paths in priority order

        // Path 1: Active recording (highest priority)
        if (_isActiveRecording(result)) {
            return await _restoreActiveRecording(result);
        }

        // Path 2: Paused session
        if (_isPausedSession(result)) {
            const pausedResult = _restorePausedSession(result);
            if (pausedResult) return pausedResult;
        }

        // Path 3: Historical session
        if (_isHistoricalSession(result)) {
            const historicalResult = _restoreHistoricalSession(result);
            if (historicalResult) return historicalResult;
        }

        // No state to restore
        setRestorationInProgress(false);
        console.log('🔄 [RESTORE] Restoration complete - no state to restore');
        return { restored: false };
        
    } catch (error) {
        console.error('🔄 [RESTORE ERROR] Failed to restore state:', error);
        
        // CRITICAL FIX: Clear restoration flag on error
        setRestorationInProgress(false);
        console.log('🔄 [RESTORE] Restoration flag cleared due to error');
        
        return { restored: false, error: error };
    } finally {
        // CRITICAL FIX: Always clear restoration flag after ensuring sessionHistory is loaded
        // Use a polling approach to ensure sessionHistory is loaded before clearing flag
        const MAX_WAIT_TIME = window.AppConstants.TIMING.STATE_RESTORATION_MAX_WAIT;
        const CHECK_INTERVAL = window.AppConstants.TIMING.STATE_RESTORATION_CHECK_INTERVAL;
        const startTime = Date.now();
        let checkCount = 0;

        const checkSessionHistoryLoaded = () => {
            checkCount++;
            const elapsed = Date.now() - startTime;

            // TIMEOUT PROTECTION: Force unlock after configured max wait time
            if (elapsed > MAX_WAIT_TIME) {
                console.error(`⚠️ [RESTORE TIMEOUT] Forcing flag clear after ${MAX_WAIT_TIME}ms`);
                setRestorationInProgress(false);

                // EMERGENCY RECOVERY: Initialize empty sessionHistory if still undefined
                if (!window.sessionHistory || !Array.isArray(window.sessionHistory)) {
                    window.sessionHistory = [];
                    console.warn('⚠️ [EMERGENCY] Initialized empty sessionHistory after timeout');
                }
                return;
            }

            // Normal success path
            if (window.sessionHistory && Array.isArray(window.sessionHistory)) {
                setRestorationInProgress(false);
                console.log(`✅ [RESTORE] Flag cleared after ${elapsed}ms (${window.sessionHistory.length} sessions)`);
            } else {
                console.log(`⏳ [RESTORE] Attempt ${checkCount}: sessionHistory not loaded, checking again in ${CHECK_INTERVAL}ms`);
                setTimeout(checkSessionHistoryLoaded, CHECK_INTERVAL);
            }
        };

        // Start checking after initial delay
        setTimeout(checkSessionHistoryLoaded, 1000);
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
    setRestorationInProgress,
    isRestorationInProgress,
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
    initializeGlobalVariables,
    
    /**
     * Validate that state restoration was successful
     * Extracted from popup.js for better modularity
     * PHASE 5: Add state validation and recovery mechanisms
     */
    validateStateRestoration() {
        console.log('🔍 [VALIDATION] Validating state restoration success...');
        
        // Check global variables
        const globalVarsStatus = {
            transcriptData: !!window.transcriptData,
            realtimeMode: typeof window.realtimeMode === 'boolean',
            currentSessionId: typeof window.currentSessionId === 'string' || window.currentSessionId === null,
            sessionHistory: Array.isArray(window.sessionHistory),
            sessionHistoryLength: window.sessionHistory?.length || 0
        };
        
        // PHASE 5: Additional session validation
        if (window.sessionHistory && window.sessionHistory.length > 0) {
            console.log('📊 [VALIDATION] Session History Details:', {
                totalSessions: window.sessionHistory.length,
                sessionIdFormats: window.sessionHistory.slice(0, 3).map(s => ({
                    id: s.id,
                    idType: typeof s.id,
                    hasTitle: !!s.title,
                    hasTranscript: !!s.transcript
                })),
                allSessionIds: window.sessionHistory.map(s => s.id)
            });
        }
        
        // Check UI state
        const sidebar = document.querySelector('.sidebar');
        const uiStateStatus = {
            sidebarExists: !!sidebar,
            sidebarCollapsed: sidebar?.classList.contains('collapsed') || false,
            theme: document.documentElement.getAttribute('data-theme') || 'light'
        };
        
        // Check if we have an active session
        const hasActiveSession = window.transcriptData || window.realtimeMode;
        
        // Log validation results
        console.log('✅ [VALIDATION] Global variables status:', globalVarsStatus);
        console.log('✅ [VALIDATION] UI state status:', uiStateStatus);
        console.log('✅ [VALIDATION] Has active session:', hasActiveSession);
        
        // Provide user feedback based on restored state
        if (window.realtimeMode) {
            console.log('🔴 [VALIDATION] Recording mode restored - background recording should be active');
        } else if (window.transcriptData) {
            console.log('📜 [VALIDATION] Historical session restored - transcript data available');
        } else {
            console.log('🆕 [VALIDATION] No session restored - starting with clean state');
        }
        
        // Recovery mechanism for broken UI state
        if (!sidebar) {
            console.warn('⚠️ [RECOVERY] Sidebar element not found - UI may be broken');
        }
        
        console.log('✅ [VALIDATION] State restoration validation complete');
        
        return {
            globalVars: globalVarsStatus,
            uiState: uiStateStatus,
            hasActiveSession,
            sidebar: !!sidebar
        };
    }
};