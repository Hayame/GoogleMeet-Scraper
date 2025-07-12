/**
 * Modal Manager Module
 * Handles modal display, hiding, and management functionality
 * Extracted from popup.js lines: 2903-3271
 */

window.ModalManager = {
    /**
     * Initialize modal system with global event handlers
     * Extracted from popup.js lines 2903-2919
     */
    initializeModalSystem() {    
        // ESC key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.show');
                if (openModal) {
                    this.hideModal(openModal.id);
                }
            }
        });
        
        // Initialize specific modals
        this.initializeConfirmModal();
        this.initializeExportModal();
    },

    /**
     * Show modal with optional data
     * Extracted from popup.js lines 2921-2944
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
     * Extracted from popup.js lines 2946-2959
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
     * Extracted from popup.js lines 2961-3005
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
        const confirmMessage = confirmModal.querySelector('.modal-message');
        const confirmOk = confirmModal.querySelector('.confirm-ok');
        const confirmCancel = confirmModal.querySelector('.confirm-cancel');
        
        if (confirmTitle) confirmTitle.textContent = 'Potwierdź usunięcie';
        if (confirmMessage) confirmMessage.textContent = 'Czy na pewno chcesz usunąć tę sesję? Ta operacja jest nieodwracalna.';
        
        // Remove existing event listeners by cloning elements
        const newConfirmOk = confirmOk.cloneNode(true);
        const newConfirmCancel = confirmCancel.cloneNode(true);
        confirmOk.parentNode.replaceChild(newConfirmOk, confirmOk);
        confirmCancel.parentNode.replaceChild(newConfirmCancel, confirmCancel);
        
        // Set up event handlers
        newConfirmOk.addEventListener('click', () => {
            this.performDeleteSession(sessionId);
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
     * Perform session deletion
     * Extracted from popup.js lines 3007-3058
     * @param {string} sessionId - ID of session to delete
     */
    performDeleteSession(sessionId) {    
        chrome.storage.local.get(['sessionHistory', 'currentSessionId'], (result) => {
            let sessionHistory = result.sessionHistory || [];
            const currentSessionId = result.currentSessionId;
            
            // Remove session from history
            sessionHistory = sessionHistory.filter(session => session.id !== sessionId);
            
            // Update storage
            chrome.storage.local.set({ sessionHistory }, () => {
                // Re-render session history
                if (window.renderSessionHistory) {
                    window.renderSessionHistory();
                }
                
                // Update UI status
                if (window.UIManager && window.UIManager.updateStatus) {
                    window.UIManager.updateStatus('Sesja została usunięta', 'success');
                }
            });
            
            // If the deleted session was the current session, reset UI
            if (currentSessionId === sessionId) {
                // Reset transcript display
                if (window.showEmptySession) {
                    window.showEmptySession();
                }
                
                // Update UI for new session state
                if (window.UIManager) {
                    window.UIManager.updateButtonVisibility('NEW');
                    window.UIManager.hideMeetingName();
                }
                
                chrome.storage.local.remove(['transcriptData', 'currentSessionId', 'recordingStartTime', 'sessionStartTime', 'sessionTotalDuration', 'currentSessionDuration', 'meetTabId']);
            }
        });
    },

    /**
     * Show stop recording confirmation modal
     * Extracted from popup.js lines 3060-3075
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
        
        // Show the confirmation modal
        this.showModal('stopRecordingModal');
        
        // Initialize event listeners for this confirmation
        this.initializeStopRecordingModalEventListeners();
    },

    /**
     * Initialize stop recording modal event listeners
     * Extracted from popup.js lines 3077-3100
     */
    initializeStopRecordingModalEventListeners() {
        const stopOk = document.querySelector('#stopRecordingModal .confirm-ok');
        const stopCancel = document.querySelector('#stopRecordingModal .confirm-cancel');
        
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
     * Extracted from popup.js lines 3102-3123
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
     * Extracted from popup.js lines 3125-3147
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
     * Hide resume recording modal
     * Extracted from popup.js lines 3149-3151
     */
    hideResumeModal() {
        this.hideModal('resumeRecordingModal');
    },

    /**
     * Initialize resume modal event listeners
     * Extracted from popup.js lines 3153-3207
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
     * Extracted from popup.js lines 3209-3220
     */
    initializeConfirmModal() {    
        const confirmCancel = document.querySelector('#confirmModal .confirm-cancel');
        
        if (confirmCancel) {
            confirmCancel.addEventListener('click', () => {
                this.hideModal('confirmModal');
            });
        } else {
            console.error('Confirm cancel button not found');
        }
    },

    /**
     * Initialize export modal with button handlers
     * Extracted from popup.js lines 3222-3270
     */
    initializeExportModal() {    
        this.setupExportButtonHandlers();
    },

    /**
     * Setup export button event handlers
     * Extracted from popup.js lines 3227-3270
     */
    setupExportButtonHandlers() {    
        const exportTxtBtn = document.getElementById('exportModalTxtBtn');
        
        if (exportTxtBtn) {
            exportTxtBtn.addEventListener('click', () => {
                console.log('Export TXT button clicked');
                
                if (!window.transcriptData || !window.transcriptData.messages || window.transcriptData.messages.length === 0) {
                    if (window.UIManager && window.UIManager.updateStatus) {
                        window.UIManager.updateStatus('Brak danych do eksportu', 'error');
                    }
                    return;
                }
                
                const txtContent = this.generateTxtContent();
                this.downloadFile(txtContent, 'transkrypcja-google-meet.txt', 'text/plain');
                if (window.UIManager && window.UIManager.updateStatus) {
                    window.UIManager.updateStatus('Wyeksportowano do pliku TXT!', 'success');
                }
                this.hideModal('exportModal');
            });
        } else {
            console.error('Export TXT button not found');
        }
        
        const exportJsonBtn = document.getElementById('exportModalJsonBtn');
        
        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', () => {
                console.log('Export JSON button clicked');
                
                if (!window.transcriptData || !window.transcriptData.messages || window.transcriptData.messages.length === 0) {
                    if (window.UIManager && window.UIManager.updateStatus) {
                        window.UIManager.updateStatus('Brak danych do eksportu', 'error');
                    }
                    return;
                }
                
                const jsonContent = this.generateJsonContent();
                this.downloadFile(jsonContent, 'transkrypcja-google-meet.json', 'application/json');
                if (window.UIManager && window.UIManager.updateStatus) {
                    window.UIManager.updateStatus('Wyeksportowano do pliku JSON!', 'success');
                }
                this.hideModal('exportModal');
            });
        } else {
            console.error('Export JSON button not found');
        }
    },

    /**
     * Generate TXT content for export
     * @returns {string} Formatted TXT content
     */
    generateTxtContent() {
        if (!window.transcriptData || !window.transcriptData.messages) {
            return '';
        }
        
        let content = 'Google Meet Transcript\n';
        content += '=' + '='.repeat(22) + '\n';
        content += `Exported: ${new Date().toLocaleString()}\n`;
        if (window.transcriptData.meetingUrl) {
            content += `Meeting: ${window.transcriptData.meetingUrl}\n`;
        }
        content += '\n';
        
        window.transcriptData.messages.forEach((entry, index) => {
            content += `[${entry.timestamp}] ${entry.speaker}:\n`;
            content += `${entry.text}\n\n`;
        });
        
        return content;
    },

    /**
     * Generate JSON content for export
     * @returns {string} Formatted JSON content
     */
    generateJsonContent() {
        const jsonData = {
            exportedAt: new Date().toISOString(),
            meetingUrl: window.transcriptData?.meetingUrl || '',
            totalMessages: window.transcriptData?.messages?.length || 0,
            entries: window.transcriptData?.messages || []
        };
        
        return JSON.stringify(jsonData, null, 2);
    },

    /**
     * Download file helper
     * @param {string} content - File content
     * @param {string} filename - File name
     * @param {string} mimeType - MIME type
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
    }
};