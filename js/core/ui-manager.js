/**
 * UI Manager Module
 * Handles button visibility, UI state management, and status updates
 */

window.UIManager = {
    /**
     * Update button visibility based on session state: 'RECORDING', 'HISTORICAL', or 'NEW'
     */
    updateButtonVisibility(sessionState) {
        const recordBtn = document.getElementById('recordBtn');
        const closeSessionBtn = document.getElementById('closeSessionBtn');
        const refreshBtn = document.getElementById('refreshTranscriptBtn');
        const quickCopyBtn = document.getElementById('quickCopyBtn');
        const exportBtn = document.getElementById('exportBtn');
        const clearBtn = document.getElementById('clearBtn');
        const statsBtn = document.getElementById('statsBtn');
        const recordText = document.querySelector('.record-text');

        if (!recordBtn || !closeSessionBtn) {
            console.error('Required buttons not found for visibility update');
            return;
        }

        // Data-dependent UI: only visible when transcript has content
        const hasTranscriptData = window.transcriptData?.messages?.length > 0;
        const dataDisplay = hasTranscriptData ? 'flex' : 'none';
        const actionGroupLeft = document.getElementById('actionGroupLeft');
        const separator = document.getElementById('actionSeparator');
        if (actionGroupLeft) actionGroupLeft.style.display = dataDisplay;
        if (separator) separator.style.display = hasTranscriptData ? 'block' : 'none';
        if (quickCopyBtn) quickCopyBtn.style.display = dataDisplay;
        if (exportBtn) exportBtn.style.display = dataDisplay;
        if (clearBtn) clearBtn.style.display = dataDisplay;
        if (statsBtn) statsBtn.style.display = dataDisplay;

        switch (sessionState) {
            case 'RECORDING':
                recordBtn.style.display = 'flex';
                recordBtn.classList.add('active');
                closeSessionBtn.style.display = 'none';
                if (refreshBtn) {
                    refreshBtn.style.display = 'flex';
                    refreshBtn.style.alignItems = 'center';
                    refreshBtn.style.gap = '6px';
                    refreshBtn.style.marginLeft = 'auto';
                }
                if (recordText) recordText.textContent = 'Zatrzymaj nagrywanie';
                break;

            case 'HISTORICAL':
                recordBtn.style.display = 'none';
                closeSessionBtn.style.display = 'block';
                if (refreshBtn) refreshBtn.style.display = 'none';
                break;

            case 'NEW':
            default:
                recordBtn.style.display = 'flex';
                recordBtn.classList.remove('active');
                closeSessionBtn.style.display = 'none';
                if (refreshBtn) refreshBtn.style.display = 'none';
                if (recordText) recordText.textContent = 'Rozpocznij nagrywanie';
                break;
        }
    },

    /**
     * Initialize status visibility (hide by default)
     */
    initializeStatusVisibility() {
        const statusDiv = document.getElementById('recordingStatus');
        if (!statusDiv) {
            return;
        }
        
        // Hide status elements by default (will be shown only during recording)
        const statusText = statusDiv.querySelector('.status-text');
        const statusDot = statusDiv.querySelector('.status-dot');
        if (statusText) statusText.style.display = 'none';
        if (statusDot) statusDot.style.display = 'none';
    },

    /**
     * Show meeting name for historical sessions
     * @param {string} meetingTitle - The meeting title to display
     * @param {string} sessionId - The session ID
     */
    showMeetingName(meetingTitle, sessionId) {
        // Cancel any ongoing title editing before showing new meeting name
        this.cancelMeetingNameEdit();
        
        const statusDiv = document.getElementById('recordingStatus');
        if (!statusDiv) {
            console.error('Status div not found');
            return;
        }
        
        // Hide status elements and show meeting name using existing HTML structure
        const statusDot = statusDiv.querySelector('.status-dot');
        const statusText = statusDiv.querySelector('.status-text');
        const meetingNameContainer = statusDiv.querySelector('.meeting-name-container');
        const meetingNameText = statusDiv.querySelector('.meeting-name-text');
        
        if (statusDot) statusDot.style.display = 'none';
        if (statusText) statusText.style.display = 'none';
        
        if (meetingNameContainer && meetingNameText) {
            // Set the meeting title and session ID
            meetingNameText.textContent = meetingTitle;
            meetingNameText.setAttribute('data-session-id', sessionId);
            
            // Show meeting name container
            meetingNameContainer.style.display = 'block';
            
            // Setup click handler for editing
            meetingNameText.onclick = () => this.startMeetingNameEdit();
        }
        
        // Show the status div
        statusDiv.style.display = 'flex';
        
        // Initialize editing functionality
        this.initializeMeetingNameEditing();
    },

    /**
     * Hide meeting name display
     */
    hideMeetingName() {
        const statusDiv = document.getElementById('recordingStatus');
        if (!statusDiv) {
            return;
        }
        
        // Hide meeting name container and restore status elements visibility
        const meetingNameContainer = statusDiv.querySelector('.meeting-name-container');
        if (meetingNameContainer) {
            meetingNameContainer.style.display = 'none';
        }
        
        // Hide the entire status div for empty sessions
        statusDiv.style.display = 'none';
    },

    /**
     * Initialize meeting name editing functionality
     */
    initializeMeetingNameEditing() {
        const editBtn = document.querySelector('.edit-meeting-name');
        if (!editBtn) return;
        
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.startMeetingNameEdit();
        });
    },

    /**
     * Start meeting name editing mode
     */
    startMeetingNameEdit() {
        const meetingNameDisplay = document.querySelector('.meeting-name-display');
        const meetingNameEdit = document.querySelector('.meeting-name-edit');
        const meetingNameText = document.querySelector('.meeting-name-text');
        const meetingNameInput = document.querySelector('.meeting-name-input');
        
        if (!meetingNameDisplay || !meetingNameEdit || !meetingNameText || !meetingNameInput) return;
        
        const currentText = meetingNameText.textContent;
        
        // Switch to edit mode using existing HTML structure
        meetingNameDisplay.style.display = 'none';
        meetingNameEdit.style.display = 'flex';
        
        // Set input value and focus
        meetingNameInput.value = currentText;
        meetingNameInput.focus();
        meetingNameInput.select();
        
        // Setup event listeners for save/cancel buttons (already exist in HTML)
        const saveBtn = document.querySelector('.meeting-name-save');
        const cancelBtn = document.querySelector('.meeting-name-cancel');
        
        if (saveBtn) saveBtn.onclick = () => this.saveMeetingNameEdit();
        if (cancelBtn) cancelBtn.onclick = () => this.cancelMeetingNameEdit();
        
        meetingNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.saveMeetingNameEdit();
            } else if (e.key === 'Escape') {
                this.cancelMeetingNameEdit();
            }
        });
    },

    /**
     * Cancel meeting name editing
     */
    cancelMeetingNameEdit() {
        const meetingNameDisplay = document.querySelector('.meeting-name-display');
        const meetingNameEdit = document.querySelector('.meeting-name-edit');
        
        if (!meetingNameDisplay || !meetingNameEdit) return;
        
        // Switch back to display mode without reloading
        meetingNameEdit.style.display = 'none';
        meetingNameDisplay.style.display = 'block';
    },

    /**
     * Save meeting name edit
     */
    saveMeetingNameEdit() {
        const meetingTitle = document.querySelector('.meeting-name-text');
        const input = document.querySelector('.meeting-name-input');

        if (!meetingTitle || !input) return;

        const newName = input.value.trim();
        const sessionId = meetingTitle.getAttribute('data-session-id');

        if (!newName) {
            this.cancelMeetingNameEdit();
            return;
        }

        // Persist the updated name to storage
        window.StorageManager.getStorageData(['sessionHistory']).then((result) => {
            const sessionHistory = result.sessionHistory || [];
            const sessionIndex = sessionHistory.findIndex(s => s.id === sessionId);

            if (sessionIndex !== -1) {
                sessionHistory[sessionIndex].title = newName;
                window.sessionHistory = sessionHistory;

                window.StorageManager.saveSessionHistory(sessionHistory).then(() => {
                    if (window.renderSessionHistory) {
                        window.renderSessionHistory();
                    }
                });
            }
        });

        // Update display text and switch back to display mode
        meetingTitle.textContent = newName;
        this.cancelMeetingNameEdit();

        this.updateStatus(`Zmieniono nazwę na: ${newName}`, 'success');
    },

    /**
     * Update status message and dot indicator
     * @param {string} message - Status message (empty string to hide)
     * @param {string} type - 'success', 'error', 'info', or ''
     */
    updateStatus(message, type = '') {
        const statusDiv = document.getElementById('recordingStatus');
        if (!statusDiv) {
            console.error('Status div not found');
            return;
        }

        const statusText = statusDiv.querySelector('.status-text');
        const statusDot = statusDiv.querySelector('.status-dot');

        if (!message) {
            if (statusText) statusText.style.display = 'none';
            if (statusDot) statusDot.style.display = 'none';
            return;
        }

        // Don't show status text when meeting name is displayed (historical session)
        if (statusDiv.querySelector('.meeting-name-display')) return;

        if (statusText) {
            statusText.textContent = message;
            statusText.style.display = 'block';
        }
        if (statusDot) {
            statusDot.style.display = 'block';
            statusDot.className = `status-dot ${type}`;
        }

        statusDiv.style.display = 'flex';

        if (type === 'success') {
            setTimeout(() => this.updateStatus('', ''), 3000);
        }
    },

    /**
     * Format seconds to H:MM:SS or M:SS display string
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    },

    initialize() {
        console.log('🎨 [UI] UIManager initialized');
        this.initializeStatusVisibility();
        this.setupGlobalAliases();
    },

    setupGlobalAliases() {
        window.updateButtonVisibility = this.updateButtonVisibility.bind(this);
        window.updateStatus = this.updateStatus.bind(this);
        window.showMeetingName = this.showMeetingName.bind(this);
        window.hideMeetingName = this.hideMeetingName.bind(this);
        window.showInitializationError = this.showInitializationError.bind(this);
        window.formatDuration = this.formatDuration.bind(this);
        console.log('🔗 [UI] Global UI aliases created');
    },

    async toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        sidebar.classList.toggle('collapsed');
        const isNowCollapsed = sidebar.classList.contains('collapsed');

        await window.StateManager.saveUIState({ sidebarCollapsed: isNowCollapsed });

        if (window.SessionUIManager?.updateSessionTooltips) {
            window.SessionUIManager.updateSessionTooltips();
        }

        console.log('📐 [UI] Sidebar toggled, collapsed:', isNowCollapsed);
    },

    async saveCurrentUIState() {
        const sidebar = document.querySelector('.sidebar');
        const uiState = {
            sidebarCollapsed: sidebar?.classList.contains('collapsed') || false,
            theme: document.documentElement.getAttribute('data-theme') || 'light',
            searchPanelOpen: false,
            filterPanelOpen: false
        };

        if (window.SearchFilterManager) {
            uiState.searchQuery = window.SearchFilterManager.getCurrentSearchQuery() || '';
            uiState.activeParticipantFilters = Array.from(window.SearchFilterManager.getActiveParticipantFilters() || []);
        }

        await window.StateManager.saveUIState(uiState);
    },

    /**
     * Restore UI state from provided state object
     */
    restoreUIState(uiState) {
        console.log('🎨 [UI] Restoring UI state:', uiState);

        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed', !!uiState.sidebarCollapsed);
        }

        if (uiState.theme) {
            document.documentElement.setAttribute('data-theme', uiState.theme);
            window.ThemeManager?.updateThemeToggleIcon?.(uiState.theme);
        }

        if (window.SearchFilterManager?.restoreFilterState) {
            window.SearchFilterManager.restoreFilterState(uiState);
        }
    },

    /**
     * Show initialization error to user
     * @param {Error} error - The error that occurred during initialization
     */
    showInitializationError(error) {
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
        
        console.error('❌ [UI] Initialization error displayed:', error.message);
    }
};