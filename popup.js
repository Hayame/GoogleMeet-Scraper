/**
 * Google Meet Transcript Scraper - Main Entry Point
 * Modularized version using extracted components
 */

// Main initialization function
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🚀 [INIT] Initializing Google Meet Transcript Scraper');
        
        // Check for essential DOM elements
        validateEssentialElements();
        
        // Initialize all modules in the correct order
        await initializeApplication();
        
        console.log('✅ [INIT] Application initialized successfully');
        
    } catch (error) {
        console.error('❌ [INIT] Critical initialization error:', error);
        showInitializationError(error);
    }
});

/**
 * Validate that critical global functions are available
 * CRITICAL FIX: Ensure all required functions exist before state restoration
 */
function validateGlobalFunctions() {
    const requiredFunctions = [
        'displayTranscript',
        'updateStats', 
        'detectChanges',
        'showEmptySession',
        'createNewSession'
    ];
    
    const missingFunctions = requiredFunctions.filter(funcName => typeof window[funcName] !== 'function');
    
    if (missingFunctions.length > 0) {
        console.error('❌ [VALIDATION] Missing global functions:', missingFunctions);
        throw new Error(`Critical global functions missing: ${missingFunctions.join(', ')}`);
    }
    
    console.log('✅ [VALIDATION] All critical global functions available');
}

/**
 * Validate that essential DOM elements are present
 */
function validateEssentialElements() {
    const essentialElements = [
        { id: 'recordBtn', name: 'Record button' },
        { id: 'recordingStatus', name: 'Status div' },
        { id: 'transcriptContent', name: 'Transcript content' },
        { id: 'transcriptStats', name: 'Transcript stats' }
    ];
    
    for (const element of essentialElements) {
        if (!document.getElementById(element.id)) {
            throw new Error(`${element.name} not found (ID: ${element.id})`);
        }
    }
}

/**
 * Initialize all application modules in the correct order
 */
async function initializeApplication() {
    console.log('🚀 [INIT] Starting application initialization sequence...');
    
    // 1. Initialize storage management first
    if (window.StorageManager) {
        window.StorageManager.initialize();
        console.log('✅ Storage Manager initialized');
    } else {
        throw new Error('StorageManager not found');
    }
    
    // 2. Initialize core state management
    if (window.StateManager) {
        window.StateManager.initialize();
        console.log('✅ State Manager initialized');
    } else {
        throw new Error('StateManager not found');
    }
    
    // 3. Initialize UI management
    if (window.UIManager) {
        window.UIManager.initialize();
        console.log('✅ UI Manager initialized');
    }
    
    // 4. Initialize timer management
    if (window.TimerManager) {
        window.TimerManager.initialize();
        console.log('✅ Timer Manager initialized');
    }
    
    // 5. Initialize modal system
    if (window.ModalManager) {
        window.ModalManager.initialize();
        console.log('✅ Modal Manager initialized');
    }
    
    // 6. Initialize background scanner
    if (window.BackgroundScanner) {
        window.BackgroundScanner.initialize();
        console.log('✅ Background Scanner initialized');
    }
    
    // 7. Initialize recording management
    if (window.RecordingManager) {
        window.RecordingManager.initialize();
        console.log('✅ Recording Manager initialized');
    }
    
    // 8. Initialize session history (CRITICAL: Must await before state restoration)
    if (window.SessionHistoryManager && window.SessionUIManager) {
        await window.SessionHistoryManager.initialize();
        window.SessionUIManager.initialize();
        console.log('✅ Session History initialized');
    }
    
    // 9. Initialize transcript features
    if (window.TranscriptManager) {
        window.TranscriptManager.initialize();
        console.log('✅ Transcript Manager initialized');
    }
    
    // 10. Initialize search and filter
    if (window.SearchFilterManager) {
        window.SearchFilterManager.initialize();
        console.log('✅ Search Filter Manager initialized');
    }
    
    // 11. Initialize export functionality
    if (window.ExportManager) {
        window.ExportManager.initialize();
        console.log('✅ Export Manager initialized');
    }
    
    // 12. Setup main event listeners
    setupMainEventListeners();
    
    // 13. Initialize theme system
    initializeTheme();
    
    // 14. Validate critical global functions before state restoration
    validateGlobalFunctions();
    
    // 15. Restore application state
    await restoreCompleteApplicationState();
    
    // 16. Validate state restoration success
    validateStateRestorationSuccess();
}

/**
 * Validate that state restoration was successful
 * PHASE 5: Add state validation and recovery mechanisms
 */
function validateStateRestorationSuccess() {
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
}

