/**
 * Google Meet Transcript Scraper - Main Entry Point
 */

/**
 * Handle popup close - flush pending background scan data
 */
window.addEventListener('beforeunload', async () => {
    if (window.realtimeMode && window.BackgroundScanner) {
        console.log('⚠️ [POPUP] Popup closing during recording, flushing data');
        try {
            await window.BackgroundScanner.flushPendingData();
            console.log('✅ [POPUP] Data flushed before close');
        } catch (error) {
            console.error('❌ [POPUP] Failed to flush data:', error);
        }
    }
});

document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🚀 [INIT] Initializing Google Meet Transcript Scraper');
        validateEssentialElements();
        await initializeApplication();
        console.log('✅ [INIT] Application initialized successfully');
    } catch (error) {
        console.error('❌ [INIT] Critical initialization error:', error);
        showInitializationError(error);
    }
});

/**
 * Validate that critical global functions are available
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
    const essentialIds = ['recordBtn', 'recordingStatus', 'transcriptContent', 'transcriptStats'];

    for (const id of essentialIds) {
        if (!document.getElementById(id)) {
            throw new Error(`Essential element not found (ID: ${id})`);
        }
    }
}

/**
 * Require a module to be present, throwing if missing
 */
function requireModule(name) {
    if (!window[name]) {
        throw new Error(`${name} not found`);
    }
    return window[name];
}

/**
 * Initialize a module if it exists on window, returning whether it was found
 */
function initModule(name) {
    if (window[name]) {
        window[name].initialize();
        return true;
    }
    return false;
}

/**
 * Initialize all application modules in the correct order
 */
async function initializeApplication() {
    console.log('🚀 [INIT] Starting application initialization sequence...');

    // Required modules (will throw if missing)
    requireModule('TransactionCoordinator').initialize();
    requireModule('StorageManager').initialize();
    requireModule('StateManager').initialize();

    // Optional core modules
    initModule('UIManager');
    initModule('TimerManager');
    initModule('ModalManager');

    if (window.SettingsManager) {
        await window.SettingsManager.initialize();
    }

    initModule('BackgroundScanner');
    initModule('TranscriptRefreshManager');
    initModule('RecordingManager');

    // Session history (both modules needed together)
    if (window.SessionHistoryManager && window.SessionUIManager) {
        await window.SessionHistoryManager.initialize();
        window.SessionUIManager.initialize();
    }

    // Data integrity verification (after session history loaded)
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

    // Feature modules
    initModule('TranscriptManager');
    initModule('SearchFilterManager');
    initModule('ExportManager');

    setupMainEventListeners();
    setupMessageListener();

    initModule('ThemeManager');
    initModule('DebugManager');

    validateGlobalFunctions();
    await restoreCompleteApplicationState();

    if (window.StateManager.validateStateRestoration) {
        window.StateManager.validateStateRestoration();
    } else {
        console.warn('⚠️ [INIT] StateManager.validateStateRestoration not available');
    }
}

/**
 * Apply emergency fallback state when restoration fails
 */
function applyEmergencyFallback() {
    if (window.StateManager) {
        window.StateManager.exposeGlobalVariables();
    }
    document.documentElement.setAttribute('data-theme', 'light');
}

/**
 * Restore complete application state including UI and session data
 */
async function restoreCompleteApplicationState() {
    try {
        console.log('🔄 [POPUP] Starting complete state restoration');

        const sessionState = await window.StateManager.restoreStateFromStorage();
        const uiState = await window.StateManager.restoreUIState();

        try {
            if (window.UIManager && window.UIManager.restoreUIState) {
                window.UIManager.restoreUIState(uiState);
            }
        } catch (uiError) {
            console.error('❌ [RECOVERY] UI state restoration failed:', uiError);
            document.documentElement.setAttribute('data-theme', 'light');
        }

        try {
            await applySessionStateRestoration(sessionState);
        } catch (sessionError) {
            console.error('❌ [RECOVERY] Session state restoration failed:', sessionError);
            if (window.StateManager) {
                window.StateManager.exposeGlobalVariables();
            }
        }

        console.log('✅ [POPUP] Complete state restoration finished', { sessionState, uiState });
    } catch (error) {
        console.error('❌ [POPUP] Critical state restoration failure:', error);
        try {
            applyEmergencyFallback();
            console.log('✅ [RECOVERY] Emergency recovery completed');
        } catch (recoveryError) {
            console.error('❌ [RECOVERY] Emergency recovery failed:', recoveryError);
        }
    }
}

/**
 * Display transcript data, update stats, and update participant count clickability
 */
