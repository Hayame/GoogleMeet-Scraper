/**
 * Constants and configuration values for the Google Meet Transcript Scraper
 */

// Timing constants
const TIMING = {
    DURATION_UPDATE_INTERVAL: 1000, // Update duration display every second
    SESSION_SAVE_DELAY: 2000, // Delay before saving session to prevent rapid saves
    URL_REVOKE_DELAY: 1000, // Delay before revoking object URL after download
    DEBOUNCE_DELAY: 300 // General debounce delay for user interactions
};

// Storage keys used throughout the application
const STORAGE_KEYS = {
    TRANSCRIPT_DATA: 'transcriptData',
    REALTIME_MODE: 'realtimeMode',
    CURRENT_SESSION_ID: 'currentSessionId',
    RECORDING_START_TIME: 'recordingStartTime',
    SESSION_START_TIME: 'sessionStartTime',
    SESSION_TOTAL_DURATION: 'sessionTotalDuration',
    CURRENT_SESSION_DURATION: 'currentSessionDuration',
    MEET_TAB_ID: 'meetTabId',
    SESSION_HISTORY: 'sessionHistory',
    EXPANDED_ENTRIES: 'expandedEntries',
    THEME: 'theme',
    SIDEBAR_COLLAPSED: 'sidebarCollapsed',
    SEARCH_PANEL_OPEN: 'searchPanelOpen',
    FILTER_PANEL_OPEN: 'filterPanelOpen',
    SEARCH_QUERY: 'searchQuery',
    ACTIVE_PARTICIPANT_FILTERS: 'activeParticipantFilters',
    LAST_UI_STATE: 'lastUIState',
    SESSION_STATE: 'sessionState',
    RECORDING_PAUSED: 'recordingPaused',
    RECORDING_STOPPED: 'recordingStopped'
};

// Application states
const APP_STATES = {
    RECORDING: 'recording',
    STOPPED: 'stopped',
    PAUSED: 'paused'
};

// Session states for popup restoration
const SESSION_STATES = {
    ACTIVE_RECORDING: 'active_recording',
    PAUSED_SESSION: 'paused_session', 
    HISTORICAL_SESSION: 'historical_session',
    NEW_SESSION: 'new_session'
};

// Export format types
const EXPORT_FORMATS = {
    TXT: 'txt'
};

// Theme options
const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto'
};

// Debug logging levels
const LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
};

// Debug configuration - Global console.log control
// Aby włączyć logi debugowania, zmień ENABLE_CONSOLE_LOGS na true
const DEBUG_CONFIG = {
    ENABLE_CONSOLE_LOGS: false, // Zmień na true aby włączyć wszystkie logi
    LOG_LEVELS: {
        ERROR: true,   // Zawsze pokazuj błędy
        WARN: true,    // Zawsze pokazuj ostrzeżenia  
        INFO: false,   // Ukryj logi informacyjne
        DEBUG: false   // Ukryj logi debugowania
    }
};

// Console override is now handled by debug-config.js (loaded first in all contexts)

// Export all constants
window.AppConstants = {
    TIMING,
    STORAGE_KEYS,
    APP_STATES,
    SESSION_STATES,
    EXPORT_FORMATS,
    THEMES,
    LOG_LEVELS,
    DEBUG_CONFIG
};