/**
 * Restore complete application state including UI and session data
 */
async function restoreCompleteApplicationState() {
    try {
        console.log('🔄 [POPUP] Starting complete state restoration');
        
        // 1. Restore session/recording state
        const sessionState = await window.StateManager.restoreStateFromStorage();
        
        // 2. Restore UI state (sidebar, theme, search, filters)
        const uiState = await window.StateManager.restoreUIState();
        
        // 3. Apply UI state restoration with error handling
        try {
            await applyUIStateRestoration(uiState);
        } catch (uiError) {
            console.error('❌ [RECOVERY] UI state restoration failed:', uiError);
            console.log('🔧 [RECOVERY] Applying fallback UI state');
            // Fallback: ensure basic UI state
            document.documentElement.setAttribute('data-theme', 'light');
        }
        
        // 4. Apply session state restoration with error handling
        try {
            await applySessionStateRestoration(sessionState);
        } catch (sessionError) {
            console.error('❌ [RECOVERY] Session state restoration failed:', sessionError);
            console.log('🔧 [RECOVERY] Ensuring clean session state');
            // Fallback: ensure clean state
            if (window.StateManager) {
                window.StateManager.exposeGlobalVariables();
            }
        }
        
        console.log('✅ [POPUP] Complete state restoration finished', { sessionState, uiState });
        
    } catch (error) {
        console.error('❌ [POPUP] Critical state restoration failure:', error);
        console.log('🔧 [RECOVERY] Attempting emergency recovery');
        
        // Emergency recovery: ensure basic functionality
        try {
            if (window.StateManager) {
                window.StateManager.exposeGlobalVariables();
            }
            document.documentElement.setAttribute('data-theme', 'light');
            console.log('✅ [RECOVERY] Emergency recovery completed');
        } catch (recoveryError) {
            console.error('💥 [RECOVERY] Emergency recovery failed:', recoveryError);
        }
    }
}

/**
 * Apply UI state restoration (sidebar, theme, search panels)
 */
async function applyUIStateRestoration(uiState) {
    console.log('🎨 [POPUP] Applying UI state restoration:', uiState);
    
    // Use centralized UIManager for consistent state restoration
    if (window.UIManager && window.UIManager.restoreUIState) {
        window.UIManager.restoreUIState(uiState);
    } else {
        console.warn('⚠️ [POPUP] UIManager not available for state restoration');
    }
}

/**
 * Apply session state restoration (recording, transcript, UI buttons)
 */
