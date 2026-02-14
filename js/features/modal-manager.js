/**
 * Modal Manager Module
 * Handles modal display, hiding, and management functionality
 */

window.ModalManager = {
    /**
     * Initialize modal system with global event handlers
     */
    initializeModalSystem() {
        // ESC key closes the topmost open modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.show');
                if (openModal) {
                    this.hideModal(openModal.id);
                }
            }
        });

        // Single click handler for close buttons and backdrop clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close') && e.target.dataset.modal) {
                this.hideModal(e.target.dataset.modal);
            } else if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });

        this.initializeConfirmModal();
        this.initializeExportModal();
    },

    /**
     * Show modal with optional data
     * @param {string} modalId - ID of modal to show
     * @param {Object} data - Optional data to populate modal with
     */
    showModal(modalId, data = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error('Modal not found:', modalId);
            return;
        }
        
        // Hide any currently open modals
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(m => {
            if (m.id !== modalId) {
                this.hideModal(m.id);
            }
        });
        
        // Populate modal with data if provided
        if (data.title) {
            const titleElement = modal.querySelector('.modal-title');
            if (titleElement) {
                titleElement.textContent = data.title;
            }
        }
        
        if (data.message) {
            const messageElement = modal.querySelector('.modal-message');
            if (messageElement) {
                messageElement.textContent = data.message;
            }
        }
        
        // Show modal
        modal.classList.add('show');
    },

    /**
     * Hide modal by ID
     * @param {string} modalId - ID of modal to hide
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error('Modal not found:', modalId);
            return;
        }
        
        modal.classList.remove('show');
        
        // Reset modal content if needed
        const titleElement = modal.querySelector('.modal-title');
        const messageElement = modal.querySelector('.modal-message');
        
        if (titleElement && titleElement.dataset.defaultTitle) {
            titleElement.textContent = titleElement.dataset.defaultTitle;
        }
        
        if (messageElement && messageElement.dataset.defaultMessage) {
            messageElement.textContent = messageElement.dataset.defaultMessage;
        }
    },

    /**
     * Show delete confirmation modal
     * @param {string} sessionId - ID of session to delete
     */
    showDeleteConfirmation(sessionId) {
        const confirmModal = document.getElementById('confirmModal');
        if (!confirmModal) {
            console.error('Confirm modal not found');
            return;
        }
        
        // Update modal content for delete confirmation
        const confirmTitle = confirmModal.querySelector('.modal-title');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmOk = document.getElementById('confirmOk');
        const confirmCancel = document.getElementById('confirmCancel');
        
        if (confirmTitle) confirmTitle.textContent = 'Potwierdź usunięcie';
        if (confirmMessage) confirmMessage.textContent = 'Czy na pewno chcesz usunąć tę sesję? Ta operacja jest nieodwracalna.';
        
        // Remove existing event listeners by cloning elements
        const newConfirmOk = confirmOk.cloneNode(true);
        const newConfirmCancel = confirmCancel.cloneNode(true);
        confirmOk.parentNode.replaceChild(newConfirmOk, confirmOk);
        confirmCancel.parentNode.replaceChild(newConfirmCancel, confirmCancel);
        
        // Set up event handlers
        newConfirmOk.addEventListener('click', () => {
            if (window.SessionHistoryManager && window.SessionHistoryManager.performDeleteSession) {
                window.SessionHistoryManager.performDeleteSession(sessionId);
            }
            this.hideModal('confirmModal');
        });
        
        newConfirmCancel.addEventListener('click', () => {
            this.hideModal('confirmModal');
        });
        
        // Change button styling
        newConfirmOk.className = 'btn btn-danger';
        newConfirmOk.textContent = 'Usuń';
        
        this.showModal('confirmModal', { title: 'Usuń sesję' });
    },

    /**
     * Show stop recording confirmation modal
     * @param {string} sessionId - ID of session to load after stopping recording
     */
    showStopRecordingConfirmation(sessionId) {
        // Check if we're actually recording
        if (!window.realtimeMode) {
            console.log('Not recording, loading session directly');
            if (window.loadSessionFromHistory) {
                window.loadSessionFromHistory(sessionId);
            }
            return;
        }
        
        // Store the session ID to load after confirmation
        window.pendingSessionToLoad = sessionId;
        
        // Populate modal with current session information
        this.populateStopRecordingModalContent();
        
        // Show the confirmation modal
        this.showModal('stopRecordingModal');
        
        // Initialize event listeners for this confirmation
        this.initializeStopRecordingModalEventListeners();
    },

    /**
     * Populate stop recording modal with current session information
     */
    populateStopRecordingModalContent() {
        const modal = document.getElementById('stopRecordingModal');
        if (!modal) return;
        
        const modalBody = modal.querySelector('.modal-body');
        if (!modalBody) return;
        
        // Get current session data
        const currentSessionTitle = this.getCurrentSessionTitle();
        const recordingDuration = this.getCurrentRecordingDuration();
        const participantCount = this.getCurrentParticipantCount();
        const entryCount = window.transcriptData?.messages?.length || 0;
        
        // Check if session info already exists and update it, or create new one
        let sessionInfoDiv = modalBody.querySelector('.current-session-info');
        if (!sessionInfoDiv) {
            sessionInfoDiv = document.createElement('div');
            sessionInfoDiv.className = 'current-session-info';
            
            // Insert after the first paragraph (main question)
            const firstParagraph = modalBody.querySelector('p');
            if (firstParagraph && firstParagraph.nextSibling) {
                modalBody.insertBefore(sessionInfoDiv, firstParagraph.nextSibling);
            } else {
                modalBody.appendChild(sessionInfoDiv);
            }
        }
        
        // Create formatted session info content
        sessionInfoDiv.innerHTML = `
            <h4 class="current-session-title">${currentSessionTitle}</h4>
            <div class="current-session-details">
                ${new Date().toLocaleDateString('pl-PL')} • ${participantCount} uczestników • ${entryCount} wpisów
            </div>
            <div class="current-session-note">
                Aktualne nagrywanie zostanie zatrzymane i zapisane.
            </div>
        `;
    },

    /**
     * Get current session title for display
     */
    getCurrentSessionTitle() {
        // Try to get title from meeting name display
        const meetingNameText = document.querySelector('.meeting-name-text');
        if (meetingNameText && meetingNameText.textContent) {
            return meetingNameText.textContent;
        }
        
        // Fallback to generating title based on current time
        const now = new Date();
        const time = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        return `Spotkanie o ${time}`;
    },

    /**
     * Get current recording duration for display
     */
    getCurrentRecordingDuration() {
        const durationElement = document.getElementById('duration');
        if (durationElement) {
            return durationElement.textContent || '0:00';
        }
        return '0:00';
    },

    /**
     * Get current participant count for display
     */
    getCurrentParticipantCount() {
        if (!window.transcriptData?.messages) return 0;
        return new Set(window.transcriptData.messages.map(msg => msg.speaker)).size;
    },

    /**
     * Initialize stop recording modal event listeners
     */
    initializeStopRecordingModalEventListeners() {
        const stopOk = document.getElementById('stopRecordingConfirm');
        const stopCancel = document.getElementById('stopRecordingCancel');
        
        if (stopOk) {
            // Remove existing listeners by cloning
            const newStopOk = stopOk.cloneNode(true);
            stopOk.parentNode.replaceChild(newStopOk, stopOk);
            
            newStopOk.addEventListener('click', () => {
                this.handleStopRecordingConfirmation(true);
            });
        }
        
        if (stopCancel) {
            // Remove existing listeners by cloning
            const newStopCancel = stopCancel.cloneNode(true);
            stopCancel.parentNode.replaceChild(newStopCancel, stopCancel);
            
            newStopCancel.addEventListener('click', () => {
                this.handleStopRecordingConfirmation(false);
            });
        }
    },

    /**
     * Handle stop recording confirmation response
     * @param {boolean} confirmed - Whether user confirmed stopping recording
     */
    handleStopRecordingConfirmation(confirmed) {
        const sessionId = window.pendingSessionToLoad;
        
        // Hide the modal
        this.hideModal('stopRecordingModal');
        
        // Clear the pending session
        window.pendingSessionToLoad = null;
        
        if (confirmed && sessionId) {
            console.log('User confirmed stopping recording, proceeding with session load');
            // Stop recording and load the requested session
            if (window.deactivateRealtimeMode) {
                window.deactivateRealtimeMode();
            }
            
            // Small delay to allow recording to stop properly
            setTimeout(() => {
                if (window.loadSessionFromHistory) {
                    window.loadSessionFromHistory(sessionId);
                }
            }, 100);
        } else {
            console.log('User cancelled or no session ID');
        }
    },

    /**
     * Show resume recording options modal
     */
    showResumeOptions() {    
        // Check if there's an active session to resume
        chrome.storage.local.get(['currentSessionId', 'sessionHistory'], (result) => {
            if (!result.currentSessionId) {
                // No session to resume, start new recording
                if (window.createNewSession) {
                    window.createNewSession();
                }
                return;
            }
        });
        
        this.showModal('resumeRecordingModal');
        
        // Initialize event listeners when showing modal
        this.initializeResumeModalEventListeners();
    },

    /**
     * Initialize resume modal event listeners
     */
    initializeResumeModalEventListeners() {
        const resumeOptions = document.querySelectorAll('#resumeRecordingModal .resume-option');
        
        resumeOptions.forEach(option => {
            // Remove existing listeners by cloning
            const newOption = option.cloneNode(true);
            option.parentNode.replaceChild(newOption, option);
            
            newOption.addEventListener('click', function() {
                const action = this.getAttribute('data-action');
                
                // Visual feedback
                resumeOptions.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                
                setTimeout(() => {
                    window.ModalManager.hideModal('resumeRecordingModal');
                    
                    if (action === 'continue') {
                        // Continue current session
                        console.log('Continuing current session');
                        if (window.activateRealtimeMode) {
                            window.activateRealtimeMode(true); // true = continuation
                        }
                    } else if (action === 'new') {
                        // Start new session
                        console.log('Creating new session');
                        if (window.createNewSession) {
                            window.createNewSession();
                        }
                    }
                }, 200);
            });
        });
    },

    /**
     * Initialize confirm modal
     */
    initializeConfirmModal() {
        const confirmCancel = document.getElementById('confirmCancel');
        if (confirmCancel) {
            confirmCancel.addEventListener('click', () => this.hideModal('confirmModal'));
        } else {
            console.error('Confirm cancel button not found');
        }
    },

    /**
     * Initialize export modal with TXT export button handler
     */
    initializeExportModal() {
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        if (!exportTxtBtn) {
            console.error('Export TXT button not found');
            return;
        }

        exportTxtBtn.addEventListener('click', () => {
            if (!window.transcriptData?.messages?.length) {
                if (window.UIManager?.updateStatus) {
                    window.UIManager.updateStatus('Brak danych do eksportu', 'error');
                }
                return;
            }

            const txtContent = this.generateTxtContent();
            this.downloadFile(txtContent, 'transkrypcja-google-meet.txt', 'text/plain');
            if (window.UIManager?.updateStatus) {
                window.UIManager.updateStatus('Wyeksportowano do pliku TXT!', 'success');
            }
            this.hideModal('exportModal');
        });
    },

    /**
     * Generate TXT content for export
     * @returns {string} Formatted TXT content
     */
    generateTxtContent() {
        if (!window.transcriptData?.messages) return '';

        const lines = [
            'Google Meet Transcript',
            '='.repeat(23),
            `Exported: ${new Date().toLocaleString()}`
        ];

        if (window.transcriptData.meetingUrl) {
            lines.push(`Meeting: ${window.transcriptData.meetingUrl}`);
        }
        lines.push('');

        for (const entry of window.transcriptData.messages) {
            lines.push(`[${entry.timestamp}] ${entry.speaker}:\n${entry.text}\n`);
        }

        return lines.join('\n');
    },

    /**
     * Download file helper
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    },

    /**
     * Initialize ModalManager module
     */
    initialize() {
        console.log('🪟 [MODAL] ModalManager initialized');
        this.initializeModalSystem();
        this.setupGlobalAliases();
    },

    /**
     * Set up global function aliases for backward compatibility
     */
    setupGlobalAliases() {
        window.showModal = this.showModal.bind(this);
        window.hideModal = this.hideModal.bind(this);

        console.log('🔗 [MODAL] Global modal function aliases created for backward compatibility');
    }
};