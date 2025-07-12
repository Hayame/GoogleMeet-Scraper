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
    initializeSessionHistory() {
        return new Promise((resolve) => {
            // Load session history from storage
            chrome.storage.local.get(['sessionHistory'], (result) => {
                try {
                    window.sessionHistory = result.sessionHistory || [];
                    console.log('📁 [HISTORY] Loaded session history:', window.sessionHistory.length, 'sessions');
                    
                    // Render the session history UI
                    if (window.SessionUIManager && window.SessionUIManager.renderSessionHistory) {
                        window.SessionUIManager.renderSessionHistory();
                    }
                    
                    // Add event listeners for history UI INSIDE the Promise
                    const newSessionBtn = document.getElementById('newSessionBtn');
                    if (newSessionBtn) {
                        // Remove existing event listeners to prevent duplicates
                        newSessionBtn.removeEventListener('click', window.createNewSession);
                        newSessionBtn.addEventListener('click', window.createNewSession);
                        console.log('📁 [HISTORY] New session button event listener added');
                    } else {
                        console.error('New session button not found');
                    }
                    
                    resolve();
                } catch (error) {
                    console.error('Error loading session history:', error);
                    window.sessionHistory = [];
                    if (window.SessionUIManager && window.SessionUIManager.renderSessionHistory) {
                        window.SessionUIManager.renderSessionHistory();
                    }
                    resolve();
                }
            });
        });
    },

    /**
     * Auto-save current session to history
     * Source: popup.js lines 1823-1893
     */
    autoSaveCurrentSession(data = null) {
        if (!window.transcriptData || window.transcriptData.messages.length === 0) {
            return;
        }
        
        // Simplified: just use all messages from transcriptData
        const validMessages = window.transcriptData.messages;
        
        const sessionId = window.currentSessionId || window.generateSessionId();
        const uniqueParticipants = new Set(validMessages.map(m => m.speaker)).size;
        
        // Check if session already exists and preserve its original date and title
        const existingIndex = window.sessionHistory.findIndex(s => s.id === sessionId);
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
        
        console.log('🔄 [AUTOSAVE DEBUG] Creating session with:', {
            id: sessionId,
            entryCount: validMessages.length,
            participantCount: uniqueParticipants
        });
        
        if (existingIndex >= 0) {
            window.sessionHistory[existingIndex] = session;
            console.log('🔄 [AUTOSAVE DEBUG] Updated existing session in history');
        } else {
            window.sessionHistory.unshift(session);
            console.log('🔄 [AUTOSAVE DEBUG] Added new session to history');
        }
        
        // Limit history to 50 sessions
        if (window.sessionHistory.length > 50) {
            window.sessionHistory = window.sessionHistory.slice(0, 50);
        }
        
        // Save to storage silently (no status message)
        chrome.storage.local.set({ sessionHistory: window.sessionHistory }, () => {
            if (window.SessionUIManager && window.SessionUIManager.renderSessionHistory) {
                window.SessionUIManager.renderSessionHistory();
            }
            console.log('🔄 [AUTOSAVE DEBUG] Session saved to storage and history rendered');
            
            // Highlight the new/updated session if it's the current one
            if (sessionId === window.currentSessionId && existingIndex < 0) {
                // New session was added, it will be highlighted automatically by renderSessionHistory
            }
        });
    },

    /**
     * Load a session from history
     * Source: popup.js lines 1961-1983
     */
    loadSessionFromHistory(sessionId) {
        const session = window.sessionHistory.find(s => s.id === sessionId);
        if (!session) {
            console.error('Session not found:', sessionId);
            window.updateStatus('Nie znaleziono sesji', 'error');
            return;
        }
        
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
        this.performLoadSession(session);
    },

    /**
     * Perform the actual session loading
     * Source: popup.js lines 1985-2030
     */
    performLoadSession(session) {
        // Load the session
        window.transcriptData = session.transcript;
        window.currentSessionId = session.id;
        window.StateManager?.setRecordingStartTime(null); // Historic sessions don't have active recording
        window.StateManager?.setSessionStartTime(null); // Historic sessions don't need session start time
        window.StateManager?.setSessionTotalDuration(session.totalDuration || 0); // Load total duration
        
        // Reset search and filters
        window.resetSearch();
        window.resetParticipantFilters();
        
        // Stop any existing timer and ensure recording is stopped
        window.stopDurationTimer();
        
        window.displayTranscript(window.transcriptData);
        window.updateStats(window.transcriptData);
        window.updateDurationDisplay();
        
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        if (exportTxtBtn) {
            exportTxtBtn.disabled = false;
        }
        
        // Update storage (historic sessions are never recording)
        chrome.storage.local.set({ 
            transcriptData: window.transcriptData,
            currentSessionId: window.currentSessionId,
            recordingStartTime: null,
            realtimeMode: false
        });
        
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
    performDeleteSession(sessionId) {
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
            
            chrome.storage.local.remove(['transcriptData', 'currentSessionId', 'recordingStartTime', 'sessionStartTime', 'sessionTotalDuration', 'currentSessionDuration', 'meetTabId']);
        }
        
        // Save updated history
        chrome.storage.local.set({ sessionHistory: window.sessionHistory }, () => {
            if (window.SessionUIManager && window.SessionUIManager.renderSessionHistory) {
                window.SessionUIManager.renderSessionHistory();
            }
            
            // Update clear button state after deletion
            if (window.updateClearButtonState) {
                window.updateClearButtonState();
            }
            
            window.updateStatus('Sesja usunięta', 'success');
        });
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
                this.performLoadSession(sessionToLoad);
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
     * Initialize SessionHistoryManager module
     */
    initialize() {
        console.log('📚 [SESSION] SessionHistoryManager initialized');
        this.initializeSessionHistory();
    }

};