async function applySessionStateRestoration(sessionState) {
    if (!sessionState.restored) {
        console.log('🔄 [POPUP] No session state to restore');
        return;
    }
    
    console.log('📊 [POPUP] Applying session state restoration:', sessionState);
    
    if (sessionState.realtimeMode) {
        // Restore active recording state
        console.log('🔴 [POPUP] Restoring active recording state');
        
        // CRITICAL FIX: Display transcript data for active recording
        // This was missing and caused empty chat during recording restoration
        if (sessionState.transcriptData && window.displayTranscript) {
            window.displayTranscript(sessionState.transcriptData);
            console.log('🔴 [POPUP] Restored transcript data for recording:', sessionState.transcriptData.messages?.length || 0, 'messages');
        }
        
        // Update stats for recording session
        if (sessionState.transcriptData && window.updateStats) {
            window.updateStats(sessionState.transcriptData);
        }
        
        // CRITICAL FIX: Update participant count clickability after stats update
        if (sessionState.transcriptData && window.TranscriptManager && window.TranscriptManager.updateParticipantCountClickability) {
            const uniqueParticipants = new Set(sessionState.transcriptData.messages?.map(m => m.speaker) || []).size;
            window.TranscriptManager.updateParticipantCountClickability(uniqueParticipants);
        }
        
        // Update UI for recording state
        if (window.UIManager) {
            window.UIManager.updateButtonVisibility('RECORDING');
        }
        
        // Restart background scanner communication
        if (window.BackgroundScanner && window.BackgroundScanner.reactivateAfterRestore) {
            window.BackgroundScanner.reactivateAfterRestore();
        }
        
        // Restart duration timer if TimerManager exists
        if (window.TimerManager && window.TimerManager.startDurationTimer) {
            window.TimerManager.startDurationTimer();
        }
        
    } else if (sessionState.sessionState === window.AppConstants.SESSION_STATES.PAUSED_SESSION) {
        // CRITICAL FIX: Restore paused session - show transcript + "Rozpocznij nagrywanie" button
        console.log('⏸️ [POPUP] Restoring paused session');
        
        // Display transcript data for paused session
        if (sessionState.transcriptData && window.displayTranscript) {
            window.displayTranscript(sessionState.transcriptData);
            console.log('⏸️ [POPUP] Restored transcript data for paused session:', sessionState.transcriptData.messages?.length || 0, 'messages');
        }
        
        // Update stats for paused session
        if (sessionState.transcriptData && window.updateStats) {
            window.updateStats(sessionState.transcriptData);
        }
        
        // CRITICAL FIX: Update participant count clickability after stats update
        if (sessionState.transcriptData && window.TranscriptManager && window.TranscriptManager.updateParticipantCountClickability) {
            const uniqueParticipants = new Set(sessionState.transcriptData.messages?.map(m => m.speaker) || []).size;
            window.TranscriptManager.updateParticipantCountClickability(uniqueParticipants);
        }
        
        // CRITICAL: Update UI for paused session (show "Rozpocznij nagrywanie" button)
        if (window.UIManager) {
            window.UIManager.updateButtonVisibility('NEW');
        }
        
        // Restore session duration display if available
        if (sessionState.sessionTotalDuration && window.TimerManager) {
            // Set the accumulated duration
            window.StateManager?.setSessionTotalDuration(sessionState.sessionTotalDuration);
            if (window.TimerManager.updateDurationDisplay) {
                window.TimerManager.updateDurationDisplay(sessionState.sessionTotalDuration);
            }
        }
        
        console.log('⏸️ [POPUP] Paused session restored with "Rozpocznij nagrywanie" button');
        
    } else if (sessionState.transcriptData && sessionState.currentSessionId) {
        // Restore historical session
        console.log('📜 [POPUP] Restoring historical session');
        
        // Display transcript data
        if (window.displayTranscript) {
            window.displayTranscript(sessionState.transcriptData);
        }
        
        // Update stats
        if (window.updateStats) {
            window.updateStats(sessionState.transcriptData);
        }
        
        // CRITICAL FIX: Update participant count clickability after stats update
        if (sessionState.transcriptData && window.TranscriptManager && window.TranscriptManager.updateParticipantCountClickability) {
            const uniqueParticipants = new Set(sessionState.transcriptData.messages?.map(m => m.speaker) || []).size;
            window.TranscriptManager.updateParticipantCountClickability(uniqueParticipants);
        }
        
        // Update UI for historical session
        if (window.UIManager) {
            window.UIManager.updateButtonVisibility('HISTORICAL');
            
            // Show meeting name if session exists in history
            const session = window.sessionHistory?.find(s => s.id === sessionState.currentSessionId);
            if (session) {
                window.UIManager.showMeetingName(session.title, sessionState.currentSessionId);
            }
        }
        
        // Highlight restored session in sidebar
        if (window.SessionUIManager && window.SessionUIManager.highlightActiveSession) {
            window.SessionUIManager.highlightActiveSession(sessionState.currentSessionId);
        }
    }
}

/**
 * Setup main application event listeners
 */
function setupMainEventListeners() {
    // Record button click handler
    const recordBtn = document.getElementById('recordBtn');
    if (recordBtn && window.RecordingManager) {
        recordBtn.addEventListener('click', window.RecordingManager.handleRecordButtonClick.bind(window.RecordingManager));
    }
    
    // Close session button handler
    const closeSessionBtn = document.getElementById('closeSessionBtn');
    if (closeSessionBtn && window.showEmptySession) {
        closeSessionBtn.addEventListener('click', window.showEmptySession);
    }
    
    // Clear button handler
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClearButtonClick);
    }
    
    // New session button handler
    const newSessionBtn = document.getElementById('newSessionBtn');
    if (newSessionBtn && window.createNewSession) {
        newSessionBtn.addEventListener('click', window.createNewSession);
    }
    
    // Theme toggle handler
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Participant count click handler
    const participantCount = document.getElementById('participantCount');
    if (participantCount) {
        participantCount.addEventListener('click', () => {
            if (participantCount.classList.contains('stat-clickable') && window.transcriptData) {
                // Show participants modal for current session
                if (window.SessionUIManager && window.SessionUIManager.showParticipantsList) {
                    const currentSession = {
                        title: 'Obecna sesja',
                        transcript: window.transcriptData
                    };
                    window.SessionUIManager.showParticipantsList(currentSession);
                }
            }
        });
    }
    
    // Sidebar toggle handler
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle && window.UIManager) {
        sidebarToggle.addEventListener('click', () => {
            window.UIManager.toggleSidebar();
        });
    }
    
    // Export button handler
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (window.transcriptData && window.transcriptData.messages && window.transcriptData.messages.length > 0) {
                if (window.ModalManager) {
                    window.ModalManager.showModal('exportModal');
                }
            } else {
                if (window.UIManager && window.UIManager.updateStatus) {
                    window.UIManager.updateStatus('Brak danych do eksportu', 'error');
                }
            }
        });
    }
    
    console.log('✅ Main event listeners setup complete');
}

