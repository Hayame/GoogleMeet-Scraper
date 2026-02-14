/**
 * Debug Manager - Development and testing utilities
 */

window.DebugManager = {
    /**
     * Initialize debug manager and setup global aliases
     */
    initialize() {
        console.log('[DEBUG] DebugManager initialized');
        this.setupGlobalAliases();
    },

    /**
     * Setup global function aliases for console usage compatibility
     */
    setupGlobalAliases() {
        window.debugState = this.debugState.bind(this);
        window.testSessionLoading = this.testSessionLoading.bind(this);
        window.testStatePersistence = this.testStatePersistence.bind(this);
    },

    /**
     * Debug helper for inspecting application state
     * Usage: window.debugState() from browser console
     */
    debugState() {
        console.log('[DEBUG] === COMPLETE STATE DEBUG ===');

        console.log('[DEBUG] Global Variables:', {
            transcriptData: !!window.transcriptData,
            transcriptDataMessages: window.transcriptData?.messages?.length || 0,
            realtimeMode: window.realtimeMode,
            currentSessionId: window.currentSessionId,
            sessionHistory: window.sessionHistory?.length || 0,
            expandedEntries: window.expandedEntries?.size || 0,
            currentSearchQuery: window.currentSearchQuery || '',
            activeParticipantFilters: window.activeParticipantFilters?.size || 0
        });

        const sidebar = document.querySelector('.sidebar');
        console.log('[DEBUG] UI State:', {
            sidebarExists: !!sidebar,
            sidebarCollapsed: sidebar?.classList.contains('collapsed') || false,
            theme: document.documentElement.getAttribute('data-theme') || 'light',
            recordButtonExists: !!document.getElementById('recordBtn'),
            recordButtonActive: document.getElementById('recordBtn')?.classList.contains('active') || false
        });

        console.log('[DEBUG] Modules:', {
            StateManager: !!window.StateManager,
            UIManager: !!window.UIManager,
            SessionHistoryManager: !!window.SessionHistoryManager,
            BackgroundScanner: !!window.BackgroundScanner,
            TranscriptManager: !!window.TranscriptManager,
            ThemeManager: !!window.ThemeManager,
            SessionUtils: !!window.SessionUtils,
            DebugManager: !!window.DebugManager
        });

        console.log('[DEBUG] Global Functions:', {
            displayTranscript: typeof window.displayTranscript,
            updateStats: typeof window.updateStats,
            detectChanges: typeof window.detectChanges,
            showEmptySession: typeof window.showEmptySession,
            createNewSession: typeof window.createNewSession
        });

        console.log('[DEBUG] === END STATE DEBUG ===');

        return {
            globalVars: window.transcriptData !== undefined,
            uiState: !!sidebar,
            modules: !!window.StateManager,
            functions: typeof window.displayTranscript === 'function'
        };
    },

    /**
     * Test session loading manually
     * Usage: window.testSessionLoading('sessionId') from browser console
     */
    testSessionLoading(sessionId) {
        console.log('[TEST] === TESTING SESSION LOADING ===');
        console.log('[TEST] Testing session ID:', sessionId);

        if (!window.sessionHistory) {
            console.error('[TEST] window.sessionHistory is not available');
            return false;
        }

        console.log('[TEST] Available sessions:',
            window.sessionHistory.map(s => ({ id: s.id, title: s.title }))
        );

        if (!window.SessionHistoryManager?.loadSessionFromHistory) {
            console.error('[TEST] SessionHistoryManager.loadSessionFromHistory not available');
            return false;
        }

        try {
            window.SessionHistoryManager.loadSessionFromHistory(sessionId);
            console.log('[TEST] Session loading function called successfully');
            return true;
        } catch (error) {
            console.error('[TEST] Session loading failed:', error);
            return false;
        }
    },

    /**
     * Test state persistence manually
     * Usage: window.testStatePersistence() from browser console
     */
    async testStatePersistence() {
        console.log('[TEST] === TESTING STATE PERSISTENCE ===');

        const captureState = () => ({
            transcriptData: !!window.transcriptData,
            realtimeMode: window.realtimeMode,
            currentSessionId: window.currentSessionId,
            sessionHistoryLength: window.sessionHistory?.length || 0,
            sidebarCollapsed: document.querySelector('.sidebar')?.classList.contains('collapsed') || false
        });

        const beforeState = captureState();
        console.log('[TEST] State BEFORE persistence test:', beforeState);

        try {
            if (window.StateManager && window.UIManager) {
                await window.StateManager.saveUIState({
                    sidebarCollapsed: beforeState.sidebarCollapsed,
                    theme: document.documentElement.getAttribute('data-theme') || 'light'
                });
                console.log('[TEST] State saved successfully');
            }
        } catch (error) {
            console.error('[TEST] Failed to save state:', error);
            return false;
        }

        try {
            const sessionState = await window.StateManager.restoreStateFromStorage();
            const uiState = await window.StateManager.restoreUIState();
            console.log('[TEST] Restored session state:', sessionState);
            console.log('[TEST] Restored UI state:', uiState);
        } catch (error) {
            console.error('[TEST] Failed to restore state:', error);
            return false;
        }

        const afterState = captureState();
        console.log('[TEST] State AFTER persistence test:', afterState);

        const stateMatches = Object.fromEntries(
            Object.keys(beforeState).map(key => [key, beforeState[key] === afterState[key]])
        );
        const allMatch = Object.values(stateMatches).every(Boolean);

        console.log('[TEST] State comparison:', stateMatches);
        console.log(allMatch ? '[TEST] STATE PERSISTENCE WORKING!' : '[TEST] STATE PERSISTENCE FAILED!');
        console.log('[TEST] === END PERSISTENCE TEST ===');

        return allMatch;
    },

    /**
     * Test specific module availability and functions
     * @param {string} moduleName - Name of the module to test
     */
    testModule(moduleName) {
        console.log(`[TEST] === TESTING ${moduleName.toUpperCase()} MODULE ===`);

        const module = window[moduleName];
        if (!module) {
            console.error(`[TEST] ${moduleName} module not found`);
            return false;
        }

        console.log(`[TEST] ${moduleName} module exists`);

        if (typeof module.initialize === 'function') {
            console.log(`[TEST] ${moduleName}.initialize() method available`);
        } else {
            console.warn(`[TEST] ${moduleName}.initialize() method not found`);
        }

        const methods = Object.getOwnPropertyNames(module)
            .filter(prop => typeof module[prop] === 'function');
        console.log(`[TEST] ${moduleName} methods:`, methods);

        console.log(`[TEST] === END ${moduleName.toUpperCase()} MODULE TEST ===`);
        return true;
    },

    /**
     * Test all modules availability
     */
    testAllModules() {
        console.log('[TEST] === TESTING ALL MODULES ===');

        const expectedModules = [
            'StateManager', 'StorageManager', 'UIManager', 'TimerManager',
            'ModalManager', 'BackgroundScanner', 'RecordingManager',
            'SessionHistoryManager', 'SessionUIManager', 'TranscriptManager',
            'SearchFilterManager', 'ExportManager', 'ThemeManager',
            'SessionUtils', 'DebugManager'
        ];

        const results = {};

        for (const moduleName of expectedModules) {
            results[moduleName] = !!window[moduleName];
            const status = results[moduleName] ? 'Available' : 'Missing';
            const logFn = results[moduleName] ? console.log : console.error;
            logFn(`[TEST] ${moduleName} - ${status}`);
        }

        const availableCount = Object.values(results).filter(Boolean).length;
        console.log(`[TEST] Module availability: ${availableCount}/${expectedModules.length}`);
        console.log('[TEST] === END ALL MODULES TEST ===');

        return results;
    }
};
