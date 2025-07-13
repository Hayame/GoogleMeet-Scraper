/**
 * UI Manager Module
 * Handles button visibility, UI state management, and status updates
 * Extracted from popup.js lines: 690-741, 988-1036, 1494-1531
 */

window.UIManager = {
    /**
     * Centralized UI state management for button visibility
     * Extracted from popup.js lines 690-722
     * @param {string} sessionState - 'RECORDING', 'HISTORICAL', or 'NEW'
     */
    updateButtonVisibility(sessionState) {
        const recordBtn = document.getElementById('recordBtn');
        const closeSessionBtn = document.getElementById('closeSessionBtn');
        
        if (!recordBtn || !closeSessionBtn) {
            console.error('Required buttons not found for visibility update');
            return;
        }
        
        switch (sessionState) {
            case 'RECORDING':
                // During recording: show stop button, hide close button  
                recordBtn.style.display = 'flex';
                recordBtn.classList.add('active');
                closeSessionBtn.style.display = 'none';
                
                // CRITICAL FIX: Set proper button text for recording mode
                const recordTextRecording = document.querySelector('.record-text');
                if (recordTextRecording) {
                    recordTextRecording.textContent = 'Zatrzymaj nagrywanie';
                }
                break;
                
            case 'HISTORICAL':
                // Historical session: hide record button, show close button
                recordBtn.style.display = 'none';
                closeSessionBtn.style.display = 'block';
                break;
                
            case 'NEW':
            default:
                // New session: show record button (inactive), hide close button
                recordBtn.style.display = 'flex';
                recordBtn.classList.remove('active');
                closeSessionBtn.style.display = 'none';
                const recordText = document.querySelector('.record-text');
                if (recordText) {
                    recordText.textContent = 'Rozpocznij nagrywanie';
                }
                break;
        }
    },

    /**
     * Initialize status visibility (hide by default)
     * Extracted from popup.js lines 724-735
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
     * Extracted from popup.js lines 744-771
     * @param {string} meetingTitle - The meeting title to display
     * @param {string} sessionId - The session ID
     */
    showMeetingName(meetingTitle, sessionId) {
        // CRITICAL FIX: Cancel any ongoing title editing before showing new meeting name
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
     * Extracted from popup.js lines 773-791
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
     * Extracted from popup.js lines 802-851
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
     * Extracted from popup.js lines 852-875
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
     * Extracted from popup.js lines 876-888
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
     * Extracted from popup.js lines 889-933
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
        
        // Update session in storage using StorageManager
        if (window.StorageManager) {
            window.StorageManager.getStorageData(['sessionHistory']).then((result) => {
                const sessionHistory = result.sessionHistory || [];
                const sessionIndex = sessionHistory.findIndex(s => s.id === sessionId);
                
                if (sessionIndex !== -1) {
                    sessionHistory[sessionIndex].title = newName;
                    
                    // CRITICAL FIX: Update global sessionHistory variable
                    window.sessionHistory = sessionHistory;
                    
                    window.StorageManager.saveSessionHistory(sessionHistory).then(() => {
                        // Re-render session history to update the sidebar
                        if (window.renderSessionHistory) {
                            window.renderSessionHistory();
                        }
                    });
                }
            });
        } else {
            // Fallback to direct storage
            chrome.storage.local.get(['sessionHistory'], (result) => {
                const sessionHistory = result.sessionHistory || [];
                const sessionIndex = sessionHistory.findIndex(s => s.id === sessionId);
                
                if (sessionIndex !== -1) {
                    sessionHistory[sessionIndex].title = newName;
                    
                    // CRITICAL FIX: Update global sessionHistory variable
                    window.sessionHistory = sessionHistory;
                    
                    chrome.storage.local.set({ sessionHistory }, () => {
                        if (window.renderSessionHistory) {
                            window.renderSessionHistory();
                        }
                    });
                }
            });
        }
        
        // Update display text and switch back to display mode
        const meetingNameText = document.querySelector('.meeting-name-text');
        const meetingNameDisplay = document.querySelector('.meeting-name-display');
        const meetingNameEdit = document.querySelector('.meeting-name-edit');
        
        if (meetingNameText) {
            meetingNameText.textContent = newName;
        }
        
        // Switch back to display mode
        if (meetingNameDisplay && meetingNameEdit) {
            meetingNameEdit.style.display = 'none';
            meetingNameDisplay.style.display = 'block';
        }
        
        // Show success message briefly
        this.updateStatus(`Zmieniono nazwę na: ${newName}`, 'success');
    },

    /**
     * Update status message and appearance
     * Extracted from popup.js lines 988-1036
     * @param {string} message - Status message to display
     * @param {string} type - Status type: 'success', 'error', 'info', or ''
     */
    updateStatus(message, type = '') {
        const statusDiv = document.getElementById('recordingStatus');
        if (!statusDiv) {
            console.error('Status div not found');
            return;
        }
        
        const statusText = statusDiv.querySelector('.status-text');
        const statusDot = statusDiv.querySelector('.status-dot');
        
        // Check if meeting name is currently visible
        const isMeetingNameVisible = statusDiv.querySelector('.meeting-name-display');
        
        if (!message) {
            // Hide status when no message
            if (statusText) statusText.style.display = 'none';
            if (statusDot) statusDot.style.display = 'none';
            return;
        } else if (isMeetingNameVisible) {
            // Historical session - status should already be hidden by showMeetingName
            return;
        }
        
        // Show status elements
        if (statusText) {
            statusText.textContent = message;
            statusText.style.display = 'block';
        }
        
        if (statusDot) {
            statusDot.style.display = 'block';
            statusDot.className = `status-dot ${type}`;
        }
        
        // Show the status container
        statusDiv.style.display = 'flex';
        
        // Auto-hide success messages after delay
        if (type === 'success') {
            setTimeout(() => {
                this.updateStatus('', '');
            }, 3000);
        }
    },


    /**
     * Format duration in seconds to HH:MM:SS or MM:SS format
     * Extracted from popup.js lines 2606-2616
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration string
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    },

    /**
     * Initialize UI Manager module
     */
    initialize() {
        console.log('🎨 [UI] UIManager initialized');
        this.initializeStatusVisibility();
        
        // Set up global aliases for backward compatibility
        this.setupGlobalAliases();
    },

    /**
     * Set up global function aliases for backward compatibility
     * This fixes the critical bug where other modules expect global functions
     */
    setupGlobalAliases() {
        // Critical fix: Expose UI functions globally as expected by other modules
        window.updateButtonVisibility = this.updateButtonVisibility.bind(this);
        window.updateStatus = this.updateStatus.bind(this);
        window.showMeetingName = this.showMeetingName.bind(this);
        window.hideMeetingName = this.hideMeetingName.bind(this);
        window.showInitializationError = this.showInitializationError.bind(this);
        // NOTE: updateDurationDisplay is now handled by TimerManager
        window.formatDuration = this.formatDuration.bind(this);
        
        console.log('🔗 [UI] Global function aliases created for backward compatibility');
    },

    /**
     * Toggle sidebar collapsed state and save to storage
     */
    async toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        
        const wasCollapsed = sidebar.classList.contains('collapsed');
        sidebar.classList.toggle('collapsed');
        const isNowCollapsed = sidebar.classList.contains('collapsed');
        
        // Save state to storage
        await window.StateManager.saveUIState({
            sidebarCollapsed: isNowCollapsed
        });
        
        // CRITICAL FIX: Update tooltips after sidebar state change
        // When sidebar is collapsed, show tooltips; when expanded, hide them
        if (window.SessionUIManager && window.SessionUIManager.updateSessionTooltips) {
            window.SessionUIManager.updateSessionTooltips();
            console.log('🔍 [UI] Session tooltips updated after sidebar toggle');
        }
        
        console.log('📐 [UI] Sidebar toggled, collapsed:', isNowCollapsed);
    },

    /**
     * Save current UI state to storage
     */
    async saveCurrentUIState() {
        const sidebar = document.querySelector('.sidebar');
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        
        const uiState = {
            sidebarCollapsed: sidebar?.classList.contains('collapsed') || false,
            theme: currentTheme,
            searchPanelOpen: false, // TODO: implement when search panel state tracking is added
            filterPanelOpen: false  // TODO: implement when filter panel state tracking is added
        };
        
        await window.StateManager.saveUIState(uiState);
        console.log('💾 [UI] Current UI state saved:', uiState);
    },

    /**
     * Restore UI state from provided state object
     * Centralized UI state restoration to ensure consistency
     */
    restoreUIState(uiState) {
        console.log('🎨 [UI] Restoring UI state through UIManager:', uiState);
        
        // CRITICAL FIX: Restore sidebar collapsed state properly
        // Previous code only ADDED collapsed class, never REMOVED it
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            if (uiState.sidebarCollapsed) {
                sidebar.classList.add('collapsed');
                console.log('📐 [UI] Sidebar restored to collapsed state');
            } else {
                sidebar.classList.remove('collapsed');
                console.log('📐 [UI] Sidebar restored to expanded state');
            }
        }
        
        // Restore theme (ensure consistency with theme system)
        if (uiState.theme && uiState.theme !== 'light') {
            document.documentElement.setAttribute('data-theme', uiState.theme);
            console.log('🎨 [UI] Theme restored:', uiState.theme);
        }
        
        // TODO: Restore search and filter panel states when implemented
        // if (uiState.searchPanelOpen) { ... }
        // if (uiState.filterPanelOpen) { ... }
        
        // CRITICAL FIX: Save the restored UI state back to storage
        // This ensures the restored state persists for next popup open
        this.saveCurrentUIState();
        console.log('💾 [UI] Restored UI state saved to storage');
    },

    /**
     * Show initialization error to user
     * Extracted from popup.js for better modularity
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