/**
 * Handle clear button click - same as delete button from session list (DRY principle)
 */
function handleClearButtonClick(event) {
    if (window.realtimeMode) {
        console.log('🔍 [CLEAR BTN] Disabled - recording active');
        return;
    }
    
    // Use the same function as delete buttons in session list to avoid code duplication
    if (window.currentSessionId && window.SessionHistoryManager && window.SessionHistoryManager.deleteSessionFromHistory) {
        window.SessionHistoryManager.deleteSessionFromHistory(window.currentSessionId, event || new Event('click'));
    } else {
        console.log('🔍 [CLEAR BTN] No current session to delete');
    }
}

/**
 * Initialize theme system
 */
function initializeTheme() {
    // Get saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Update theme toggle icon
    updateThemeToggleIcon(savedTheme);
    
    console.log('✅ Theme initialized:', savedTheme);
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggleIcon(newTheme);
    
    console.log('🎨 Theme changed to:', newTheme);
}

/**
 * Update theme toggle icon based on current theme
 */
function updateThemeToggleIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    const lightIcon = themeToggle.querySelector('.theme-icon-light');
    const darkIcon = themeToggle.querySelector('.theme-icon-dark');
    
    if (lightIcon && darkIcon) {
        if (theme === 'dark') {
            lightIcon.style.display = 'none';
            darkIcon.style.display = 'block';
        } else {
            lightIcon.style.display = 'block';
            darkIcon.style.display = 'none';
        }
    }
}

/**
 * Show initialization error to user
 */
