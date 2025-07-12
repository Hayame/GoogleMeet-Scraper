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
        const exportJsonBtn = document.getElementById('exportJsonBtn');
        
        if (exportTxtBtn) {
            // Remove existing event listeners to prevent duplication
            exportTxtBtn.replaceWith(exportTxtBtn.cloneNode(true));
            const newExportTxtBtn = document.getElementById('exportTxtBtn');
            
            newExportTxtBtn.addEventListener('click', () => {
                if (!window.transcriptData) {
                    this._updateStatus('Brak danych do eksportu', 'error');
                    return;
                }
                
                const txtContent = this.generateTxtContent();
                this.downloadFile(txtContent, 'transkrypcja-google-meet.txt', 'text/plain');
                this._updateStatus('Wyeksportowano do pliku TXT!', 'success');
                this._hideModal('exportModal');
            });
        } else {
            console.error('Export TXT button not found');
        }
        
        if (exportJsonBtn) {
            // Remove existing event listeners to prevent duplication
            exportJsonBtn.replaceWith(exportJsonBtn.cloneNode(true));
            const newExportJsonBtn = document.getElementById('exportJsonBtn');
            
            newExportJsonBtn.addEventListener('click', () => {
                if (!window.transcriptData) {
                    this._updateStatus('Brak danych do eksportu', 'error');
                    return;
                }
                
                const jsonContent = this.generateJsonContent();
                this.downloadFile(jsonContent, 'transkrypcja-google-meet.json', 'application/json');
                this._updateStatus('Wyeksportowano do pliku JSON!', 'success');
                this._hideModal('exportModal');
            });
        } else {
            console.error('Export JSON button not found');
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
     * Generate JSON content for export
     * Source: popup.js lines 3294-3313
     */
    generateJsonContent() {    
        if (!window.transcriptData || !window.transcriptData.messages) {
            console.error('No transcript data available');
            return '{}';
        }
        
        const jsonData = {
            exportDate: new Date().toISOString(),
            meetingUrl: window.transcriptData.meetingUrl || 'Nieznany',
            scrapedAt: window.transcriptData.scrapedAt,
            messages: window.transcriptData.messages,
            stats: {
                totalEntries: window.transcriptData.messages.length,
                uniqueParticipants: new Set(window.transcriptData.messages.map(e => e.speaker)).size
            }
        };

        const jsonContent = JSON.stringify(jsonData, null, 2);
        return jsonContent;
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
     * Check if transcript data is available for export
     */
    hasExportableData() {
        return window.transcriptData && 
               window.transcriptData.messages && 
               window.transcriptData.messages.length > 0;
    },

    /**
     * Get export statistics
     */
    getExportStats() {
        if (!this.hasExportableData()) {
            return {
                totalEntries: 0,
                uniqueParticipants: 0,
                hasTimestamps: false
            };
        }

        const messages = window.transcriptData.messages;
        return {
            totalEntries: messages.length,
            uniqueParticipants: new Set(messages.map(m => m.speaker)).size,
            hasTimestamps: messages.some(m => m.timestamp)
        };
    },

    /**
     * Enable or disable export buttons based on data availability
     */
    updateExportButtonsState() {
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        const hasData = this.hasExportableData();
        
        if (exportTxtBtn) {
            exportTxtBtn.disabled = !hasData;
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
    }
};