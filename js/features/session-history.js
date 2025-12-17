/**
 * Session History Management Module
 * Handles CRUD operations for session history
 * 
 * Extracted from popup.js lines: 1714-1742, 1823-1893, 2961-3058, 3060-3125
 */

window.SessionHistoryManager = {
    /**
     * Initialize session history from storage
     * Source: popup.js lines 1714-1742
     */
    async initializeSessionHistory() {
        try {
            // Load session history from storage using StorageManager
            const result = await window.StorageManager.getStorageData(['sessionHistory']);
            window.sessionHistory = result.sessionHistory || [];
            console.log('📁 [HISTORY] Loaded session history:', window.sessionHistory.length, 'sessions');

            // CRITICAL DEBUG: Log session details for debugging ID format issues
            if (window.sessionHistory.length > 0) {
                console.log('📁 [HISTORY DEBUG] Session IDs and types:',
                    window.sessionHistory.slice(0, 5).map(s => ({
                        id: s.id,
                        idType: typeof s.id,
                        title: s.title,
                        date: s.date,
                        entryCount: s.entryCount
                    }))
                );

                // CRITICAL DEBUG: Log current session context for duplicate prevention
                if (window.currentSessionId) {
                    const currentSessionExists = window.sessionHistory.find(s => s.id === window.currentSessionId);
                    console.log('📁 [HISTORY DEBUG] Current session context:', {
                        currentSessionId: window.currentSessionId,
                        existsInLoadedHistory: !!currentSessionExists,
                        realtimeMode: window.realtimeMode,
                        hasTranscriptData: !!window.transcriptData,
                        restorationInProgress: window.StateManager?.isRestorationInProgress()
                    });
                }
            }

            // Render the session history UI
            if (window.SessionUIManager && window.SessionUIManager.renderSessionHistory) {
                window.SessionUIManager.renderSessionHistory();
            }

            // Add event listeners for history UI
            const newSessionBtn = document.getElementById('newSessionBtn');
            if (newSessionBtn) {
                // Remove existing event listeners to prevent duplicates
                newSessionBtn.removeEventListener('click', window.createNewSession);
                newSessionBtn.addEventListener('click', window.createNewSession);
                console.log('📁 [HISTORY] New session button event listener added');
            } else {
                console.error('New session button not found');
            }

        } catch (error) {
            console.error('❌ [HISTORY] Error loading session history:', error);
            window.sessionHistory = [];
            if (window.SessionUIManager && window.SessionUIManager.renderSessionHistory) {
                window.SessionUIManager.renderSessionHistory();
            }
        }
    },

    /**
     * Auto-save current session to history
     * Source: popup.js lines 1823-1893
     */
    async autoSaveCurrentSession(data = null) {
        if (!window.transcriptData || window.transcriptData.messages.length === 0) {
            return;
        }
        
        // CRITICAL FIX: Check if state restoration is in progress
        if (window.StateManager?.isRestorationInProgress()) {
            console.log('🔄 [SESSION AUTOSAVE] Skipping - state restoration in progress');
            return;
        }
        
        // Simplified: just use all messages from transcriptData
        const validMessages = window.transcriptData.messages;
        
        // Use current session ID - defensive recovery mechanisms removed
        const sessionId = window.currentSessionId || window.generateSessionId();
        const uniqueParticipants = new Set(validMessages.map(m => m.speaker)).size;
        
        // CRITICAL FIX: If sessionHistory is not loaded yet, check storage directly
        if (!window.sessionHistory || window.sessionHistory.length === 0) {
            console.log('🔄 [SESSION AUTOSAVE] Session history not loaded, checking storage directly');

            // Use async/await instead of callback
            const result = await window.StorageManager.getStorageData(['sessionHistory']);
            const storageHistory = result.sessionHistory || [];

            // Simple session lookup in storage
            const existsInStorage = storageHistory.find(s => s.id === sessionId);

            if (existsInStorage) {
                console.log('🔄 [SESSION AUTOSAVE] Session already exists in storage, skipping duplicate creation');
                return;
            }
            // Continue with normal save if not found in storage
            await this._performAutoSave(sessionId, validMessages, uniqueParticipants);
            return;
        }

        // Continue with normal save
        await this._performAutoSave(sessionId, validMessages, uniqueParticipants);
    },

    /**
     * Internal method to perform the actual auto-save
     * @private
     * @returns {Promise<void>}
     */
    async _performAutoSave(sessionId, validMessages, uniqueParticipants) {
        // Simple session ID lookup - no complex format matching needed
        const existingIndex = window.sessionHistory.findIndex(s => s.id === sessionId);
        
        console.log('🔄 [SESSION AUTOSAVE DEBUG] Session lookup result:', existingIndex);
        const originalDate = existingIndex >= 0 ? window.sessionHistory[existingIndex].date : new Date().toISOString();
        const originalTitle = existingIndex >= 0 ? window.sessionHistory[existingIndex].title : window.generateSessionTitle();
        
        // Calculate current total duration using TimerManager
        const currentTotalDuration = window.TimerManager ? 
            window.TimerManager.getTotalDuration() : 
            (window.StateManager?.getSessionTotalDuration() || 0);
        
        const filteredTranscriptData = {
            messages: validMessages,
            scrapedAt: window.transcriptData.scrapedAt,
            meetingUrl: window.transcriptData.meetingUrl
        };
        
        const session = {
            id: sessionId,
            title: originalTitle, // Preserve original title or generate new one
            date: originalDate, // Preserve original date or set new one
            participantCount: uniqueParticipants,
            entryCount: validMessages.length,
            transcript: filteredTranscriptData,
            totalDuration: currentTotalDuration
        };
        
        console.log('🔄 [SESSION AUTOSAVE DEBUG] Creating session with:', {
            id: sessionId,
            entryCount: validMessages.length,
            participantCount: uniqueParticipants,
            existingIndex: existingIndex
        });
        
        if (existingIndex >= 0) {
            window.sessionHistory[existingIndex] = session;
            console.log('🔄 [SESSION AUTOSAVE DEBUG] Updated existing session in history');
        } else {
            window.sessionHistory.unshift(session);
            console.log('🔄 [SESSION AUTOSAVE DEBUG] Added new session to history');
        }
        
        // Limit history to 50 sessions
        if (window.sessionHistory.length > 50) {
            window.sessionHistory = window.sessionHistory.slice(0, 50);
        }

        // Save to storage using TransactionCoordinator for atomic operations
        // This ensures sessionHistory and currentSessionId are saved together
        const saveResult = await window.TransactionCoordinator.executeTransaction([
            {
                key: window.AppConstants.STORAGE_KEYS.SESSION_HISTORY,
                value: window.sessionHistory
            },
            {
                key: window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID,
                value: window.currentSessionId
            }
        ]);

        if (!saveResult.success) {
            console.error('❌ [SESSION AUTOSAVE] Failed to save:', saveResult.error);
            return;
        }

        console.log('✅ [SESSION AUTOSAVE] Session saved atomically in', saveResult.duration, 'ms');

        // Update UI after successful save
        if (window.SessionUIManager && window.SessionUIManager.renderSessionHistory) {
            window.SessionUIManager.renderSessionHistory();
        }

        // Highlight the new/updated session if it's the current one
        if (sessionId === window.currentSessionId && existingIndex < 0) {
            // New session was added, it will be highlighted automatically by renderSessionHistory
        }
    },

    /**
     * Load a session from history
     * Source: popup.js lines 1961-1983
     */
    loadSessionFromHistory(sessionId) {
        // CRITICAL FIX: Cancel any ongoing title editing before loading new session
        if (window.UIManager && window.UIManager.cancelMeetingNameEdit) {
            window.UIManager.cancelMeetingNameEdit();
        }
        
        // CRITICAL DEBUG: Log session lookup details
        console.log('🔍 [SESSION DEBUG] Looking for session:', {
            sessionId,
            sessionIdType: typeof sessionId,
            sessionHistoryExists: !!window.sessionHistory,
            sessionHistoryLength: window.sessionHistory?.length || 0,
            availableSessionIds: window.sessionHistory?.map(s => ({ id: s.id, idType: typeof s.id })) || []
        });
        
        // Simple session lookup - no complex format matching needed
        const session = window.sessionHistory?.find(s => s.id === sessionId);
        
        if (!session) {
            console.error('❌ [SESSION] Session not found after all attempts:', sessionId);
            window.updateStatus('Nie znaleziono sesji', 'error');
            return;
        }
        
        console.log('✅ [SESSION] Session found:', session.id, session.title);
        
        // If recording is active and user clicked on the same session that's being recorded, do nothing
        if (window.realtimeMode && sessionId === window.currentSessionId) {
            console.log('User clicked on currently recording session - ignoring');
            return;
        }
        
        // Check if recording is active for a DIFFERENT session and show confirmation
        if (window.realtimeMode) {
            this.showStopRecordingConfirmation(sessionId);
            return;
        }
        
        // Load the session directly if no recording is active
        // Reset filters when user explicitly loads a different session
        this.performLoadSession(session, true);
    },

    /**
     * Perform the actual session loading
     * Source: popup.js lines 1985-2030
     */
    async performLoadSession(session, shouldResetFilters = false) {
        // Load the session
        window.transcriptData = session.transcript;
        window.currentSessionId = session.id;
        window.StateManager?.setRecordingStartTime(null); // Historic sessions don't have active recording
        window.StateManager?.setSessionStartTime(null); // Historic sessions don't need session start time
        window.StateManager?.setSessionTotalDuration(session.totalDuration || 0); // Load total duration
        
        // Reset search and filters only when explicitly requested (new session)
        if (shouldResetFilters) {
            window.resetSearch();
            window.resetParticipantFilters();
        }
        
        // Stop any existing timer and ensure recording is stopped
        window.stopDurationTimer();
        
        window.displayTranscript(window.transcriptData);
        window.updateStats(window.transcriptData);
        
        // Complete pending filter restoration now that transcript data is loaded
        if (window.SearchFilterManager && window.SearchFilterManager.completePendingRestoration) {
            window.SearchFilterManager.completePendingRestoration();
        }
        window.updateDurationDisplay();
        
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        if (exportTxtBtn) {
            exportTxtBtn.disabled = false;
        }

        // Update storage (historic sessions are never recording)
        try {
            await window.StorageManager.setStorageData({
                [window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA]: window.transcriptData,
                [window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]: window.currentSessionId,
                [window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME]: null,
                [window.AppConstants.STORAGE_KEYS.REALTIME_MODE]: false,
                [window.AppConstants.STORAGE_KEYS.SESSION_STATE]: window.AppConstants.SESSION_STATES.HISTORICAL_SESSION  // Mark as historical
            });
            console.log('✅ [SESSION] Historical session state saved to storage');
        } catch (error) {
            console.error('❌ [SESSION] Failed to save historical session state:', error);
            // Non-fatal - UI already updated
        }

        // Show meeting name instead of status for historical sessions
        window.showMeetingName(session.title, session.id);
        
        // Update button visibility for historical session
        window.updateButtonVisibility('HISTORICAL');
        
        // Update clear button state
        if (window.updateClearButtonState) {
            window.updateClearButtonState();
        }
        
        // Refresh session list to update highlighting
        if (window.SessionUIManager && window.SessionUIManager.renderSessionHistory) {
            window.SessionUIManager.renderSessionHistory();
        }
    },

    /**
     * Delete session from history with event handling
     * Source: popup.js lines 2032-2036
     */
    deleteSessionFromHistory(sessionId, event) {
        event.stopPropagation(); // Prevent triggering the load action
        
        this.showDeleteConfirmation(sessionId);
    },

    /**
     * Show delete confirmation modal
     * Source: popup.js lines 2961-3005
     */
    showDeleteConfirmation(sessionId) {
        const session = window.sessionHistory.find(s => s.id === sessionId);
        if (!session) return;
        
        const confirmModal = document.getElementById('confirmModal');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmOk = document.getElementById('confirmOk');
        const confirmCancel = document.getElementById('confirmCancel');
        
        // Update modal content
        confirmMessage.innerHTML = `
            <p>Czy na pewno chcesz usunąć tę sesję?</p>
            <div class="delete-session-info">
                <div class="delete-session-title">${session.title}</div>
                <div class="delete-session-meta">
                    ${new Date(session.date).toLocaleDateString('pl-PL')} • 
                    ${session.participantCount} uczestników • 
                    ${session.entryCount} wpisów
                </div>
            </div>
            <div class="delete-warning">Ta akcja jest nieodwracalna!</div>
        `;
        
        // Clear previous event listeners
        const newConfirmOk = confirmOk.cloneNode(true);
        const newConfirmCancel = confirmCancel.cloneNode(true);
        confirmOk.parentNode.replaceChild(newConfirmOk, confirmOk);
        confirmCancel.parentNode.replaceChild(newConfirmCancel, confirmCancel);
        
        // Set up event handlers
        newConfirmOk.addEventListener('click', () => {
            this.performDeleteSession(sessionId);
            window.hideModal('confirmModal');
        });
        
        newConfirmCancel.addEventListener('click', () => {
            window.hideModal('confirmModal');
        });
        
        // Change button styling
        newConfirmOk.className = 'btn btn-danger';
        newConfirmOk.textContent = 'Usuń';
        
        window.showModal('confirmModal', { title: 'Usuń sesję' });
    },

    /**
     * Actually perform the session deletion
     * Source: popup.js lines 3007-3058
     */
    async performDeleteSession(sessionId) {
        window.sessionHistory = window.sessionHistory.filter(s => s.id !== sessionId);
        
        // If deleting current session, clear it and show empty session
        if (window.currentSessionId === sessionId) {
            // Stop recording if active
            if (window.realtimeMode) {
                console.log('🔴 [DELETE] Stopping active recording due to session deletion');
                window.deactivateRealtimeMode();
            }
            
            window.transcriptData = null;
            window.currentSessionId = null;
            window.displayTranscript({ messages: [] });
            window.updateStats({ messages: [] });
            
            const exportTxtBtn = document.getElementById('exportTxtBtn');
            if (exportTxtBtn) {
                exportTxtBtn.disabled = true;
            }
            
            // Reset timer and duration
            window.StateManager?.setRecordingStartTime(null);
            window.StateManager?.setSessionStartTime(null);
            window.StateManager?.setSessionTotalDuration(0);
            window.stopDurationTimer();
            
            // Update duration display to show 0:00
            const durationElement = document.getElementById('duration');
            if (durationElement) {
                durationElement.textContent = '0:00';
            }
            
            // Update UI for new session state
            window.updateButtonVisibility('NEW');
            window.hideMeetingName();

            // Remove current session from storage
            try {
                await window.StorageManager.removeStorageData([
                    window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA,
                    window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID,
                    window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME,
                    window.AppConstants.STORAGE_KEYS.SESSION_START_TIME,
                    window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION,
                    window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_DURATION,
                    window.AppConstants.STORAGE_KEYS.MEET_TAB_ID
                ]);
                console.log('✅ [DELETE] Removed current session from storage');
            } catch (error) {
                console.error('❌ [DELETE] Failed to remove session keys:', error);
                // Non-fatal - continue with deletion
            }
        }

        // Save updated history
        try {
            await window.StorageManager.saveSessionHistory(window.sessionHistory);

            // Update UI after successful save
            if (window.SessionUIManager && window.SessionUIManager.renderSessionHistory) {
                window.SessionUIManager.renderSessionHistory();
            }

            // Update clear button state after deletion
            if (window.updateClearButtonState) {
                window.updateClearButtonState();
            }

            window.updateStatus('Sesja usunięta', 'success');
            console.log('✅ [DELETE] Session deleted and history updated');
        } catch (error) {
            console.error('❌ [DELETE] Failed to save updated history:', error);
            window.updateStatus('Błąd podczas usuwania sesji', 'error');
        }
    },

    /**
     * Show confirmation when trying to load while recording
     * Source: popup.js lines 3060-3125
     */
    showStopRecordingConfirmation(sessionId) {
        const session = window.sessionHistory.find(s => s.id === sessionId);
        if (!session) {
            console.error('Session not found for confirmation:', sessionId);
            return;
        }
        
        // Store the session ID for later use
        window.pendingSessionToLoad = sessionId;
        
        const confirmModal = document.getElementById('confirmModal');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmOk = document.getElementById('confirmOk');
        const confirmCancel = document.getElementById('confirmCancel');
        
        // Update modal content
        confirmMessage.innerHTML = `
            <p>Aktualnie trwa nagrywanie. Czy chcesz je zakończyć i załadować tę sesję?</p>
            <div class="session-preview">
                <div class="session-title">${session.title}</div>
                <div class="session-meta">
                    ${new Date(session.date).toLocaleDateString('pl-PL')} • 
                    ${session.participantCount} uczestników • 
                    ${session.entryCount} wpisów
                </div>
            </div>
            <div class="warning">Aktualne nagrywanie zostanie zatrzymane i zapisane.</div>
        `;
        
        // Clear previous event listeners
        const newConfirmOk = confirmOk.cloneNode(true);
        const newConfirmCancel = confirmCancel.cloneNode(true);
        confirmOk.parentNode.replaceChild(newConfirmOk, confirmOk);
        confirmCancel.parentNode.replaceChild(newConfirmCancel, confirmCancel);
        
        // Set up event handlers
        newConfirmOk.addEventListener('click', () => {
            // Stop recording and load the selected session
            if (window.realtimeMode) {
                console.log('🔴 [CONFIRM] Stopping recording to load different session');
                window.deactivateRealtimeMode();
            }
            
            // Load the session that was clicked
            const sessionToLoad = window.sessionHistory.find(s => s.id === window.pendingSessionToLoad);
            if (sessionToLoad) {
                // Reset filters when loading different session after stopping recording
                this.performLoadSession(sessionToLoad, true);
            }
            
            window.pendingSessionToLoad = null;
            window.hideModal('confirmModal');
        });
        
        newConfirmCancel.addEventListener('click', () => {
            window.pendingSessionToLoad = null;
            window.hideModal('confirmModal');
        });
        
        // Change button styling
        newConfirmOk.className = 'btn btn-primary';
        newConfirmOk.textContent = 'Zatrzymaj i załaduj';
        
        window.showModal('confirmModal', { title: 'Zatrzymaj nagrywanie?' });
    },

    /**
     * Create new session (from old popup.js createNewSession function)
     */
    createNewSession() {
        console.log('🆕 [NEW SESSION] createNewSession() called');
        
        // Stop recording if active (auto-save will handle the session)
        if (window.realtimeMode) {
            console.log('🆕 [NEW SESSION] Stopping active recording first');
            if (window.deactivateRealtimeMode) {
                window.deactivateRealtimeMode();
            }
        }
        
        // Perform new session creation
        this.performNewSessionCreation();
    },

    /**
     * Perform new session creation (from old popup.js performNewSessionCreation function)
     */
    async performNewSessionCreation() {
        // Clear current data
        window.transcriptData = null;
        window.currentSessionId = window.generateSessionId ? window.generateSessionId() : 'session_' + Date.now();
        
        // Reset session state using StateManager
        window.StateManager?.setRecordingStartTime(null);
        window.StateManager?.setSessionStartTime(null);
        window.StateManager?.setSessionTotalDuration(0);
        window.StateManager?.setRecordingStopped(false);
        window.StateManager?.setRecordingPaused(false);
        
        console.log('🆕 [NEW SESSION] Created new session ID:', window.currentSessionId);
        
        // CRITICAL FIX: Refresh session list to remove highlighting from previous session
        if (window.SessionUIManager && window.SessionUIManager.renderSessionHistory) {
            window.SessionUIManager.renderSessionHistory();
            console.log('🆕 [NEW SESSION] Session list refreshed to remove highlighting');
        }
        
        // Stop any existing timer
        if (window.stopDurationTimer) {
            window.stopDurationTimer();
        }
        
        // Reset search and filters for clean new session
        if (window.resetSearch) {
            window.resetSearch();
        }
        if (window.resetParticipantFilters) {
            window.resetParticipantFilters();
        }
        if (window.hideMeetingName) {
            window.hideMeetingName();
        }
        
        // Clear transcript display and update stats
        if (window.displayTranscript) {
            window.displayTranscript({ messages: [] });
        }
        if (window.updateStats) {
            window.updateStats({ messages: [] });
        }
        if (window.updateDurationDisplay) {
            window.updateDurationDisplay();
        }
        
        // Disable export button for new empty session
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        if (exportTxtBtn) {
            exportTxtBtn.disabled = true;
        }
        
        // Update UI for new session state
        if (window.updateButtonVisibility) {
            window.updateButtonVisibility('NEW');
        }

        // Clear storage for new session
        try {
            await window.StorageManager.removeStorageData([
                window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA,
                window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID,
                window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME,
                window.AppConstants.STORAGE_KEYS.SESSION_START_TIME,
                window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION,
                window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_DURATION
            ]);
            console.log('✅ [NEW SESSION] Cleared storage for new session');
        } catch (error) {
            console.error('❌ [NEW SESSION] Failed to clear storage:', error);
            // Non-fatal - UI already reset
        }

        console.log('🆕 [NEW SESSION] New session created successfully');
    },

    /**
     * Initialize SessionHistoryManager module
     */
    async initialize() {
        console.log('📚 [SESSION] SessionHistoryManager initializing...');
        
        // CRITICAL FIX: Await session history loading before proceeding
        await this.initializeSessionHistory();
        console.log('📚 [SESSION] Session history loaded successfully');
        
        // Set up global aliases for backward compatibility
        this.setupGlobalAliases();
        
        console.log('📚 [SESSION] SessionHistoryManager initialization complete');
    },

    // generateSessionId() and generateSessionTitle() methods removed - use window.generateSessionId() and window.generateSessionTitle() instead

    /**
     * Clear current transcript data
     * Source: popup-old.js lines 595-629
     */
    async clearCurrentTranscript() {
        console.log('🧹 [CLEAR] Clearing current transcript');
        
        // Stop recording if active
        if (window.realtimeMode && window.deactivateRealtimeMode) {
            window.deactivateRealtimeMode();
        }
        
        // Stop any active timer
        if (window.TimerManager && window.TimerManager.stopDurationTimer) {
            window.TimerManager.stopDurationTimer();
        }
        
        // Reset ALL transcript-related variables using StateManager
        window.transcriptData = null;
        window.currentSessionId = null;
        window.StateManager?.setRecordingStartTime(null);
        window.StateManager?.setSessionStartTime(null);
        window.StateManager?.setSessionTotalDuration(0);
        window.StateManager?.setRecordingStopped(false);
        window.StateManager?.setRecordingPaused(false);
        
        // Update UI
        if (window.displayTranscript) window.displayTranscript({ messages: [] });
        if (window.updateStats) window.updateStats({ messages: [] });
        if (window.TimerManager && window.TimerManager.updateDurationDisplay) {
            window.TimerManager.updateDurationDisplay();
        }
        
        // Disable export button
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        if (exportTxtBtn) exportTxtBtn.disabled = true;
        
        // Update status
        if (window.UIManager && window.UIManager.updateStatus) {
            window.UIManager.updateStatus('Transkrypcja wyczyszczona', 'info');
        }
        
        // Show record button for new session
        const recordBtn = document.getElementById('recordBtn');
        if (recordBtn) {
            recordBtn.style.display = 'flex';
        }
        
        // Update button visibility for new session
        if (window.UIManager) {
            window.UIManager.updateButtonVisibility('NEW');
        }

        // Clear from storage
        try {
            await window.StorageManager.removeStorageData([
                window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA,
                window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID,
                window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME,
                window.AppConstants.STORAGE_KEYS.SESSION_START_TIME,
                window.AppConstants.STORAGE_KEYS.MEET_TAB_ID
            ]);
            console.log('✅ [CLEAR] Transcript data cleared from storage');
        } catch (error) {
            console.error('❌ [CLEAR] Failed to clear storage:', error);
            // UI already cleared, storage cleanup is best-effort
        }
    },

    /**
     * Show empty session state
     * Source: popup-old.js line 934
     */
    showEmptySession() {
        console.log('🆕 [EMPTY SESSION] Showing empty session');
        
        // CRITICAL FIX: Cancel any ongoing title editing before showing empty session
        if (window.UIManager && window.UIManager.cancelMeetingNameEdit) {
            window.UIManager.cancelMeetingNameEdit();
        }
        
        // Clear session data using StateManager
        window.transcriptData = null;
        window.currentSessionId = null;
        window.StateManager?.setRecordingStartTime(null);
        window.StateManager?.setSessionStartTime(null);
        window.StateManager?.setSessionTotalDuration(0);
        window.StateManager?.setRecordingStopped(false);
        window.StateManager?.setRecordingPaused(false);
        
        // Reset search and filters using SearchFilterManager
        if (window.SearchFilterManager) {
            window.SearchFilterManager.resetSearch();
            window.SearchFilterManager.resetParticipantFilters();
        }
        
        // Hide meeting name using UIManager
        if (window.UIManager) {
            window.UIManager.hideMeetingName();
        }
        
        // Stop any existing timer
        if (window.TimerManager) {
            window.TimerManager.stopDurationTimer();
        }
        
        // Update UI to empty state using TranscriptManager
        if (window.displayTranscript && window.updateStats) {
            window.displayTranscript({ messages: [] });
            window.updateStats({ messages: [] });
        }
        
        // CRITICAL FIX: Update participant count clickability for empty session (0 participants = non-clickable)
        if (window.TranscriptManager && window.TranscriptManager.updateParticipantCountClickability) {
            window.TranscriptManager.updateParticipantCountClickability(0);
        }
        
        // Reset duration display using TimerManager
        if (window.TimerManager) {
            window.TimerManager.updateDurationDisplay();
        }
        
        // Update button visibility for new session using UIManager
        if (window.UIManager) {
            window.UIManager.updateButtonVisibility('NEW');
        }
    },

    /**
     * Set up global function aliases for backward compatibility
     * This fixes the critical bug where other modules expect global functions
     */
    setupGlobalAliases() {
        // Critical fix: Expose session functions globally as expected by other modules
        window.createNewSession = this.createNewSession.bind(this);
        window.showEmptySession = this.showEmptySession.bind(this);
        window.performNewSessionCreation = this.performNewSessionCreation.bind(this);
        window.clearCurrentTranscript = this.clearCurrentTranscript.bind(this);
        window.clearCurrentSession = this.clearCurrentSession.bind(this);
        
        console.log('🔗 [SESSION] Global session function aliases created for backward compatibility');
    },

    /**
     * Clear current session (extracted from popup.js handleClearButtonClick)
     * Handles clearing the currently active session
     */
    clearCurrentSession(event) {
        // Prevent execution if recording is active
        if (window.realtimeMode) {
            console.log('🔍 [CLEAR] Disabled - recording active');
            if (window.UIManager && window.UIManager.updateStatus) {
                window.UIManager.updateStatus('Nie można usunąć sesji podczas nagrywania', 'error');
            }
            return;
        }
        
        // Use the same function as delete buttons in session list to avoid code duplication
        if (window.currentSessionId && this.deleteSessionFromHistory) {
            this.deleteSessionFromHistory(window.currentSessionId, event || new Event('click'));
        } else {
            console.log('🔍 [CLEAR] No current session to delete');
            if (window.UIManager && window.UIManager.updateStatus) {
                window.UIManager.updateStatus('Brak aktywnej sesji do usunięcia', 'info');
            }
        }
    },

    // ========================================
    // CLEAR ALL SESSIONS HELPER FUNCTIONS
    // ========================================

    /**
     * Capture current session state before clearing
     * @private
     * @returns {Object} Session state snapshot
     */
    _captureCurrentSessionState() {
        return {
            sessionCount: window.sessionHistory ? window.sessionHistory.length : 0,
            wasRecording: window.realtimeMode,
            hadActiveSession: !!(window.currentSessionId && window.transcriptData)
        };
    },

    /**
     * Stop active recording if currently recording
     * @private
     * @param {Object} state - Session state snapshot
     */
    _stopActiveRecording(state) {
        if (state.wasRecording && window.deactivateRealtimeMode) {
            console.log('🔴 [HISTORY] Stopping active recording during clear all');
            window.deactivateRealtimeMode();
        }
    },

    /**
     * Clear active session data and update UI
     * @private
     * @param {Object} state - Session state snapshot
     */
    _clearActiveSessionData(state) {
        if (!state.hadActiveSession) return;

        // Clear session data
        window.transcriptData = null;
        window.currentSessionId = null;

        // Update transcript UI
        if (window.displayTranscript) {
            window.displayTranscript({ messages: [] });
        }
        if (window.updateStats) {
            window.updateStats({ messages: [] });
        }

        // Reset timer and duration
        if (window.StateManager) {
            window.StateManager.setRecordingStartTime(null);
            window.StateManager.setSessionStartTime(null);
            window.StateManager.setSessionTotalDuration(0);
        }
        if (window.stopDurationTimer) {
            window.stopDurationTimer();
        }

        // Update duration display
        const durationElement = document.getElementById('duration');
        if (durationElement) {
            durationElement.textContent = '0:00';
        }

        // Update button visibility for new session
        if (window.updateButtonVisibility) {
            window.updateButtonVisibility('NEW');
        }
        if (window.hideMeetingName) {
            window.hideMeetingName();
        }

        // Disable export button
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        if (exportTxtBtn) {
            exportTxtBtn.disabled = true;
        }
    },

    /**
     * Clear storage data
     * @private
     * @returns {Promise<void>}
     */
    async _clearStorageData() {
        const keysToRemove = [
            window.AppConstants.STORAGE_KEYS.SESSION_HISTORY,
            window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA,
            window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID,
            window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME,
            window.AppConstants.STORAGE_KEYS.SESSION_START_TIME,
            window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION,
            window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_DURATION,
            window.AppConstants.STORAGE_KEYS.MEET_TAB_ID
        ];

        try {
            await window.StorageManager.removeStorageData(keysToRemove);
            console.log(`✅ [CLEANUP] Removed ${keysToRemove.length} storage keys`);
        } catch (error) {
            console.error('❌ [CLEANUP] Failed to remove storage keys:', error);
            throw error; // Re-throw to maintain error propagation
        }
    },

    /**
     * Update UI after clearing sessions
     * @private
     */
    _updateUIAfterClear() {
        if (window.SessionUIManager && window.SessionUIManager.renderSessionHistory) {
            window.SessionUIManager.renderSessionHistory();
        }
    },

    /**
     * Clear all sessions from history
     * Called by SettingsManager when user confirms clearing all sessions
     */
    async clearAllSessionsFromHistory() {
        try {
            console.log('🗑️ [HISTORY] Clearing all sessions from history...');

            // Step 1: Capture current state
            const state = this._captureCurrentSessionState();

            // Step 2: Stop active recording if needed
            this._stopActiveRecording(state);

            // Step 3: Clear active session data and UI
            this._clearActiveSessionData(state);

            // Step 4: Clear session history array
            window.sessionHistory = [];

            // Step 5: Clear storage data
            await this._clearStorageData();

            // Step 6: Update UI
            this._updateUIAfterClear();

            console.log(`✅ [HISTORY] Cleared ${state.sessionCount} sessions and storage data`);

            return {
                clearedSessionCount: state.sessionCount,
                wasRecording: state.wasRecording,
                hadActiveSession: state.hadActiveSession
            };

        } catch (error) {
            console.error('❌ [HISTORY] Error in clearAllSessionsFromHistory:', error);
            throw error;
        }
    }

};