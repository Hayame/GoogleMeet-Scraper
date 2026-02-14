/**
 * Auto-Save Manager Module
 * Recovers transcript data saved when a Google Meet tab closes during recording
 */
window.AutoSaveManager = {
    async initialize() {
        await this._checkForAutoSavedData();
        console.log('💾 [AUTO-SAVE] AutoSaveManager initialized');
    },

    async _checkForAutoSavedData() {
        try {
            const result = await chrome.storage.local.get('autoSaveData');
            const autoSave = result.autoSaveData;

            if (!autoSave?.transcript?.messages?.length) return;

            console.log('💾 [AUTO-SAVE] Found auto-saved data:',
                autoSave.transcript.messages.length, 'messages, source:', autoSave.source);

            await this._importAutoSavedSession(autoSave);
            await chrome.storage.local.remove('autoSaveData');
        } catch (error) {
            console.error('❌ [AUTO-SAVE] Failed to check for auto-saved data:', error);
        }
    },

    async _importAutoSavedSession(autoSave) {
        try {
            const transcript = autoSave.transcript;
            const sessionId = autoSave.sessionId || ('autosave_' + Date.now());

            // Check if this session already exists in history
            if (window.sessionHistory?.some(session => session.id === sessionId)) {
                // Update existing session if auto-save has more messages
                const existing = window.sessionHistory.find(session => session.id === sessionId);
                const existingCount = existing.transcript?.messages?.length || 0;
                if (transcript.messages.length > existingCount) {
                    existing.transcript = transcript;
                    existing.entryCount = transcript.messages.length;
                    existing.participantNames = [...new Set(transcript.messages.map(message => message.speaker))];
                    existing.participantCount = existing.participantNames.length;
                    await window.StorageManager?.setStorageData({ sessionHistory: window.sessionHistory });
                    console.log('💾 [AUTO-SAVE] Updated existing session with', transcript.messages.length, 'messages');
                }
                return;
            }

            // Create new session entry
            const participants = [...new Set(transcript.messages.map(message => message.speaker))];
            const session = {
                id: sessionId,
                title: this._generateTitle(autoSave.timestamp),
                date: new Date(autoSave.timestamp).toISOString(),
                entryCount: transcript.messages.length,
                participantCount: participants.length,
                participantNames: participants,
                transcript: transcript,
                autoSaved: true
            };

            if (!window.sessionHistory) {
                window.sessionHistory = [];
            }
            window.sessionHistory.unshift(session);
            await window.StorageManager?.setStorageData({ sessionHistory: window.sessionHistory });

            window.ExportManager?.showToast(
                `Przywrócono auto-zapisaną sesję (${transcript.messages.length} wpisów)`,
                'success'
            );

            console.log('💾 [AUTO-SAVE] Imported new session:', session.title);
        } catch (error) {
            console.error('❌ [AUTO-SAVE] Failed to import auto-saved session:', error);
        }
    },

    _generateTitle(timestamp) {
        const date = new Date(timestamp);
        const time = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        return `Spotkanie o ${time} (auto-zapis)`;
    }
};