function displayTranscriptAndStats(transcriptData) {
    if (!transcriptData) return;

    if (window.displayTranscript) {
        window.displayTranscript(transcriptData);
    }
    if (window.updateStats) {
        window.updateStats(transcriptData);
    }
    if (window.TranscriptManager && window.TranscriptManager.updateParticipantCountClickability) {
        const uniqueParticipants = new Set(transcriptData.messages?.map(m => m.speaker) || []).size;
        window.TranscriptManager.updateParticipantCountClickability(uniqueParticipants);
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
        console.log('🔴 [POPUP] Restoring active recording state');

        // Reactivate background scanner (includes merge of accumulated data)
        let reactivationResult = null;
        if (window.BackgroundScanner && window.BackgroundScanner.reactivateAfterRestore) {
            reactivationResult = await window.BackgroundScanner.reactivateAfterRestore();
            console.log('✅ [POPUP] Background scanner reactivation completed:', reactivationResult);
        }

        // Use window.transcriptData (updated by merge) instead of sessionState.transcriptData (stale)
        const transcriptToDisplay = window.transcriptData || sessionState.transcriptData;
        displayTranscriptAndStats(transcriptToDisplay);

        if (reactivationResult?.restartSuccess === false) {
            console.error('❌ [POPUP] Background scanning restart failed');
            window.updateStatus?.('Nie udało się wznowić skanowania w tle — zamknij i otwórz popup', 'error');
        } else if (reactivationResult && !reactivationResult.mergeSuccess) {
            console.warn('⚠️ [POPUP] Merge failed, displaying stored data instead');
            window.updateStatus?.('Przywrócono zapisane dane (częściowo)', 'warning');
        }

        if (window.UIManager) {
            window.UIManager.updateButtonVisibility('RECORDING');
        }

        // Restart duration timer
        const recordingStartTime = window.StateManager?.getRecordingStartTime();
        if (recordingStartTime && window.TimerManager?.startDurationTimer) {
            window.TimerManager.startDurationTimer();
            console.log('⏰ [POPUP] Timer started with recordingStartTime:', recordingStartTime);
        } else {
            console.warn('⚠️ [POPUP] Cannot start timer - recordingStartTime not available');
            if (window.TimerManager?.updateDurationDisplay) {
                window.TimerManager.updateDurationDisplay();
            }
        }

    } else if (sessionState.sessionState === window.AppConstants.SESSION_STATES.PAUSED_SESSION) {
        console.log('⏸️ [POPUP] Restoring paused session');

        displayTranscriptAndStats(sessionState.transcriptData);

        if (window.UIManager) {
            window.UIManager.updateButtonVisibility('NEW');
        }

        if (sessionState.sessionTotalDuration !== undefined && window.TimerManager) {
            window.StateManager?.setSessionTotalDuration(sessionState.sessionTotalDuration);
            if (window.TimerManager.updateDurationDisplay) {
                window.TimerManager.updateDurationDisplay();
            }
        }

    } else if (sessionState.sessionState === window.AppConstants.SESSION_STATES.HISTORICAL_SESSION) {
        console.log('📜 [POPUP] Restoring historical session');

        displayTranscriptAndStats(sessionState.transcriptData);

        if (window.UIManager) {
            window.UIManager.updateButtonVisibility('HISTORICAL');

            const session = window.sessionHistory?.find(s => s.id === sessionState.currentSessionId);
            if (session) {
                window.UIManager.showMeetingName(session.title, sessionState.currentSessionId);
            }
        }

        if (window.SessionUIManager && window.SessionUIManager.highlightActiveSession) {
            window.SessionUIManager.highlightActiveSession(sessionState.currentSessionId);
        }
    }
}

/**
 * Bind click handler to an element by ID, only if the element and handler exist
 */
function bindClick(elementId, handler) {
    const element = document.getElementById(elementId);
    if (element && handler) {
        element.addEventListener('click', handler);
    }
}

/**
 * Setup main application event listeners
 */
function setupMainEventListeners() {
    if (window.RecordingManager) {
        bindClick('recordBtn', window.RecordingManager.handleRecordButtonClick.bind(window.RecordingManager));
    }
    if (window.TranscriptRefreshManager) {
        bindClick('refreshTranscriptBtn', window.TranscriptRefreshManager.handleRefreshClick.bind(window.TranscriptRefreshManager));
    }

    bindClick('closeSessionBtn', window.showEmptySession);
    bindClick('clearBtn', window.clearCurrentSession);
    bindClick('newSessionBtn', window.createNewSession);

    bindClick('participantCount', () => {
        const participantCount = document.getElementById('participantCount');
        if (participantCount.classList.contains('stat-clickable') && window.transcriptData) {
            if (window.SessionUIManager && window.SessionUIManager.showParticipantsList) {
                window.SessionUIManager.showParticipantsList({
                    title: 'Obecna sesja',
                    transcript: window.transcriptData
                });
            }
        }
    });

    if (window.UIManager) {
        bindClick('sidebarToggle', () => window.UIManager.toggleSidebar());
    }

    bindClick('exportBtn', () => {
        const hasData = window.transcriptData?.messages?.length > 0;
        if (hasData && window.ModalManager) {
            window.ModalManager.showModal('exportModal');
        } else if (window.UIManager?.updateStatus) {
            window.UIManager.updateStatus('Brak danych do eksportu', 'error');
        }
    });

    console.log('✅ Main event listeners setup complete');
}

/**
 * Setup message listener for background script communication
 */
function setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateGoogleUserName') {
            console.log('⚙️ [POPUP] Received Google user name update:', request.userName);
            if (window.SettingsManager?.updateGoogleUserName) {
                window.SettingsManager.updateGoogleUserName(request.userName);
            }
            sendResponse({ success: true });
        }
        return true;
    });
    console.log('✅ Message listener setup complete');
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

// Utility functions exposed globally for backward compatibility
window.generateSessionId = function() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

window.generateSessionTitle = function() {
    const time = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    return `Spotkanie o ${time}`;
};

// Global error handlers
window.addEventListener('error', function(event) {
    console.error('❌ [GLOBAL ERROR]', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ [UNHANDLED PROMISE REJECTION]', event.reason);
});

console.log('📝 Main popup.js loaded');