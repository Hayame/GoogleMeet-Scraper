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
        const statusDiv = document.getElementById('recordingStatus');
        if (!statusDiv) {
            console.error('Status div not found');
            return;
        }
        
        // Create meeting name display
        statusDiv.innerHTML = `
            <div class="meeting-name-display">
                <span class="meeting-title" data-session-id="${sessionId}">${meetingTitle}</span>
                <button class="edit-meeting-name" title="Edytuj nazwę sesji">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                </button>
            </div>
        `;
        
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
        
        // Hide the entire status div for empty sessions
        statusDiv.style.display = 'none';
        statusDiv.innerHTML = `
            <div class="status-dot"></div>
            <span class="status-text"></span>
        `;
        
        // Reset default status structure
        const statusText = statusDiv.querySelector('.status-text');
        const statusDot = statusDiv.querySelector('.status-dot');
        if (statusText) statusText.style.display = 'none';
        if (statusDot) statusDot.style.display = 'none';
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
        const meetingTitle = document.querySelector('.meeting-title');
        if (!meetingTitle) return;
        
        const currentText = meetingTitle.textContent;
        const sessionId = meetingTitle.getAttribute('data-session-id');
        
        meetingTitle.innerHTML = `
            <input type="text" class="meeting-name-input" value="${currentText}" maxlength="100">
            <div class="meeting-name-controls">
                <button class="save-meeting-name" title="Zapisz">✓</button>
                <button class="cancel-meeting-name" title="Anuluj">✕</button>
            </div>
        `;
        
        const input = meetingTitle.querySelector('.meeting-name-input');
        input.focus();
        input.select();
        
        // Setup event listeners
        const saveBtn = meetingTitle.querySelector('.save-meeting-name');
        const cancelBtn = meetingTitle.querySelector('.cancel-meeting-name');
        
        saveBtn.addEventListener('click', () => this.saveMeetingNameEdit());
        cancelBtn.addEventListener('click', () => this.cancelMeetingNameEdit());
        
        input.addEventListener('keydown', (e) => {
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
        const meetingTitle = document.querySelector('.meeting-title');
        if (!meetingTitle) return;
        
        const sessionId = meetingTitle.getAttribute('data-session-id');
        
        // Restore original title
        chrome.storage.local.get(['sessionHistory'], (result) => {
            const sessionHistory = result.sessionHistory || [];
            const session = sessionHistory.find(s => s.id === sessionId);
            if (session) {
                this.showMeetingName(session.title, sessionId);
            }
        });
    },

    /**
     * Save meeting name edit
     * Extracted from popup.js lines 889-933
     */
    saveMeetingNameEdit() {
        const meetingTitle = document.querySelector('.meeting-title');
        const input = document.querySelector('.meeting-name-input');
        
        if (!meetingTitle || !input) return;
        
        const newName = input.value.trim();
        const sessionId = meetingTitle.getAttribute('data-session-id');
        
        if (!newName) {
            this.cancelMeetingNameEdit();
            return;
        }
        
        // Update session in storage
        chrome.storage.local.get(['sessionHistory'], (result) => {
            const sessionHistory = result.sessionHistory || [];
            const sessionIndex = sessionHistory.findIndex(s => s.id === sessionId);
            
            if (sessionIndex !== -1) {
                sessionHistory[sessionIndex].title = newName;
                chrome.storage.local.set({ sessionHistory }, () => {
                    // Re-render session history to update the sidebar
                    if (window.renderSessionHistory) {
                        window.renderSessionHistory();
                    }
                });
            }
        });
        
        // Show success message briefly
        this.updateStatus(`Zmieniono nazwę na: ${newName}`, 'success');
        setTimeout(() => {
            this.showMeetingName(newName, sessionId);
        }, 2000);
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

    // REMOVED: updateDurationDisplay() - Moved to TimerManager (more comprehensive implementation)

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
        // NOTE: updateDurationDisplay is now handled by TimerManager
        window.formatDuration = this.formatDuration.bind(this);
        
        console.log('🔗 [UI] Global function aliases created for backward compatibility');
    }
};