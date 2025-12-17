/**
 * Google Meet Transcript Scraper - Main Entry Point
 * Modularized version using extracted components
 */

/**
 * Handle popup close - flush pending background scan data
 */
window.addEventListener('beforeunload', async (event) => {
    // Only flush if recording is active
    if (window.realtimeMode && window.BackgroundScanner) {
        console.log('⚠️ [POPUP] Popup closing during recording, flushing data');

        try {
            // Force immediate flush of pending data
            await window.BackgroundScanner.flushPendingData();
            console.log('✅ [POPUP] Data flushed before close');
        } catch (error) {
            console.error('❌ [POPUP] Failed to flush data:', error);
            // Data will be recovered on next open via checkpoint system
        }
    }
});

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

    // 1. Initialize transaction coordinator first (required by StorageManager)
    if (window.TransactionCoordinator) {
        window.TransactionCoordinator.initialize();
    } else {
        throw new Error('TransactionCoordinator not found');
    }

    // 2. Initialize storage management
    if (window.StorageManager) {
        window.StorageManager.initialize();
    } else {
        throw new Error('StorageManager not found');
    }

    // 3. Initialize core state management
    if (window.StateManager) {
        window.StateManager.initialize();
    } else {
        throw new Error('StateManager not found');
    }

    // 4. Initialize UI management
    if (window.UIManager) {
        window.UIManager.initialize();
    }

    // 5. Initialize timer management
    if (window.TimerManager) {
        window.TimerManager.initialize();
    }

    // 6. Initialize modal system
    if (window.ModalManager) {
        window.ModalManager.initialize();
    }

    // 7. Initialize settings manager
    if (window.SettingsManager) {
        await window.SettingsManager.initialize();
    }

    // 8. Initialize background scanner
    if (window.BackgroundScanner) {
        window.BackgroundScanner.initialize();
    }

    // 9. Initialize recording management
    if (window.RecordingManager) {
        window.RecordingManager.initialize();
    }

    // 10. Initialize session history (CRITICAL: Must await before state restoration)
    if (window.SessionHistoryManager && window.SessionUIManager) {
        await window.SessionHistoryManager.initialize();
        window.SessionUIManager.initialize();
    }

    // 9.5. Data Integrity Verification (after session history loaded)
    if (window.DataIntegrity) {
        window.DataIntegrity.initialize();
        const integrityIssues = await window.DataIntegrity.verifyStorageIntegrity();
        if (integrityIssues.length > 0) {
            console.warn('⚠️ [INTEGRITY] Found issues:', integrityIssues);
            const fixResults = await window.DataIntegrity.autoFixIssues(integrityIssues);
            console.log('🔧 [INTEGRITY] Fix results:', fixResults);
        } else {
            console.log('✅ [INTEGRITY] No issues found');
        }
    }

    // 11. Initialize transcript features
    if (window.TranscriptManager) {
        window.TranscriptManager.initialize();
    }

    // 12. Initialize search and filter
    if (window.SearchFilterManager) {
        window.SearchFilterManager.initialize();
    }

    // 13. Initialize export functionality
    if (window.ExportManager) {
        window.ExportManager.initialize();
    }

    // 14. Setup main event listeners
    setupMainEventListeners();

    // 15. Setup message listener for background communication
    setupMessageListener();

    // 16. Initialize theme system
    if (window.ThemeManager) {
        window.ThemeManager.initialize();
    }

    // 17. Initialize debug manager
    if (window.DebugManager) {
        window.DebugManager.initialize();
    }
    
    // 16. Validate critical global functions before state restoration
    validateGlobalFunctions();
    
    // 17. Restore application state
    await restoreCompleteApplicationState();
    
    // 18. Validate state restoration success
    if (window.StateManager && window.StateManager.validateStateRestoration) {
        window.StateManager.validateStateRestoration();
    } else {
        console.warn('⚠️ [INIT] StateManager.validateStateRestoration not available');
    }
}

