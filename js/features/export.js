/**
 * Export Functionality Module
 *
 * Handles TXT export functionality
 */

window.ExportManager = {

    /**
     * Initialize export modal and setup event handlers
     */
    initializeExportModal() {    
        // Set up export button handlers directly on existing buttons
        this.setupExportButtonHandlers();
    },

    /**
     * Setup export button event handlers
     */
    setupExportButtonHandlers() {    
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        const exportClipboardBtn = document.getElementById('exportClipboardBtn');
        const exportAsLLMPrompt = document.getElementById('exportAsLLMPrompt');
        
        if (exportTxtBtn) {
            // Remove existing event listeners to prevent duplication
            exportTxtBtn.replaceWith(exportTxtBtn.cloneNode(true));
            const newExportTxtBtn = document.getElementById('exportTxtBtn');
            
            newExportTxtBtn.addEventListener('click', async () => {
                if (!window.transcriptData) {
                    this._updateStatus('Brak danych do eksportu', 'error');
                    return;
                }
                
                const shouldWrapInPrompt = exportAsLLMPrompt?.checked ?? true;
                const content = await this.prepareExportContent(shouldWrapInPrompt);
                const filename = shouldWrapInPrompt ? 'transkrypcja-z-promptem.txt' : 'transkrypcja-google-meet.txt';
                
                this.downloadFile(content, filename, 'text/plain');
                this._updateStatus('Wyeksportowano do pliku!', 'success');
                this._hideModal('exportModal');
            });
        } else {
            console.error('Export TXT button not found');
        }
        
        if (exportClipboardBtn) {
            // Remove existing event listeners to prevent duplication
            exportClipboardBtn.replaceWith(exportClipboardBtn.cloneNode(true));
            const newExportClipboardBtn = document.getElementById('exportClipboardBtn');
            
            newExportClipboardBtn.addEventListener('click', async () => {
                if (!window.transcriptData) {
                    this._updateStatus('Brak danych do eksportu', 'error');
                    return;
                }
                
                const shouldWrapInPrompt = exportAsLLMPrompt?.checked ?? true;
                const content = await this.prepareExportContent(shouldWrapInPrompt);
                
                await this.copyToClipboard(content);
                this._hideModal('exportModal');
            });
        } else {
            console.error('Export clipboard button not found');
        }
    },

    /**
     * Create immutable snapshot of transcript data
     * Prevents data corruption during export if background scanner updates
     * @returns {Object} Deep cloned snapshot of transcript data
     */
    createDataSnapshot() {
        if (!window.transcriptData) {
            return {
                messages: [],
                scrapedAt: new Date().toISOString(),
                meetingUrl: '',
                exportedAt: new Date().toISOString(),
                messageCount: 0
            };
        }

        // Deep clone to prevent reference sharing
        return {
            messages: JSON.parse(JSON.stringify(window.transcriptData.messages || [])),
            scrapedAt: window.transcriptData.scrapedAt,
            meetingUrl: window.transcriptData.meetingUrl,
            exportedAt: new Date().toISOString(),
            messageCount: window.transcriptData.messages?.length || 0
        };
    },

    /**
     * Generate TXT content for export
     * @param {Object} dataSnapshot - Immutable snapshot of transcript data
     */
    generateTxtContent(dataSnapshot) {
        if (!dataSnapshot || !dataSnapshot.messages) {
            console.error('No transcript data available in snapshot');
            return '';
        }

        let txtContent = `Transkrypcja Google Meet\n`;
        txtContent += `Data eksportu: ${new Date(dataSnapshot.exportedAt).toLocaleString('pl-PL')}\n`;
        txtContent += `URL spotkania: ${dataSnapshot.meetingUrl || 'Nieznany'}\n`;
        txtContent += `Liczba wiadomości: ${dataSnapshot.messageCount}\n`;
        txtContent += `=====================================\n\n`;

        dataSnapshot.messages.forEach(entry => {
            txtContent += `${entry.speaker}`;
            if (entry.timestamp) {
                txtContent += ` [${entry.timestamp}]`;
            }
            txtContent += `:\n${entry.text}\n\n`;
        });

        return txtContent;
    },

    /**
     * Prepare export content based on user preferences
     * Creates immutable snapshot to prevent corruption during active recording
     */
    async prepareExportContent(shouldWrapInPrompt) {
        // CREATE IMMUTABLE SNAPSHOT - prevents data corruption if background updates during export
        const dataSnapshot = this.createDataSnapshot();
        const transcriptContent = this.generateTxtContent(dataSnapshot);

        if (shouldWrapInPrompt) {
            return await this.wrapWithLLMPrompt(transcriptContent);
        } else {
            return transcriptContent;
        }
    },

    /**
     * Wrap transcript content with LLM prompt template
     */
    async wrapWithLLMPrompt(transcriptContent) {
        try {
            const promptTemplate = await this.getPromptTemplate();
            
            // Add transcript after the prompt template
            return promptTemplate + '\n' + transcriptContent;
        } catch (error) {
            console.error('Error reading prompt template:', error);
            // Fallback: return transcript with basic prompt
            return `# Prompt: Stwórz szczegółowe podsumowanie konwersacji

Na podstawie poniższej transkrypcji stwórz szczegółowe podsumowanie w formacie Markdown.

### Input transkrypcji:

${transcriptContent}`;
        }
    },

    /**
     * Get the appropriate prompt template (custom or default)
     */
    async getPromptTemplate() {
        // Check if we should use default prompt
        const settings = await this.getPromptSettings();
        
        if (settings.useDefaultPrompt) {
            // Use default prompt.md
            const response = await fetch(chrome.runtime.getURL('prompt.md'));
            return await response.text();
        } else {
            // Use custom prompt from settings
            return settings.customPrompt || await this.getDefaultPromptFallback();
        }
    },

    /**
     * Get prompt settings from storage
     */
    async getPromptSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['useDefaultPrompt', 'customPrompt'], (result) => {
                resolve({
                    useDefaultPrompt: result.useDefaultPrompt !== undefined ? result.useDefaultPrompt : true,
                    customPrompt: result.customPrompt || ''
                });
            });
        });
    },

    /**
     * Get default prompt as fallback
     */
    async getDefaultPromptFallback() {
        try {
            const response = await fetch(chrome.runtime.getURL('prompt.md'));
            return await response.text();
        } catch (error) {
            console.error('Error loading default prompt fallback:', error);
            return `# Prompt: Stwórz szczegółowe podsumowanie konwersacji

Na podstawie poniższej transkrypcji stwórz szczegółowe podsumowanie w formacie Markdown.

### Input transkrypcji:`;
        }
    },

    /**
     * Copy content to clipboard
     */
    async copyToClipboard(content) {
        try {
            await navigator.clipboard.writeText(content);
            console.log('Content copied to clipboard successfully');
            this.showToast('Skopiowano do schowka!', 'success');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Fallback for older browsers
            this.fallbackCopyToClipboard(content);
        }
    },

    /**
     * Fallback copy method for older browsers
     */
    fallbackCopyToClipboard(content) {
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            console.log('Fallback copy successful');
            this.showToast('Skopiowano do schowka!', 'success');
        } catch (error) {
            console.error('Fallback copy failed:', error);
            this.showToast('Błąd kopiowania do schowka', 'error');
        } finally {
            document.body.removeChild(textArea);
        }
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            console.error('Toast container not found');
            return;
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Create toast content
        const icon = type === 'success' ? '✓' : '✕';
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        // Add toast to container
        toastContainer.appendChild(toast);

        // Trigger animation
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 10);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.remove('toast-show');
                setTimeout(() => {
                    if (toast.parentElement) {
                        toast.remove();
                    }
                }, 300);
            }
        }, 3000);
    },

    /**
     * Download file using Chrome downloads API
     */
    downloadFile(content, filename, mimeType) {    
        try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: true
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error('Download failed:', chrome.runtime.lastError);
                    this._updateStatus('Błąd podczas pobierania pliku', 'error');
                } else {
                    console.log('Download started with ID:', downloadId);
                }
                
                // Clean up the object URL
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            });
        } catch (error) {
            console.error('Error creating download:', error);
            this._updateStatus('Błąd podczas tworzenia pliku do pobrania', 'error');
        }
    },


    /**
     * Helper function to update status (delegates to global function if available)
     */
    _updateStatus(message, type) {
        if (typeof window.updateStatus === 'function') {
            window.updateStatus(message, type);
        } else {
            console.log(`Status: ${message} (${type})`);
        }
    },

    /**
     * Helper function to hide modal (delegates to global function if available)
     */
    _hideModal(modalId) {
        if (typeof window.hideModal === 'function') {
            window.hideModal(modalId);
        } else {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
            }
        }
    },

    /**
     * Initialize ExportManager module
     */
    initialize() {
        console.log('📤 [EXPORT] ExportManager initialized');
        this.initializeExportModal();
    }
};