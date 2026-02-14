/**
 * Session History Management Module
 * Handles CRUD operations for session history
 */

window.SessionHistoryManager = {
    /**
     * Reset all session-related state in StateManager
     * @private
     */
    _resetSessionState() {
        window.StateManager?.setRecordingStartTime(null);
        window.StateManager?.setSessionStartTime(null);
        window.StateManager?.setSessionTotalDuration(0);
        window.StateManager?.setRecordingStopped(false);
        window.StateManager?.setRecordingPaused(false);
    },

    /**
     * Initialize session history from storage
     */
    async initializeSessionHistory() {
        try {
            const result = await window.StorageManager.getStorageData(['sessionHistory']);
            window.sessionHistory = result.sessionHistory || [];
            console.log('📁 [HISTORY] Loaded session history:', window.sessionHistory.length, 'sessions');
        } catch (error) {
            console.error('❌ [HISTORY] Error loading session history:', error);
            window.sessionHistory = [];
        }

        window.SessionUIManager?.renderSessionHistory?.();

        const newSessionBtn = document.getElementById('newSessionBtn');
        if (newSessionBtn) {
            newSessionBtn.removeEventListener('click', window.createNewSession);
            newSessionBtn.addEventListener('click', window.createNewSession);
        }
    },

    /**
     * Auto-save current session to history
     * Automatically persists the current transcript session to history
     */
    async autoSaveCurrentSession() {
        if (!window.transcriptData?.messages?.length) {
            return;
        }

        if (window.StateManager?.isRestorationInProgress()) {
            console.log('🔄 [SESSION AUTOSAVE] Skipping - state restoration in progress');
            return;
        }

        const validMessages = window.transcriptData.messages;
        const sessionId = window.currentSessionId || window.generateSessionId();
        const uniqueParticipants = new Set(validMessages.map(m => m.speaker)).size;

        // If session history is not loaded, check storage to prevent duplicates
        if (!window.sessionHistory?.length) {
            const result = await window.StorageManager.getStorageData(['sessionHistory']);
            const storageHistory = result.sessionHistory || [];
            if (storageHistory.find(s => s.id === sessionId)) {
                console.log('🔄 [SESSION AUTOSAVE] Session already exists in storage, skipping');
                return;
            }
        }

        await this._performAutoSave(sessionId, validMessages, uniqueParticipants);
    },

    /**
     * Internal method to perform the actual auto-save
     * Updates existing session or creates new entry in history
     * @private
     * @returns {Promise<void>}
     */
    async _performAutoSave(sessionId, validMessages, uniqueParticipants) {
        const existingIndex = window.sessionHistory.findIndex(s => s.id === sessionId);
        const isUpdate = existingIndex >= 0;

        const session = {
            id: sessionId,
            title: isUpdate ? window.sessionHistory[existingIndex].title : window.generateSessionTitle(),
            date: isUpdate ? window.sessionHistory[existingIndex].date : new Date().toISOString(),
            participantCount: uniqueParticipants,
            entryCount: validMessages.length,
            transcript: {
                messages: validMessages,
                scrapedAt: window.transcriptData.scrapedAt,
                meetingUrl: window.transcriptData.meetingUrl
            },
            totalDuration: window.TimerManager?.getTotalDuration()
                ?? (window.StateManager?.getSessionTotalDuration() || 0)
        };

        if (isUpdate) {
            window.sessionHistory[existingIndex] = session;
        } else {
            window.sessionHistory.unshift(session);
        }

        if (window.sessionHistory.length > 50) {
            window.sessionHistory = window.sessionHistory.slice(0, 50);
        }

        const saveResult = await window.TransactionCoordinator.executeTransaction([
            { key: window.AppConstants.STORAGE_KEYS.SESSION_HISTORY, value: window.sessionHistory },
            { key: window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID, value: window.currentSessionId }
        ]);

        if (!saveResult.success) {
            console.error('❌ [SESSION AUTOSAVE] Failed to save:', saveResult.error);
            return;
        }

        console.log('✅ [SESSION AUTOSAVE] Session', isUpdate ? 'updated' : 'added', 'in', saveResult.duration, 'ms');
        window.SessionUIManager?.renderSessionHistory?.();
    },

    /**
     * Load a session from history
     * Handles session switching with recording state management
     */
    loadSessionFromHistory(sessionId) {
        window.UIManager?.cancelMeetingNameEdit?.();

        const session = window.sessionHistory?.find(s => s.id === sessionId);
        if (!session) {
            console.error('❌ [SESSION] Session not found:', sessionId);
            window.updateStatus?.('Nie znaleziono sesji', 'error');
            return;
        }

        if (window.realtimeMode && sessionId === window.currentSessionId) {
            return;
        }

        if (window.realtimeMode) {
            this.showStopRecordingConfirmation(sessionId);
            return;
        }

        this.performLoadSession(session, true);
    },

    /**
     * Perform the actual session loading
     * Loads historical session data and updates UI accordingly
     */
    async performLoadSession(session, shouldResetFilters = false) {
        window.transcriptData = session.transcript;
        window.currentSessionId = session.id;
        window.StateManager?.setRecordingStartTime(null);
        window.StateManager?.setSessionStartTime(null);
        window.StateManager?.setSessionTotalDuration(session.totalDuration || 0);

        if (shouldResetFilters) {
            window.resetSearch();
            window.resetParticipantFilters();
        }

        window.stopDurationTimer();
        window.displayTranscript(window.transcriptData);
        window.updateStats(window.transcriptData);
        window.SearchFilterManager?.completePendingRestoration?.();
        window.updateDurationDisplay();

        const exportTxtBtn = document.getElementById('exportTxtBtn');
        if (exportTxtBtn) {
            exportTxtBtn.disabled = false;
        }

        try {
            await window.StorageManager.setStorageData({
                [window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA]: window.transcriptData,
                [window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID]: window.currentSessionId,
                [window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME]: null,
                [window.AppConstants.STORAGE_KEYS.REALTIME_MODE]: false,
                [window.AppConstants.STORAGE_KEYS.SESSION_STATE]: window.AppConstants.SESSION_STATES.HISTORICAL_SESSION
            });
        } catch (error) {
            console.error('❌ [SESSION] Failed to save historical session state:', error);
        }

        window.showMeetingName(session.title, session.id);
        window.updateButtonVisibility('HISTORICAL');
        window.updateClearButtonState?.();
        window.SessionUIManager?.renderSessionHistory?.();
    },

    /**
     * Delete session from history with event handling
     * Prevents event propagation and shows confirmation dialog
     */
    deleteSessionFromHistory(sessionId, event) {
        event.stopPropagation();
        this.showDeleteConfirmation(sessionId);
    },

    /**
     * Show delete confirmation modal
     * Displays confirmation dialog before deleting a session
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
     * Removes session from history and updates storage
     */
    async performDeleteSession(sessionId) {
        window.sessionHistory = window.sessionHistory.filter(s => s.id !== sessionId);

        if (window.currentSessionId === sessionId) {
            if (window.realtimeMode) {
                window.deactivateRealtimeMode?.();
            }

            window.transcriptData = null;
            window.currentSessionId = null;
            window.displayTranscript({ messages: [] });
            window.updateStats({ messages: [] });

            const exportTxtBtn = document.getElementById('exportTxtBtn');
            if (exportTxtBtn) {
                exportTxtBtn.disabled = true;
            }

            this._resetSessionState();
            window.stopDurationTimer();

            const durationElement = document.getElementById('duration');
            if (durationElement) {
                durationElement.textContent = '0:00';
            }

            window.updateButtonVisibility('NEW');
            window.hideMeetingName();

            const SK = window.AppConstants.STORAGE_KEYS;
            try {
                await window.StorageManager.removeStorageData([
                    SK.TRANSCRIPT_DATA, SK.CURRENT_SESSION_ID,
                    SK.RECORDING_START_TIME, SK.SESSION_START_TIME,
                    SK.SESSION_TOTAL_DURATION, SK.CURRENT_SESSION_DURATION, SK.MEET_TAB_ID
                ]);
            } catch (error) {
                console.error('❌ [DELETE] Failed to remove session keys:', error);
            }
        }

        try {
            await window.StorageManager.saveSessionHistory(window.sessionHistory);
            window.SessionUIManager?.renderSessionHistory?.();
            window.updateClearButtonState?.();
            window.updateStatus('Sesja usunięta', 'success');
        } catch (error) {
            console.error('❌ [DELETE] Failed to save updated history:', error);
            window.updateStatus('Błąd podczas usuwania sesji', 'error');
        }
    },

    /**
     * Show confirmation when trying to load while recording
     * Prompts user to stop recording before loading a different session
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
     * Create new session
     * Stops active recording (if any) and creates a new empty session
     */
    createNewSession() {
        if (window.realtimeMode) {
            window.deactivateRealtimeMode?.();
        }
        this.performNewSessionCreation();
    },

    /**
     * Perform new session creation
     * Clears current session data and initializes new empty session
     */
    async performNewSessionCreation() {
        window.transcriptData = null;
        window.currentSessionId = window.generateSessionId ? window.generateSessionId() : 'session_' + Date.now();

        this._resetSessionState();

        console.log('🆕 [NEW SESSION] Created new session ID:', window.currentSessionId);

        window.SessionUIManager?.renderSessionHistory?.();
        window.stopDurationTimer?.();
        window.resetSearch?.();
        window.resetParticipantFilters?.();
        window.hideMeetingName?.();
        window.displayTranscript?.({ messages: [] });
        window.updateStats?.({ messages: [] });
        window.updateDurationDisplay?.();

        const exportTxtBtn = document.getElementById('exportTxtBtn');
        if (exportTxtBtn) {
            exportTxtBtn.disabled = true;
        }

        window.updateButtonVisibility?.('NEW');

        try {
            await window.StorageManager.removeStorageData([
                window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA,
                window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID,
                window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME,
                window.AppConstants.STORAGE_KEYS.SESSION_START_TIME,
                window.AppConstants.STORAGE_KEYS.SESSION_TOTAL_DURATION,
                window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_DURATION
            ]);
        } catch (error) {
            console.error('❌ [NEW SESSION] Failed to clear storage:', error);
        }
    },

    /**
     * Initialize SessionHistoryManager module
     */
    async initialize() {
        await this.initializeSessionHistory();
        this.setupGlobalAliases();
        console.log('📚 [SESSION] SessionHistoryManager initialized');
    },

    /**
     * Clear current transcript data
     * Clears active transcript and resets session state
     */
    async clearCurrentTranscript() {
        console.log('🧹 [CLEAR] Clearing current transcript');

        if (window.realtimeMode) {
            window.deactivateRealtimeMode?.();
        }

        window.TimerManager?.stopDurationTimer();

        window.transcriptData = null;
        window.currentSessionId = null;
        this._resetSessionState();

        window.displayTranscript?.({ messages: [] });
        window.updateStats?.({ messages: [] });
        window.TimerManager?.updateDurationDisplay();

        const exportTxtBtn = document.getElementById('exportTxtBtn');
        if (exportTxtBtn) {
            exportTxtBtn.disabled = true;
        }

        window.UIManager?.updateStatus('Transkrypcja wyczyszczona', 'info');
        window.UIManager?.updateButtonVisibility('NEW');

        try {
            await window.StorageManager.removeStorageData([
                window.AppConstants.STORAGE_KEYS.TRANSCRIPT_DATA,
                window.AppConstants.STORAGE_KEYS.CURRENT_SESSION_ID,
                window.AppConstants.STORAGE_KEYS.RECORDING_START_TIME,
                window.AppConstants.STORAGE_KEYS.SESSION_START_TIME,
                window.AppConstants.STORAGE_KEYS.MEET_TAB_ID
            ]);
        } catch (error) {
            console.error('❌ [CLEAR] Failed to clear storage:', error);
        }
    },

    /**
     * Show empty session state
     * Displays UI for a new empty session with no data
     */
    showEmptySession() {
        console.log('🆕 [EMPTY SESSION] Showing empty session');

        window.UIManager?.cancelMeetingNameEdit?.();

        window.transcriptData = null;
        window.currentSessionId = null;
        this._resetSessionState();

        window.SearchFilterManager?.resetSearch();
        window.SearchFilterManager?.resetParticipantFilters();
        window.UIManager?.hideMeetingName();
        window.TimerManager?.stopDurationTimer();
        window.displayTranscript?.({ messages: [] });
        window.updateStats?.({ messages: [] });
        window.TranscriptManager?.updateParticipantCountClickability(0);
        window.TimerManager?.updateDurationDisplay();
        window.UIManager?.updateButtonVisibility('NEW');
    },

    setupGlobalAliases() {
        window.createNewSession = this.createNewSession.bind(this);
        window.showEmptySession = this.showEmptySession.bind(this);
        window.performNewSessionCreation = this.performNewSessionCreation.bind(this);
        window.clearCurrentTranscript = this.clearCurrentTranscript.bind(this);
        window.clearCurrentSession = this.clearCurrentSession.bind(this);
    },

    /**
     * Clear current session
     * Handles clearing the currently active session via delete confirmation
     */
    clearCurrentSession(event) {
        if (window.realtimeMode) {
            window.UIManager?.updateStatus('Nie można usunąć sesji podczas nagrywania', 'error');
            return;
        }

        if (window.currentSessionId) {
            this.deleteSessionFromHistory(window.currentSessionId, event || new Event('click'));
        } else {
            window.UIManager?.updateStatus('Brak aktywnej sesji do usunięcia', 'info');
        }
    },

    /**
     * Clear all sessions from history
     * Called by SettingsManager when user confirms clearing all sessions
     */
    async clearAllSessionsFromHistory() {
        try {
            console.log('🗑️ [HISTORY] Clearing all sessions from history...');

            const sessionCount = window.sessionHistory?.length || 0;
            const wasRecording = window.realtimeMode;
            const hadActiveSession = !!(window.currentSessionId && window.transcriptData);

            if (wasRecording) {
                window.deactivateRealtimeMode?.();
            }

            if (hadActiveSession) {
                window.transcriptData = null;
                window.currentSessionId = null;

                window.displayTranscript?.({ messages: [] });
                window.updateStats?.({ messages: [] });
                this._resetSessionState();
                window.stopDurationTimer?.();

                const durationElement = document.getElementById('duration');
                if (durationElement) {
                    durationElement.textContent = '0:00';
                }

                window.updateButtonVisibility?.('NEW');
                window.hideMeetingName?.();

                const exportTxtBtn = document.getElementById('exportTxtBtn');
                if (exportTxtBtn) {
                    exportTxtBtn.disabled = true;
                }
            }

            window.sessionHistory = [];

            const SK = window.AppConstants.STORAGE_KEYS;
            await window.StorageManager.removeStorageData([
                SK.SESSION_HISTORY, SK.TRANSCRIPT_DATA, SK.CURRENT_SESSION_ID,
                SK.RECORDING_START_TIME, SK.SESSION_START_TIME,
                SK.SESSION_TOTAL_DURATION, SK.CURRENT_SESSION_DURATION, SK.MEET_TAB_ID
            ]);

            window.SessionUIManager?.renderSessionHistory?.();

            console.log(`✅ [HISTORY] Cleared ${sessionCount} sessions`);
            return { clearedSessionCount: sessionCount, wasRecording, hadActiveSession };
        } catch (error) {
            console.error('❌ [HISTORY] Error in clearAllSessionsFromHistory:', error);
            throw error;
        }
    }

};