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
     * Prepare export content with data validation.
     * Returns null and shows error if no transcript data is available.
     */
    async _getExportContent() {
        if (!window.transcriptData) {
            this._updateStatus('Brak danych do eksportu', 'error');
            return null;
        }
        const shouldWrapInPrompt = document.getElementById('exportAsLLMPrompt')?.checked ?? true;
        return { content: await this.prepareExportContent(shouldWrapInPrompt), shouldWrapInPrompt };
    },

    /**
     * Setup export button event handlers
     */
    setupExportButtonHandlers() {
        document.getElementById('exportAsLLMPrompt')
            ?.addEventListener('change', () => this.updatePromptSelectorVisibility());

        const exportTxtBtn = this._replaceWithClone('exportTxtBtn');
        if (exportTxtBtn) {
            exportTxtBtn.addEventListener('click', async () => {
                const result = await this._getExportContent();
                if (!result) return;

                const filename = result.shouldWrapInPrompt ? 'transkrypcja-z-promptem.txt' : 'transkrypcja-google-meet.txt';
                this.downloadFile(result.content, filename, 'text/plain');
                this._updateStatus('Wyeksportowano do pliku!', 'success');
                this._hideModal('exportModal');
            });
        } else {
            console.error('Export TXT button not found');
        }

        const exportClipboardBtn = this._replaceWithClone('exportClipboardBtn');
        if (exportClipboardBtn) {
            exportClipboardBtn.addEventListener('click', async () => {
                const result = await this._getExportContent();
                if (!result) return;

                await this.copyToClipboard(result.content);
                this._hideModal('exportModal');
            });
        } else {
            console.error('Export clipboard button not found');
        }
    },

    /**
     * Populate and show/hide the prompt selector dropdown in the export modal
     */
    updatePromptSelectorVisibility() {
        const checkbox = document.getElementById('exportAsLLMPrompt');
        const selectorGroup = document.getElementById('promptSelectorGroup');
        const select = document.getElementById('exportPromptSelect');

        if (!selectorGroup || !select) return;

        const sm = window.SettingsManager;
        const prompts = sm?.prompts || [];
        const isChecked = checkbox?.checked ?? true;

        // Show dropdown only when checkbox is on AND there are >1 prompts
        if (isChecked && prompts.length > 1) {
            selectorGroup.style.display = '';

            // Populate options
            select.innerHTML = '';
            const defaultPrompt = sm.getDefaultPrompt();
            prompts.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.title + (p.isDefault ? ' (domyślny)' : '');
                if (p.id === defaultPrompt.id) opt.selected = true;
                select.appendChild(opt);
            });
        } else {
            selectorGroup.style.display = 'none';
        }
    },

    /**
     * Get the currently selected prompt object from the export modal selector
     */
    getSelectedExportPrompt() {
        const sm = window.SettingsManager;
        if (!sm) return null;

        const select = document.getElementById('exportPromptSelect');
        const selectorGroup = document.getElementById('promptSelectorGroup');

        // If selector is visible and has a selection, use it
        if (selectorGroup && selectorGroup.style.display !== 'none' && select?.value) {
            return sm.getPromptById(select.value);
        }

        // Otherwise use the default prompt
        return sm.getDefaultPrompt();
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
     * Get the appropriate prompt template based on multi-prompt selection
     */
    async getPromptTemplate() {
        const sm = window.SettingsManager;
        if (!sm) {
            // Fallback: fetch built-in prompt.md directly
            const response = await fetch(chrome.runtime.getURL('prompt.md'));
            return await response.text();
        }

        const selectedPrompt = this.getSelectedExportPrompt();
        return await sm.getPromptText(selectedPrompt);
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