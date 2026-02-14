/**
 * State Manager - Manages all global application state
 * Centralizes global variables and state management functions
 */

let transcriptData = null;
let realtimeMode = false;
let realtimeInterval = null;
let currentSessionId = null;
let durationTimer = null;
let expandedEntries = new Set();
let currentSearchQuery = '';
let searchDebounceTimer = null;
let originalMessages = [];
let activeParticipantFilters = new Set();
let allParticipants = [];

let sessionState = {
    recordingStartTime: null,
    sessionStartTime: null,
    totalDuration: 0,
    isRecordingStopped: false,
    isRecordingPaused: false,
    isRestorationInProgress: false
};

function setTranscriptData(data) {
    transcriptData = data;
}

function getTranscriptData() {
    return transcriptData;
}

function setRealtimeMode(active) {
    realtimeMode = active;
}

function getRealtimeMode() {
    return realtimeMode;
}

/**
 * Set current session ID with automatic persistence to storage
 */
async function setCurrentSessionId(sessionId) {
    currentSessionId = sessionId;
    window.currentSessionId = sessionId;

    if (sessionId) {
        try {
            await window.StorageManager.setStorageData({
                [window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]: sessionId
            });
            console.log('🔄 [STATE] currentSessionId saved to storage:', sessionId);
        } catch (error) {
            console.error('❌ [STATE] Failed to save currentSessionId:', sessionId, error);
        }
    }
}

function getCurrentSessionId() {
    return currentSessionId;
}

function setRecordingStartTime(startTime) {
    sessionState.recordingStartTime = startTime;
}

function getRecordingStartTime() {
    return sessionState.recordingStartTime;
}

function setSessionStartTime(startTime) {
    sessionState.sessionStartTime = startTime;
}

function getSessionStartTime() {
    return sessionState.sessionStartTime;
}

function setSessionTotalDuration(duration) {
    sessionState.totalDuration = duration;
}

function getSessionTotalDuration() {
    return sessionState.totalDuration;
}

function setRecordingStopped(stopped) {
    sessionState.isRecordingStopped = stopped;
}

function getRecordingStopped() {
    return sessionState.isRecordingStopped;
}

function setRecordingPaused(paused) {
    sessionState.isRecordingPaused = paused;
}

function getRecordingPaused() {
    return sessionState.isRecordingPaused;
}

function setRestorationInProgress(inProgress) {
    sessionState.isRestorationInProgress = inProgress;
}

function isRestorationInProgress() {
    return sessionState.isRestorationInProgress;
}

function setDurationTimer(timer) {
    durationTimer = timer;
}

function getDurationTimer() {
    return durationTimer;
}

function clearDurationTimer() {
    if (durationTimer) {
        clearInterval(durationTimer);
        durationTimer = null;
    }
}

function setRealtimeInterval(interval) {
    realtimeInterval = interval;
}

function getRealtimeInterval() {
    return realtimeInterval;
}

function clearRealtimeInterval() {
    if (realtimeInterval) {
        clearInterval(realtimeInterval);
        realtimeInterval = null;
    }
}

/**
 * Save UI state to storage (both as consolidated object and individual keys)
 */
async function saveUIState(uiState) {
    try {
        const KEYS = window.AppConstants.STORAGE_KEYS;
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
            [KEYS.LAST_UI_STATE]: stateToSave,
            [KEYS.SIDEBAR_COLLAPSED]: stateToSave.sidebarCollapsed,
            [KEYS.SEARCH_PANEL_OPEN]: stateToSave.searchPanelOpen,
            [KEYS.FILTER_PANEL_OPEN]: stateToSave.filterPanelOpen,
            [KEYS.SEARCH_QUERY]: stateToSave.searchQuery,
            [KEYS.ACTIVE_PARTICIPANT_FILTERS]: stateToSave.activeParticipantFilters,
            [KEYS.THEME]: stateToSave.theme
        });

        console.log('💾 [UI STATE] Saved UI state:', stateToSave);
    } catch (error) {
        console.error('💾 [UI STATE] Failed to save UI state:', error);
    }
}

/**
 * Restore UI state from storage, falling back to individual keys if consolidated state is missing
 */