// validateStateRestorationSuccess() moved to StateManager.validateStateRestoration()

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

        // PHASE 1: Reactivate background scanner FIRST (includes merge of accumulated data)
        let reactivationResult = null;
        if (window.BackgroundScanner && window.BackgroundScanner.reactivateAfterRestore) {
            reactivationResult = await window.BackgroundScanner.reactivateAfterRestore();
            console.log('✅ [POPUP] Background scanner reactivation completed:', reactivationResult);
        }

        // PHASE 2: Display transcript AFTER merge completes
        // Use window.transcriptData (updated by merge) instead of sessionState.transcriptData (stale)
        const transcriptToDisplay = window.transcriptData || sessionState.transcriptData;

        if (transcriptToDisplay && window.displayTranscript) {
            window.displayTranscript(transcriptToDisplay);
            console.log('🔴 [POPUP] Displayed transcript after merge:', transcriptToDisplay.messages?.length || 0, 'messages');
        }

        // PHASE 3: Update stats with merged data
        if (transcriptToDisplay && window.updateStats) {
            window.updateStats(transcriptToDisplay);
        }

        // PHASE 4: Update participant count clickability
        if (transcriptToDisplay && window.TranscriptManager && window.TranscriptManager.updateParticipantCountClickability) {
            const uniqueParticipants = new Set(transcriptToDisplay.messages?.map(m => m.speaker) || []).size;
            window.TranscriptManager.updateParticipantCountClickability(uniqueParticipants);
        }

        // PHASE 5: Check for merge failure and show warning
        if (reactivationResult && !reactivationResult.mergeSuccess) {
            console.warn('⚠️ [POPUP] Merge failed, displaying stored data instead');
            if (window.updateStatus) {
                window.updateStatus('Przywrócono zapisane dane (częściowo)', 'warning');
            }
        }

        // PHASE 6: Update UI state
        if (window.UIManager) {
            window.UIManager.updateButtonVisibility('RECORDING');
        }

        // PHASE 7: Restart duration timer
        if (window.TimerManager && window.TimerManager.startDurationTimer) {
            // FIX: Validate recordingStartTime is set before starting timer
            const recordingStartTime = window.StateManager?.getRecordingStartTime();
            if (recordingStartTime) {
                window.TimerManager.startDurationTimer();
                console.log('⏰ [POPUP] Timer started with recordingStartTime:', recordingStartTime);
            } else {
                console.warn('⚠️ [POPUP] Cannot start timer - recordingStartTime not set');
            }
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
        // FIX: Check !== undefined instead of truthy (0 duration is valid!)
        if (sessionState.sessionTotalDuration !== undefined && window.TimerManager) {
            // Set the accumulated duration
            window.StateManager?.setSessionTotalDuration(sessionState.sessionTotalDuration);
            if (window.TimerManager.updateDurationDisplay) {
                // FIX: updateDurationDisplay() takes no parameters - reads from StateManager
                window.TimerManager.updateDurationDisplay();
            }
        }
        
        console.log('⏸️ [POPUP] Paused session restored with "Rozpocznij nagrywanie" button');
        
    } else if (sessionState.sessionState === window.AppConstants.SESSION_STATES.HISTORICAL_SESSION) {
        // CRITICAL FIX: Restore historical session (should show meeting title, not record button)
        console.log('📜 [POPUP] Restoring historical session');
        
        // Display transcript data
        if (sessionState.transcriptData && window.displayTranscript) {
            window.displayTranscript(sessionState.transcriptData);
        }
        
        // Update stats
        if (sessionState.transcriptData && window.updateStats) {
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
    
    // Clear button handler (delegated to SessionHistoryManager)
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn && window.clearCurrentSession) {
        clearBtn.addEventListener('click', window.clearCurrentSession);
    }
    
    // New session button handler
    const newSessionBtn = document.getElementById('newSessionBtn');
    if (newSessionBtn && window.createNewSession) {
        newSessionBtn.addEventListener('click', window.createNewSession);
    }
    
    // Theme toggle handler (now handled by ThemeManager)
    // ThemeManager sets up its own event listeners in initialize()
    
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
 * Setup message listener for background script communication
 */
function setupMessageListener() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateGoogleUserName') {
            // Update Google user name in SettingsManager
            console.log('⚙️ [POPUP] Received Google user name update:', request.userName);
            
            if (window.SettingsManager && window.SettingsManager.updateGoogleUserName) {
                window.SettingsManager.updateGoogleUserName(request.userName);
            }
            
            sendResponse({ success: true });
        }
        
        return true; // Keep message channel open for async response
    });
    
    console.log('✅ Message listener setup complete');
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

// Global error handler
window.addEventListener('error', function(event) {
    console.error('❌ [GLOBAL ERROR]', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ [UNHANDLED PROMISE REJECTION]', event.reason);
});

console.log('📝 Main popup.js loaded - waiting for DOMContentLoaded');