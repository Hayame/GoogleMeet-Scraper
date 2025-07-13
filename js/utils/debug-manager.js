/**
 * Debug Manager - Development and testing utilities
 * Extracted from popup.js for better modularity
 */

window.DebugManager = {
    /**
     * Initialize debug manager and setup global aliases
     */
    initialize() {
        console.log('🐛 [DEBUG] DebugManager initialized');
        this.setupGlobalAliases();
    },
    
    /**
     * Setup global function aliases for console usage compatibility
     */
    setupGlobalAliases() {
        // Maintain backward compatibility for console usage
        window.debugState = this.debugState.bind(this);
        window.testSessionLoading = this.testSessionLoading.bind(this);
        window.testStatePersistence = this.testStatePersistence.bind(this);
        
        console.log('🔗 [DEBUG] Global debug function aliases created');
    },
    
    /**
     * Debug helper function for testing state persistence
     * PHASE 6: Comprehensive state verification and testing
     * Usage: Call window.debugState() from browser console
     */
    debugState() {
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
            TranscriptManager: !!window.TranscriptManager,
            ThemeManager: !!window.ThemeManager,
            SessionUtils: !!window.SessionUtils,
            DebugManager: !!window.DebugManager
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
    },
    
    /**
     * Test session loading manually
     * PHASE 5: Debug helper for session loading issues
     * Usage: Call window.testSessionLoading('sessionId') from browser console
     */
    testSessionLoading(sessionId) {
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
    },
    
    /**
     * Test state persistence manually
     * PHASE 6: Testing helper for state persistence
     * Usage: Call window.testStatePersistence() from browser console
     */
    async testStatePersistence() {
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
        
        // 3. Simulate restoration using StateManager directly
        try {
            const sessionState = await window.StateManager.restoreStateFromStorage();
            const uiState = await window.StateManager.restoreUIState();
            
            console.log('✅ [TEST] State restoration completed');
            console.log('📊 [TEST] Restored session state:', sessionState);
            console.log('🎨 [TEST] Restored UI state:', uiState);
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
    },
    
    /**
     * Test specific module availability and functions
     * @param {string} moduleName - Name of the module to test
     */
    testModule(moduleName) {
        console.log(`🧪 [TEST] === TESTING ${moduleName.toUpperCase()} MODULE ===`);
        
        const module = window[moduleName];
        if (!module) {
            console.error(`❌ [TEST] ${moduleName} module not found`);
            return false;
        }
        
        console.log(`✅ [TEST] ${moduleName} module exists`);
        
        // Test initialize method if it exists
        if (typeof module.initialize === 'function') {
            console.log(`✅ [TEST] ${moduleName}.initialize() method available`);
        } else {
            console.warn(`⚠️ [TEST] ${moduleName}.initialize() method not found`);
        }
        
        // List all methods
        const methods = Object.getOwnPropertyNames(module)
            .filter(prop => typeof module[prop] === 'function');
        
        console.log(`📋 [TEST] ${moduleName} methods:`, methods);
        
        console.log(`🧪 [TEST] === END ${moduleName.toUpperCase()} MODULE TEST ===`);
        
        return true;
    },
    
    /**
     * Test all modules availability
     */
    testAllModules() {
        console.log('🧪 [TEST] === TESTING ALL MODULES ===');
        
        const expectedModules = [
            'StateManager',
            'StorageManager', 
            'UIManager',
            'TimerManager',
            'ModalManager',
            'BackgroundScanner',
            'RecordingManager',
            'SessionHistoryManager',
            'SessionUIManager',
            'TranscriptManager',
            'SearchFilterManager',
            'ExportManager',
            'ThemeManager',
            'SessionUtils',
            'DebugManager'
        ];
        
        const results = {};
        
        for (const moduleName of expectedModules) {
            results[moduleName] = !!window[moduleName];
            
            if (results[moduleName]) {
                console.log(`✅ [TEST] ${moduleName} - Available`);
            } else {
                console.error(`❌ [TEST] ${moduleName} - Missing`);
            }
        }
        
        const totalModules = expectedModules.length;
        const availableModules = Object.values(results).filter(Boolean).length;
        
        console.log(`📊 [TEST] Module availability: ${availableModules}/${totalModules}`);
        console.log('🧪 [TEST] === END ALL MODULES TEST ===');
        
        return results;
    }
};