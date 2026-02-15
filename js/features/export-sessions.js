/**
 * Export Sessions Manager Module
 * Allows exporting selected sessions as JSON from the Data tab in settings
 */
window.ExportSessionsManager = {
    _selectedSessionIds: new Set(),

    initialize() {
        function bindClick(id, handler) {
            document.getElementById(id)?.addEventListener('click', handler);
        }

        bindClick('exportSessionsBtn', () => this.openExportModal());
        bindClick('exportSessionsConfirmBtn', () => this.exportSelected());
        bindClick('exportSessionsCancelBtn', () => window.ModalManager?.hideModal('exportSessionsModal'));

        console.log('📦 [EXPORT-SESSIONS] ExportSessionsManager initialized');
    },

    openExportModal() {
        const sessions = window.sessionHistory || [];
        if (sessions.length === 0) {
            window.ExportManager?.showToast('Brak sesji do eksportu', 'error');
            return;
        }
        this._selectedSessionIds.clear();
        this._renderSessionList(sessions);
        this._updateExportButtonState();
        window.ModalManager?.showModal('exportSessionsModal');
    },

    _renderSessionList(sessions) {
        const list = document.getElementById('exportSessionsList');
        if (!list) return;
        list.innerHTML = '';

        // Select all row
        const selectAllRow = document.createElement('label');
        selectAllRow.className = 'export-select-all-row';
        selectAllRow.innerHTML = `
            <input type="checkbox" id="exportSelectAll" class="merge-checkbox">
            <span class="export-select-all-text">Zaznacz wszystkie (${sessions.length})</span>
        `;
        const selectAllCheckbox = selectAllRow.querySelector('#exportSelectAll');
        selectAllCheckbox.addEventListener('change', () => this._toggleSelectAll(selectAllCheckbox.checked));
        list.appendChild(selectAllRow);

        for (const session of sessions) {
            const item = document.createElement('label');
            item.className = 'export-session-item';

            const dateStr = session.date
                ? new Date(session.date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '';

            item.innerHTML = `
                <input type="checkbox" value="${session.id}" class="merge-checkbox export-session-checkbox">
                <div class="merge-session-info">
                    <span class="merge-session-title">${this._escapeHtml(session.title || 'Bez nazwy')}</span>
                    <span class="merge-session-meta">${session.entryCount || 0} wpisów · ${dateStr}</span>
                </div>
            `;

            const checkbox = item.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this._selectedSessionIds.add(session.id);
                } else {
                    this._selectedSessionIds.delete(session.id);
                }
                item.classList.toggle('selected', e.target.checked);
                this._syncSelectAllCheckbox();
                this._updateExportButtonState();
            });

            list.appendChild(item);
        }
    },

    _toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.export-session-checkbox');
        this._selectedSessionIds.clear();

        for (const cb of checkboxes) {
            cb.checked = checked;
            cb.closest('.export-session-item')?.classList.toggle('selected', checked);
            if (checked) {
                this._selectedSessionIds.add(cb.value);
            }
        }
        this._updateExportButtonState();
    },

    _syncSelectAllCheckbox() {
        const selectAll = document.getElementById('exportSelectAll');
        if (!selectAll) return;
        const total = document.querySelectorAll('.export-session-checkbox').length;
        selectAll.checked = this._selectedSessionIds.size === total;
        selectAll.indeterminate = this._selectedSessionIds.size > 0 && this._selectedSessionIds.size < total;
    },

    _updateExportButtonState() {
        const btn = document.getElementById('exportSessionsConfirmBtn');
        if (btn) {
            const count = this._selectedSessionIds.size;
            btn.disabled = count === 0;
            btn.textContent = count > 0 ? `Eksportuj zaznaczone (${count})` : 'Eksportuj zaznaczone';
        }
    },

    exportSelected() {
        const sessions = window.sessionHistory || [];
        const selected = sessions.filter(s => this._selectedSessionIds.has(s.id));

        if (selected.length === 0) {
            window.ExportManager?.showToast('Nie zaznaczono żadnych sesji', 'error');
            return;
        }

        const exportData = selected.map(session => ({
            id: session.id,
            title: session.title || 'Bez nazwy',
            date: session.date,
            transcript: {
                messages: session.transcript?.messages || [],
                scrapedAt: session.transcript?.scrapedAt || session.date,
                meetingUrl: session.transcript?.meetingUrl || ''
            }
        }));

        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `sesje-export-${dateStr}.json`;
        const content = JSON.stringify(exportData, null, 2);

        window.ExportManager?.downloadFile(content, filename, 'application/json');
        window.ModalManager?.hideModal('exportSessionsModal');
        window.ExportManager?.showToast(`Wyeksportowano ${selected.length} sesji`, 'success');
    },

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
