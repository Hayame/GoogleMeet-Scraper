/**
 * Keyboard Shortcuts Module
 * Handles keyboard shortcuts for common actions in the popup
 */
window.KeyboardShortcutsManager = {
    _shortcuts: {
        'ctrl+shift+r': { action: 'toggleRecording', description: 'Rozpocznij/zatrzymaj nagrywanie' },
        'ctrl+shift+c': { action: 'quickCopy', description: 'Kopiuj z promptem' },
        'ctrl+shift+e': { action: 'openExport', description: 'Otwórz eksport' },
        'escape': { action: 'closeModal', description: 'Zamknij okno' }
    },

    initialize() {
        document.addEventListener('keydown', (event) => this._handleKeyDown(event));
        console.log('⌨️ [SHORTCUTS] KeyboardShortcutsManager initialized');
    },

    _handleKeyDown(event) {
        // Don't capture shortcuts when typing in an input/textarea
        const tag = event.target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
            // Only allow Escape in inputs
            if (event.key !== 'Escape') return;
        }

        const key = this._buildKeyCombo(event);
        const shortcut = this._shortcuts[key];
        if (!shortcut) return;

        event.preventDefault();
        event.stopPropagation();
        this._executeAction(shortcut.action);
    },

    _buildKeyCombo(event) {
        const parts = [];
        if (event.ctrlKey || event.metaKey) parts.push('ctrl');
        if (event.shiftKey) parts.push('shift');
        if (event.altKey) parts.push('alt');
        parts.push(event.key.toLowerCase());
        return parts.join('+');
    },

    _executeAction(action) {
        switch (action) {
            case 'toggleRecording':
                window.RecordingManager?.handleRecordButtonClick();
                break;
            case 'quickCopy':
                window.ExportManager?.quickCopyWithPrompt();
                break;
            case 'openExport':
                document.getElementById('exportBtn')?.click();
                break;
            case 'closeModal': {
                const openModal = document.querySelector('.modal.show');
                if (openModal) {
                    window.ModalManager?.hideModal(openModal.id);
                }
                break;
            }
        }
    },

    getShortcuts() {
        return { ...this._shortcuts };
    }
};
