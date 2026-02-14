/**
 * Export Functionality Module
 *
 * Handles TXT export functionality
 */

window.ExportManager = {

    /**
     * Replace an element with a fresh clone to remove all existing event listeners,
     * then return the new element by re-querying the DOM.
     */
    _replaceWithClone(elementId) {
        const el = document.getElementById(elementId);
        if (!el) return null;
        el.replaceWith(el.cloneNode(true));
        return document.getElementById(elementId);
    },

    /**
     * Setup export button event handlers
     */
    setupExportButtonHandlers() {
        const exportAsLLMPrompt = document.getElementById('exportAsLLMPrompt');

        const exportTxtBtn = this._replaceWithClone('exportTxtBtn');
        if (exportTxtBtn) {
            exportTxtBtn.addEventListener('click', async () => {
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

        const exportClipboardBtn = this._replaceWithClone('exportClipboardBtn');
        if (exportClipboardBtn) {
            exportClipboardBtn.addEventListener('click', async () => {
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
     * Create immutable snapshot of transcript data.
     * Deep clones to prevent data corruption if background scanner updates during export.
     * @returns {Object} Deep cloned snapshot of transcript data
     */
    createDataSnapshot() {
        const now = new Date().toISOString();
        const messages = window.transcriptData?.messages || [];

        return {
            messages: JSON.parse(JSON.stringify(messages)),
            scrapedAt: window.transcriptData?.scrapedAt || now,
            meetingUrl: window.transcriptData?.meetingUrl || '',
            exportedAt: now,
            messageCount: messages.length
        };
    },

    /**
     * Generate TXT content for export
     * @param {Object} dataSnapshot - Immutable snapshot of transcript data
     */
    generateTxtContent(dataSnapshot) {
        if (!dataSnapshot?.messages) {
            console.error('No transcript data available in snapshot');
            return '';
        }

        const lines = [
            'Transkrypcja Google Meet',
            `Data eksportu: ${new Date(dataSnapshot.exportedAt).toLocaleString('pl-PL')}`,
            `URL spotkania: ${dataSnapshot.meetingUrl || 'Nieznany'}`,
            `Liczba wiadomości: ${dataSnapshot.messageCount}`,
            '=====================================',
            ''
        ];

        for (const entry of dataSnapshot.messages) {
            const timestamp = entry.timestamp ? ` [${entry.timestamp}]` : '';
            lines.push(`${entry.speaker}${timestamp}:\n${entry.text}\n`);
        }

        return lines.join('\n');
    },

    FALLBACK_PROMPT: `# Prompt: Stwórz szczegółowe podsumowanie konwersacji

Na podstawie poniższej transkrypcji stwórz szczegółowe podsumowanie w formacie Markdown.

### Input transkrypcji:`,

    /**
     * Prepare export content based on user preferences.
     * Creates immutable snapshot to prevent corruption during active recording.
     */
    async prepareExportContent(shouldWrapInPrompt) {
        const dataSnapshot = this.createDataSnapshot();
        const transcriptContent = this.generateTxtContent(dataSnapshot);

        if (!shouldWrapInPrompt) {
            return transcriptContent;
        }
        return await this.wrapWithLLMPrompt(transcriptContent);
    },

    /**
     * Wrap transcript content with LLM prompt template
     */
    async wrapWithLLMPrompt(transcriptContent) {
        try {
            const promptTemplate = await this.getPromptTemplate();
            return promptTemplate + '\n' + transcriptContent;
        } catch (error) {
            console.error('Error reading prompt template:', error);
            return this.FALLBACK_PROMPT + '\n\n' + transcriptContent;
        }
    },

    /**
     * Fetch the default prompt.md bundled with the extension
     */
    async fetchDefaultPrompt() {
        const response = await fetch(chrome.runtime.getURL('prompt.md'));
        return await response.text();
    },

    /**
     * Get the appropriate prompt template (custom or default)
     */
    async getPromptTemplate() {
        const settings = await this.getPromptSettings();

        if (settings.useDefaultPrompt) {
            return await this.fetchDefaultPrompt();
        }
        return settings.customPrompt || await this.fetchDefaultPrompt();
    },

    /**
     * Get prompt settings from storage
     */
    async getPromptSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['useDefaultPrompt', 'customPrompt'], (result) => {
                resolve({
                    useDefaultPrompt: result.useDefaultPrompt ?? true,
                    customPrompt: result.customPrompt || ''
                });
            });
        });
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

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icon = type === 'success' ? '✓' : '✕';
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        toastContainer.appendChild(toast);

        // Trigger entrance animation after DOM insertion
        setTimeout(() => toast.classList.add('toast-show'), 10);

        // Auto-remove after 3 seconds with fade-out
        setTimeout(() => {
            if (!toast.parentElement) return;
            toast.classList.remove('toast-show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * Download file using Chrome downloads API
     */
    downloadFile(content, filename, mimeType) {
        try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);

            chrome.downloads.download({ url, filename, saveAs: true }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error('Download failed:', chrome.runtime.lastError);
                    this._updateStatus('Błąd podczas pobierania pliku', 'error');
                } else {
                    console.log('Download started with ID:', downloadId);
                }
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
        this.setupExportButtonHandlers();
    }
};