function showInitializationError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #f44336;
        color: white;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        z-index: 10000;
        max-width: 300px;
    `;
    errorDiv.innerHTML = `
        <h3>Błąd inicjalizacji</h3>
        <p>Wystąpił błąd podczas uruchamiania rozszerzenia:</p>
        <p><strong>${error.message}</strong></p>
        <p>Spróbuj odświeżyć stronę lub zrestartować rozszerzenie.</p>
    `;
    document.body.appendChild(errorDiv);
}

/**
 * Utility functions for backward compatibility
 */

// Export commonly used functions to global scope for compatibility
window.generateSessionId = function() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

window.generateSessionTitle = function() {
    const now = new Date();
    const date = now.toLocaleDateString('pl-PL');
    const time = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    return `Spotkanie o ${time}`;
};

/**
 * Debug helper function for testing state persistence
 * PHASE 6: Comprehensive state verification and testing
 * Usage: Call window.debugState() from browser console
 */
window.debugState = function() {
    console.log('🔍 [DEBUG] === COMPLETE STATE DEBUG ===');
    
    // Global variables
    console.log('📊 [DEBUG] Global Variables:', {
        transcriptData: !!window.transcriptData,
        transcriptDataMessages: window.transcriptData?.messages?.length || 0,
        realtimeMode: window.realtimeMode,
        currentSessionId: window.currentSessionId,
        sessionHistory: window.sessionHistory?.length || 0,
        expandedEntries: window.expandedEntries?.size || 0,
        currentSearchQuery: window.currentSearchQuery || '',
        activeParticipantFilters: window.activeParticipantFilters?.size || 0
    });
    
    // UI state
    const sidebar = document.querySelector('.sidebar');
    console.log('🎨 [DEBUG] UI State:', {
        sidebarExists: !!sidebar,
        sidebarCollapsed: sidebar?.classList.contains('collapsed') || false,
        theme: document.documentElement.getAttribute('data-theme') || 'light',
        recordButtonExists: !!document.getElementById('recordBtn'),
        recordButtonActive: document.getElementById('recordBtn')?.classList.contains('active') || false
    });
    
    // Module availability
    console.log('🧩 [DEBUG] Modules:', {
        StateManager: !!window.StateManager,
        UIManager: !!window.UIManager,
        SessionHistoryManager: !!window.SessionHistoryManager,
        BackgroundScanner: !!window.BackgroundScanner,
        TranscriptManager: !!window.TranscriptManager
    });
    
    // Critical functions
    console.log('⚙️ [DEBUG] Global Functions:', {
        displayTranscript: typeof window.displayTranscript,
        updateStats: typeof window.updateStats,
        detectChanges: typeof window.detectChanges,
        showEmptySession: typeof window.showEmptySession,
        createNewSession: typeof window.createNewSession
    });
    
    console.log('🔍 [DEBUG] === END STATE DEBUG ===');
    
    return {
        globalVars: window.transcriptData !== undefined,
        uiState: !!sidebar,
        modules: !!window.StateManager,
        functions: typeof window.displayTranscript === 'function'
    };
};

/**
 * Test session loading manually
 * PHASE 5: Debug helper for session loading issues
 * Usage: Call window.testSessionLoading('sessionId') from browser console
 */
window.testSessionLoading = function(sessionId) {
    console.log('🧪 [TEST] === TESTING SESSION LOADING ===');
    console.log('🔍 [TEST] Testing session ID:', sessionId);
    
    if (!window.sessionHistory) {
        console.error('❌ [TEST] window.sessionHistory is not available');
        return false;
    }
    
    console.log('📊 [TEST] Available sessions:', 
        window.sessionHistory.map(s => ({ id: s.id, title: s.title }))
    );
    
    // Test session loading
    try {
        if (window.SessionHistoryManager && window.SessionHistoryManager.loadSessionFromHistory) {
            window.SessionHistoryManager.loadSessionFromHistory(sessionId);
            console.log('✅ [TEST] Session loading function called successfully');
            return true;
        } else {
            console.error('❌ [TEST] SessionHistoryManager.loadSessionFromHistory not available');
            return false;
        }
    } catch (error) {
        console.error('❌ [TEST] Session loading failed:', error);
        return false;
    }
};

/**
 * Test state persistence manually
 * PHASE 6: Testing helper for state persistence
 * Usage: Call window.testStatePersistence() from browser console
 */
window.testStatePersistence = async function() {
    console.log('🧪 [TEST] === TESTING STATE PERSISTENCE ===');
    
    // 1. Save current state snapshot
    const beforeState = {
        transcriptData: !!window.transcriptData,
        realtimeMode: window.realtimeMode,
        currentSessionId: window.currentSessionId,
        sessionHistoryLength: window.sessionHistory?.length || 0,
        sidebarCollapsed: document.querySelector('.sidebar')?.classList.contains('collapsed') || false
    };
    
    console.log('📸 [TEST] State BEFORE persistence test:', beforeState);
    
    // 2. Force save current state
    try {
        if (window.StateManager && window.UIManager) {
            await window.StateManager.saveUIState({
                sidebarCollapsed: beforeState.sidebarCollapsed,
                theme: document.documentElement.getAttribute('data-theme') || 'light'
            });
            console.log('✅ [TEST] State saved successfully');
        }
    } catch (error) {
        console.error('❌ [TEST] Failed to save state:', error);
        return false;
    }
    
    // 3. Simulate restoration
    try {
        await restoreCompleteApplicationState();
        console.log('✅ [TEST] State restoration completed');
    } catch (error) {
        console.error('❌ [TEST] Failed to restore state:', error);
        return false;
    }
    
    // 4. Check state after restoration
    const afterState = {
        transcriptData: !!window.transcriptData,
        realtimeMode: window.realtimeMode,
        currentSessionId: window.currentSessionId,
        sessionHistoryLength: window.sessionHistory?.length || 0,
        sidebarCollapsed: document.querySelector('.sidebar')?.classList.contains('collapsed') || false
    };
    
    console.log('📸 [TEST] State AFTER persistence test:', afterState);
    
    // 5. Compare states
    const stateMatches = {
        transcriptData: beforeState.transcriptData === afterState.transcriptData,
        realtimeMode: beforeState.realtimeMode === afterState.realtimeMode,
        currentSessionId: beforeState.currentSessionId === afterState.currentSessionId,
        sessionHistoryLength: beforeState.sessionHistoryLength === afterState.sessionHistoryLength,
        sidebarCollapsed: beforeState.sidebarCollapsed === afterState.sidebarCollapsed
    };
    
    const allMatch = Object.values(stateMatches).every(match => match);
    
    console.log('🔍 [TEST] State comparison:', stateMatches);
    console.log(allMatch ? '✅ [TEST] STATE PERSISTENCE WORKING!' : '❌ [TEST] STATE PERSISTENCE FAILED!');
    
    console.log('🧪 [TEST] === END PERSISTENCE TEST ===');
    
    return allMatch;
};

// Global error handler
window.addEventListener('error', function(event) {
    console.error('❌ [GLOBAL ERROR]', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ [UNHANDLED PROMISE REJECTION]', event.reason);
});

console.log('📝 Main popup.js loaded - waiting for DOMContentLoaded');