async function restoreUIState() {
    const DEFAULT_UI_STATE = {
        sidebarCollapsed: false,
        searchPanelOpen: false,
        filterPanelOpen: false,
        searchQuery: '',
        activeParticipantFilters: [],
        theme: 'light'
    };

    try {
        const KEYS = window.AppConstants.STORAGE_KEYS;
        const result = await window.StorageManager.getStorageData([
            KEYS.LAST_UI_STATE,
            KEYS.SIDEBAR_COLLAPSED,
            KEYS.SEARCH_PANEL_OPEN,
            KEYS.FILTER_PANEL_OPEN,
            KEYS.SEARCH_QUERY,
            KEYS.ACTIVE_PARTICIPANT_FILTERS,
            KEYS.THEME
        ]);

        const uiState = result[KEYS.LAST_UI_STATE] || {
            sidebarCollapsed: result[KEYS.SIDEBAR_COLLAPSED] || false,
            searchPanelOpen: result[KEYS.SEARCH_PANEL_OPEN] || false,
            filterPanelOpen: result[KEYS.FILTER_PANEL_OPEN] || false,
            searchQuery: result[KEYS.SEARCH_QUERY] || '',
            activeParticipantFilters: result[KEYS.ACTIVE_PARTICIPANT_FILTERS] || [],
            theme: result[KEYS.THEME] || 'light'
        };

        console.log('🔄 [UI STATE] Restored UI state:', uiState);
        return uiState;
    } catch (error) {
        console.error('🔄 [UI STATE] Failed to restore UI state:', error);
        return DEFAULT_UI_STATE;
    }
}

/**
 * Initialize global variables without overwriting existing data
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
    
    // Never overwrite sessionHistory if it already exists
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
 */
function exposeGlobalVariables() {
    window.transcriptData = transcriptData;
    window.realtimeMode = realtimeMode;
    window.currentSessionId = currentSessionId;

    // Preserve existing sessionHistory to prevent overwriting loaded data
    if (!window.sessionHistory || window.sessionHistory.length === 0) {
        window.sessionHistory = window.sessionHistory || [];
    }

    window.expandedEntries = expandedEntries;
    window.currentSearchQuery = currentSearchQuery;
    window.originalMessages = originalMessages;
    window.activeParticipantFilters = activeParticipantFilters;
    window.allParticipants = allParticipants;

    console.log('🌐 [STATE] Global variables exposed:', {
        hasTranscriptData: !!window.transcriptData,
        realtimeMode: window.realtimeMode,
        currentSessionId: window.currentSessionId,
        sessionHistoryLength: window.sessionHistory?.length || 0
    });
}

// ========================================
// RESTORATION HELPER FUNCTIONS
// ========================================

function _loadStorageData() {
    const KEYS = window.AppConstants.STORAGE_KEYS;
    return window.StorageManager.getStorageData([
        KEYS.REALTIME_MODE,
        KEYS.RECORDING_START_TIME,
        KEYS.SESSION_START_TIME,
        KEYS.TRANSCRIPT_DATA,
        KEYS.CURRENT_SESSION_ID,
        KEYS.SESSION_TOTAL_DURATION,
        KEYS.CURRENT_SESSION_DURATION,
        KEYS.MEET_TAB_ID,
        KEYS.SESSION_STATE,
        KEYS.RECORDING_PAUSED,
        KEYS.RECORDING_STOPPED
    ]);
}

function _isActiveRecording(result) {
    return !!result[window.AppConstants.STORAGE_KEYS.REALTIME_MODE];
}

function _isPausedSession(result) {
    return result[window.AppConstants.STORAGE_KEYS.SESSION_STATE] === window.AppConstants.SESSION_STATES.PAUSED_SESSION;
}

function _isHistoricalSession(result) {
    return result[window.AppConstants.STORAGE_KEYS.SESSION_STATE] === window.AppConstants.SESSION_STATES.HISTORICAL_SESSION;
}

/**
 * Parse a timestamp from storage into a valid Date, or return null
 */
