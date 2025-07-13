/**
 * Export Functionality Module
 * 
 * Extracted from popup.js lines 3222-3313
 * Handles TXT and JSON export functionality
 */

window.ExportManager = {
    
    /**
     * Initialize export modal and setup event handlers
     * Source: popup.js lines 3222-3225
     */
    initializeExportModal() {    
        // Set up export button handlers directly on existing buttons
        this.setupExportButtonHandlers();
    },

    /**
     * Setup export button event handlers
     * Source: popup.js lines 3227-3270
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
                this._updateStatus('Skopiowano do schowka!', 'success');
                this._hideModal('exportModal');
            });
        } else {
            console.error('Export clipboard button not found');
        }
    },

    /**
     * Generate TXT content for export
     * Source: popup.js lines 3272-3292
     */
    generateTxtContent() {    
        if (!window.transcriptData || !window.transcriptData.messages) {
            console.error('No transcript data available');
            return '';
        }
        
        let txtContent = `Transkrypcja Google Meet\n`;
        txtContent += `Data eksportu: ${new Date().toLocaleString('pl-PL')}\n`;
        txtContent += `URL spotkania: ${window.transcriptData.meetingUrl || 'Nieznany'}\n`;
        txtContent += `=====================================\n\n`;

        window.transcriptData.messages.forEach(entry => {
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
     */
    async prepareExportContent(shouldWrapInPrompt) {
        const transcriptContent = this.generateTxtContent();
        
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
            // Read prompt.md content
            const response = await fetch(chrome.runtime.getURL('prompt.md'));
            const promptTemplate = await response.text();
            
            // Add transcript after "### 📎 Input" line
            return promptTemplate + '\n' + transcriptContent;
        } catch (error) {
            console.error('Error reading prompt template:', error);
            // Fallback: return transcript with basic prompt
            return `## 🧠 Prompt: Stwórz szczegółowe podsumowanie konwersacji

Na podstawie poniższej transkrypcji stwórz szczegółowe podsumowanie w formacie Markdown.

### 📎 Input

${transcriptContent}`;
        }
    },

    /**
     * Copy content to clipboard
     */
    async copyToClipboard(content) {
        try {
            await navigator.clipboard.writeText(content);
            console.log('Content copied to clipboard successfully');
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
        } catch (error) {
            console.error('Fallback copy failed:', error);
        } finally {
            document.body.removeChild(textArea);
        }
    },

    /**
     * Download file using Chrome downloads API
     * Source: popup.js lines 1676-1696
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