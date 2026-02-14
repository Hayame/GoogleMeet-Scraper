/**
 * Session Merge Module
 * Allows merging multiple session histories into one with deduplication
 */
window.SessionMergeManager = {
    _selectedSessionIds: new Set(),

    initialize() {
        const mergeBtn = document.getElementById('mergeSessionsBtn');
        if (mergeBtn) {
            mergeBtn.addEventListener('click', () => this.openMergeModal());
        }

        const confirmBtn = document.getElementById('mergeConfirmBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.mergeSessions());
        }

        const cancelBtn = document.getElementById('mergeCancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                window.ModalManager?.hideModal('mergeModal');
            });
        }

        console.log('🔗 [MERGE] SessionMergeManager initialized');
    },

    openMergeModal() {
        const sessions = window.sessionHistory || [];
        if (sessions.length < 2) {
            window.ExportManager?.showToast('Potrzebujesz co najmniej 2 sesje do połączenia', 'error');
            return;
        }
        this._selectedSessionIds.clear();
        this._renderSessionList(sessions);
        this._updateMergeButtonState();
        window.ModalManager?.showModal('mergeModal');
    },

    _renderSessionList(sessions) {
        const list = document.getElementById('mergeSessionList');
        if (!list) return;
        list.innerHTML = '';

        for (const session of sessions) {
            const item = document.createElement('label');
            item.className = 'merge-session-item';

            const dateStr = session.date
                ? new Date(session.date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '';

            item.innerHTML = `
                <input type="checkbox" value="${session.id}" class="merge-checkbox">
                <div class="merge-session-info">
                    <span class="merge-session-title">${this._escapeHtml(session.title || 'Bez nazwy')}</span>
                    <span class="merge-session-meta">${session.entryCount || 0} wpisów · ${session.participantCount || 0} uczestników · ${dateStr}</span>
                </div>
            `;

            const checkbox = item.querySelector('input');
            checkbox.addEventListener('change', (changeEvent) => {
                if (changeEvent.target.checked) {
                    this._selectedSessionIds.add(session.id);
                } else {
                    this._selectedSessionIds.delete(session.id);
                }
                this._updateMergeButtonState();
            });

            list.appendChild(item);
        }
    },

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    _updateMergeButtonState() {
        const btn = document.getElementById('mergeConfirmBtn');
        if (btn) {
            const count = this._selectedSessionIds.size;
            btn.disabled = count < 2;
            btn.textContent = count >= 2 ? `Połącz (${count})` : 'Połącz';
            btn.title = count < 2 ? 'Wybierz co najmniej 2 sesje' : '';
        }
    },

    async mergeSessions() {
        const sessionIds = Array.from(this._selectedSessionIds);
        const sessions = sessionIds
            .map(id => (window.sessionHistory || []).find(session => session.id === id))
            .filter(Boolean);

        if (sessions.length < 2) return;

        // Combine all messages with deduplication by hash
        const allMessages = [];
        const seenHashes = new Set();

        for (const session of sessions) {
            const messages = session.transcript?.messages || [];
            for (const msg of messages) {
                const hash = msg.hash || this._computeHash(msg.speaker, msg.text);
                if (!seenHashes.has(hash)) {
                    seenHashes.add(hash);
                    allMessages.push({ ...msg, hash });
                }
            }
        }

        // Sort by original index
        allMessages.sort((msgA, msgB) => (msgA.index || 0) - (msgB.index || 0));

        // Re-index
        allMessages.forEach((msg, idx) => { msg.index = idx; });

        const participants = [...new Set(allMessages.map(msg => msg.speaker))];
        const mergedTitle = sessions.map(session => session.title || 'Bez nazwy').join(' + ');
        const sessionId = window.generateSessionId ? window.generateSessionId() : 'merge_' + Date.now();

        const mergedSession = {
            id: sessionId,
            title: mergedTitle.length > 100 ? mergedTitle.substring(0, 97) + '...' : mergedTitle,
            date: new Date().toISOString(),
            entryCount: allMessages.length,
            participantCount: participants.length,
            participantNames: participants,
            transcript: {
                messages: allMessages,
                scrapedAt: new Date().toISOString(),
                meetingUrl: sessions[0]?.transcript?.meetingUrl || ''
            },
            merged: true,
            sourceSessionIds: sessionIds
        };

        if (!window.sessionHistory) {
            window.sessionHistory = [];
        }
        window.sessionHistory.unshift(mergedSession);
        await window.StorageManager?.setStorageData({ sessionHistory: window.sessionHistory });

        window.SessionUIManager?.renderSessionHistory();
        window.ModalManager?.hideModal('mergeModal');

        const totalOriginalMessages = sessions.reduce((sum, session) => {
            return sum + (session.transcript?.messages?.length || 0);
        }, 0);
        const removed = totalOriginalMessages - allMessages.length;

        let toastMsg = `Połączono ${sessions.length} sesji (${allMessages.length} wpisów)`;
        if (removed > 0) {
            toastMsg += `, usunięto ${removed} duplikatów`;
        }
        window.ExportManager?.showToast(toastMsg, 'success');

        console.log('🔗 [MERGE] Sessions merged:', sessions.length, 'sessions,', allMessages.length, 'unique messages');
    },

    _computeHash(speaker, text) {
        const combined = `${speaker}:${text}`;
        let hash = 0;
        for (let charIdx = 0; charIdx < combined.length; charIdx++) {
            hash = ((hash << 5) - hash) + combined.charCodeAt(charIdx);
            hash = hash & hash;
        }
        return hash.toString(36);
    }
};