function _parseValidDate(timestamp) {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Restore recording start time with fallback regeneration from duration or session start
 */
function _restoreRecordingStartTime(result) {
    const KEYS = window.AppConstants.STORAGE_KEYS;
    const rawTimestamp = result[KEYS.RECORDING_START_TIME];

    if (!rawTimestamp) {
        console.log('ℹ️ [RESTORE] No recordingStartTime in storage (likely paused session)');
        return;
    }

    const date = _parseValidDate(rawTimestamp);
    if (date) {
        sessionState.recordingStartTime = date;
        console.log('🔄 [RESTORE] Restored recording start time:', date.toISOString());
        return;
    }

    // Invalid date -- attempt regeneration from available data
    console.error('❌ [RESTORE] Invalid recordingStartTime timestamp:', rawTimestamp);

    const totalDuration = result[KEYS.SESSION_TOTAL_DURATION];
    if (totalDuration > 0) {
        const regenerated = new Date(Date.now() - (totalDuration * 1000));
        sessionState.recordingStartTime = regenerated;
        console.warn('⚠️ [RESTORE] Regenerated recordingStartTime from sessionTotalDuration:', regenerated.toISOString());
        return;
    }

    const sessionStartDate = _parseValidDate(result[KEYS.SESSION_START_TIME]);
    if (sessionStartDate) {
        sessionState.recordingStartTime = sessionStartDate;
        console.warn('⚠️ [RESTORE] Regenerated recordingStartTime from sessionStartTime:', sessionStartDate.toISOString());
    } else {
        console.error('❌ [RESTORE] Cannot regenerate recordingStartTime - no valid fallback available');
    }
}

/**
 * Restore active recording state from storage data
 */
async function _restoreActiveRecording(result) {
    const KEYS = window.AppConstants.STORAGE_KEYS;
    console.log('🔄 [RESTORE] Restoring recording state');
    realtimeMode = true;

    if (result[KEYS.TRANSCRIPT_DATA]) {
        transcriptData = result[KEYS.TRANSCRIPT_DATA];
        console.log('🔄 [RESTORE] Restored transcript data:', transcriptData?.messages?.length || 0, 'messages');
    }

    _restoreRecordingStartTime(result);

    // Restore session start time with validation
    const sessionStartDate = _parseValidDate(result[KEYS.SESSION_START_TIME]);
    if (sessionStartDate) {
        sessionState.sessionStartTime = sessionStartDate;
        console.log('🔄 [RESTORE] Restored session start time:', sessionStartDate.toISOString());
    } else if (result[KEYS.SESSION_START_TIME]) {
        console.error('❌ [RESTORE] Invalid sessionStartTime timestamp:', result[KEYS.SESSION_START_TIME]);
    }

    // Restore or generate session ID
    if (result[KEYS.CURRENT_SESSION_ID]) {
        currentSessionId = result[KEYS.CURRENT_SESSION_ID];
        console.log('🔄 [RESTORE] Active recording - currentSessionId restored:', currentSessionId);
    } else {
        currentSessionId = window.generateSessionId ? window.generateSessionId() : 'session_' + Date.now();
        console.log('🔄 [RESTORE] Generated new currentSessionId:', currentSessionId);

        try {
            await window.StorageManager.setStorageData({
                [KEYS.CURRENT_SESSION_ID]: currentSessionId
            });
        } catch (error) {
            console.error('❌ [RESTORE] Failed to save generated currentSessionId:', error);
        }
    }

    if (result[KEYS.SESSION_TOTAL_DURATION]) {
        sessionState.totalDuration = result[KEYS.SESSION_TOTAL_DURATION];
    }

    await window.StorageManager.clearCurrentSessionDuration();

    sessionState.isRecordingStopped = false;
    sessionState.isRecordingPaused = false;

    exposeGlobalVariables();
    setRestorationInProgress(false);
    console.log('🔄 [RESTORE] Restoration complete - active recording restored');

    return {
        restored: true,
        realtimeMode: true,
        meetTabId: result[KEYS.MEET_TAB_ID],
        transcriptData: result[KEYS.TRANSCRIPT_DATA],
        currentSessionId: result[KEYS.CURRENT_SESSION_ID]
    };
}

/**
 * Restore paused session state from storage data
 */
function _restorePausedSession(result) {
    const KEYS = window.AppConstants.STORAGE_KEYS;
    console.log('⏸️ [RESTORE] Restoring paused session state');

    if (!result[KEYS.TRANSCRIPT_DATA] || !result[KEYS.CURRENT_SESSION_ID]) {
        return null;
    }

    transcriptData = result[KEYS.TRANSCRIPT_DATA];
    currentSessionId = result[KEYS.CURRENT_SESSION_ID];
    console.log('🔄 [RESTORE] Paused session - currentSessionId restored:', currentSessionId);

    if (result[KEYS.SESSION_START_TIME]) {
        sessionState.sessionStartTime = new Date(result[KEYS.SESSION_START_TIME]);
    }
    if (result[KEYS.SESSION_TOTAL_DURATION]) {
        sessionState.totalDuration = result[KEYS.SESSION_TOTAL_DURATION];
    }
    if (result[KEYS.RECORDING_PAUSED]) {
        sessionState.isRecordingPaused = result[KEYS.RECORDING_PAUSED];
    }
    if (result[KEYS.RECORDING_STOPPED]) {
        sessionState.isRecordingStopped = result[KEYS.RECORDING_STOPPED];
    }

    exposeGlobalVariables();
    setRestorationInProgress(false);
    console.log('🔄 [RESTORE] Restoration complete - paused session restored');

    return {
        restored: true,
        realtimeMode: false,
        sessionState: window.AppConstants.SESSION_STATES.PAUSED_SESSION,
        transcriptData,
        currentSessionId,
        sessionStartTime: result[KEYS.SESSION_START_TIME],
        sessionTotalDuration: result[KEYS.SESSION_TOTAL_DURATION],
        recordingPaused: result[KEYS.RECORDING_PAUSED],
        recordingStopped: result[KEYS.RECORDING_STOPPED]
    };
}

/**
 * Restore historical session state from storage data
 */
function _restoreHistoricalSession(result) {
    const KEYS = window.AppConstants.STORAGE_KEYS;
    console.log('📜 [RESTORE] Restoring historical session state');

    if (!result[KEYS.TRANSCRIPT_DATA] || !result[KEYS.CURRENT_SESSION_ID]) {
        return null;
    }

    transcriptData = result[KEYS.TRANSCRIPT_DATA];
    currentSessionId = result[KEYS.CURRENT_SESSION_ID];
    console.log('🔄 [RESTORE] Historical session - currentSessionId restored:', currentSessionId);

    exposeGlobalVariables();
    setRestorationInProgress(false);
    console.log('🔄 [RESTORE] Restoration complete - historical session restored');

    return {
        restored: true,
        realtimeMode: false,
        sessionState: window.AppConstants.SESSION_STATES.HISTORICAL_SESSION,
        transcriptData,
        currentSessionId
    };
}

/**
 * Restore state from storage - Main state restoration function
 * Tries restoration paths in priority order: active recording > paused > historical
 */
async function restoreStateFromStorage() {
    try {
        console.log('🔄 [RESTORE] Restoring state from storage');
        setRestorationInProgress(true);

        const result = await _loadStorageData();
        const KEYS = window.AppConstants.STORAGE_KEYS;

        console.log('🔄 [RESTORE] Storage contents:', {
            realtimeMode: result[KEYS.REALTIME_MODE],
            currentSessionId: result[KEYS.CURRENT_SESSION_ID],
            hasTranscriptData: !!result[KEYS.TRANSCRIPT_DATA],
            sessionState: result[KEYS.SESSION_STATE],
            meetTabId: result[KEYS.MEET_TAB_ID]
        });

        if (_isActiveRecording(result)) {
            return await _restoreActiveRecording(result);
        }

        if (_isPausedSession(result)) {
            const pausedResult = _restorePausedSession(result);
            if (pausedResult) return pausedResult;
        }

        if (_isHistoricalSession(result)) {
            const historicalResult = _restoreHistoricalSession(result);
            if (historicalResult) return historicalResult;
        }

        setRestorationInProgress(false);
        console.log('🔄 [RESTORE] Restoration complete - no state to restore');
        return { restored: false };

    } catch (error) {
        console.error('🔄 [RESTORE] Failed to restore state:', error);
        setRestorationInProgress(false);
        return { restored: false, error };
    } finally {
        // Poll until sessionHistory is loaded, then clear the restoration flag
        const MAX_WAIT_TIME = window.AppConstants.TIMING.STATE_RESTORATION_MAX_WAIT;
        const CHECK_INTERVAL = window.AppConstants.TIMING.STATE_RESTORATION_CHECK_INTERVAL;
        const startTime = Date.now();

        const checkSessionHistoryLoaded = () => {
            const elapsed = Date.now() - startTime;

            if (elapsed > MAX_WAIT_TIME) {
                console.error(`⚠️ [RESTORE] Forcing flag clear after ${MAX_WAIT_TIME}ms timeout`);
                setRestorationInProgress(false);
                if (!Array.isArray(window.sessionHistory)) {
                    window.sessionHistory = [];
                    console.warn('⚠️ [RESTORE] Initialized empty sessionHistory after timeout');
                }
                return;
            }

            if (Array.isArray(window.sessionHistory)) {
                setRestorationInProgress(false);
                console.log(`✅ [RESTORE] Flag cleared after ${elapsed}ms (${window.sessionHistory.length} sessions)`);
            } else {
                setTimeout(checkSessionHistoryLoaded, CHECK_INTERVAL);
            }
        };

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

        // Only initialize empty globals, don't overwrite existing data
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
     */
    validateStateRestoration() {
        const sidebar = document.querySelector('.sidebar');
        const hasActiveSession = !!(window.transcriptData || window.realtimeMode);

        const globalVarsStatus = {
            transcriptData: !!window.transcriptData,
            realtimeMode: typeof window.realtimeMode === 'boolean',
            currentSessionId: typeof window.currentSessionId === 'string' || window.currentSessionId === null,
            sessionHistory: Array.isArray(window.sessionHistory),
            sessionHistoryLength: window.sessionHistory?.length || 0
        };

        const uiStateStatus = {
            sidebarExists: !!sidebar,
            sidebarCollapsed: sidebar?.classList.contains('collapsed') || false,
            theme: document.documentElement.getAttribute('data-theme') || 'light'
        };

        console.log('✅ [VALIDATION] State restoration:', {
            globalVars: globalVarsStatus,
            uiState: uiStateStatus,
            hasActiveSession
        });

        if (!sidebar) {
            console.warn('⚠️ [VALIDATION] Sidebar element not found - UI may be broken');
        }

        return {
            globalVars: globalVarsStatus,
            uiState: uiStateStatus,
            hasActiveSession,
            sidebar: !!sidebar
        };
    }
};