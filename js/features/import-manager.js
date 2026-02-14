/**
 * Import Manager Module
 * Allows importing previously exported JSON session files
 */
window.ImportManager = {
    initialize() {
        const importBtn = document.getElementById('importSessionBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.handleImportClick());
        }
        console.log('📥 [IMPORT] ImportManager initialized');
    },

    handleImportClick() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        input.addEventListener('change', (changeEvent) => {
            const file = changeEvent.target.files?.[0];
            if (file) {
                this.processImportFile(file);
            }
            input.remove();
        });
        document.body.appendChild(input);
        input.click();
    },

    async processImportFile(file) {
        const MAX_SIZE = window.AppConstants?.IMPORT_LIMITS?.MAX_FILE_SIZE_BYTES || (5 * 1024 * 1024);

        if (file.size > MAX_SIZE) {
            window.ExportManager?.showToast('Plik jest za duży (maks. 5MB)', 'error');
            return;
        }

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const validated = this._validateAndNormalize(data);

            if (!validated) {
                window.ExportManager?.showToast('Nieprawidłowy format pliku. Wymagany format JSON z transkrypcją.', 'error');
                return;
            }

            await this._importSession(validated, file.name);
        } catch (error) {
            console.error('❌ [IMPORT] Failed to process file:', error);
            window.ExportManager?.showToast('Błąd odczytu pliku. Sprawdź format JSON.', 'error');
        }
    },

    _validateAndNormalize(data) {
        // Format 1: Extension's own export format (entries array)
        if (Array.isArray(data.entries) && data.entries.length > 0) {
            const messages = data.entries.map((entry, index) => ({
                index,
                speaker: entry.speaker || 'Nieznany',
                text: entry.text || '',
                timestamp: entry.timestamp || '',
                hash: entry.hash || this._simpleHash(entry.speaker, entry.text)
            }));
            return {
                messages,
                scrapedAt: data.scrapedAt || new Date().toISOString(),
                meetingUrl: data.meetingUrl || ''
            };
        }

        // Format 2: Internal format (messages array)
        if (Array.isArray(data.messages) && data.messages.length > 0) {
            const hasValidMessages = data.messages.every(message => message.speaker && message.text !== undefined);
            if (hasValidMessages) {
                return {
                    messages: data.messages.map((message, index) => ({
                        index: message.index ?? index,
                        speaker: message.speaker,
                        text: message.text,
                        timestamp: message.timestamp || '',
                        hash: message.hash || this._simpleHash(message.speaker, message.text)
                    })),
                    scrapedAt: data.scrapedAt || new Date().toISOString(),
                    meetingUrl: data.meetingUrl || ''
                };
            }
        }

        // Format 3: Session object with transcript
        if (data.transcript?.messages?.length > 0) {
            return data.transcript;
        }

        return null;
    },

    _simpleHash(speaker, text) {
        const combined = `${speaker}:${text}`;
        let hash = 0;
        for (let charIndex = 0; charIndex < combined.length; charIndex++) {
            hash = ((hash << 5) - hash) + combined.charCodeAt(charIndex);
            hash = hash & hash;
        }
        return hash.toString(36);
    },

    async _importSession(transcript, filename) {
        const participants = [...new Set(transcript.messages.map(message => message.speaker))];
        const sessionId = window.generateSessionId ? window.generateSessionId() : 'import_' + Date.now();
        const title = this._generateTitle(filename);

        const session = {
            id: sessionId,
            title: title,
            date: transcript.scrapedAt || new Date().toISOString(),
            entryCount: transcript.messages.length,
            participantCount: participants.length,
            participantNames: participants,
            transcript: transcript,
            imported: true
        };

        if (!window.sessionHistory) {
            window.sessionHistory = [];
        }
        window.sessionHistory.unshift(session);
        await window.StorageManager?.setStorageData({ sessionHistory: window.sessionHistory });

        // Re-render session list
        window.SessionUIManager?.renderSessionHistory();

        window.ExportManager?.showToast(
            `Sesja zaimportowana pomyślnie (${transcript.messages.length} wpisów)`,
            'success'
        );

        console.log('📥 [IMPORT] Session imported:', title, transcript.messages.length, 'messages');
    },

    _generateTitle(filename) {
        // Try to extract meaningful name from filename
        const name = filename.replace(/\.json$/i, '').replace(/[-_]/g, ' ');
        if (name.length > 3 && name.length < 60) {
            return name;
        }
        const time = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        return `Import o ${time}`;
    }
};
