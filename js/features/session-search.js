/**
 * Session Search Module
 * Provides search functionality across all saved sessions
 */
window.SessionSearchManager = {
    _query: '',
    _debounceTimer: null,
    _filteredSessions: null,

    initialize() {
        const searchInput = document.getElementById('sessionSearchInput');
        const clearBtn = document.getElementById('sessionSearchClear');

        if (searchInput) {
            searchInput.addEventListener('input', (event) => this._handleSearchInput(event));
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSearch());
        }

        console.log('🔍 [SESSION-SEARCH] SessionSearchManager initialized');
    },

    _handleSearchInput(event) {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            this._query = event.target.value.trim().toLowerCase();
            this._performSearch();
        }, 300);
    },

    _performSearch() {
        const clearBtn = document.getElementById('sessionSearchClear');
        if (clearBtn) {
            clearBtn.style.display = this._query ? 'flex' : 'none';
        }

        if (!this._query) {
            this._filteredSessions = null;
        } else {
            const sessions = window.sessionHistory || [];
            const escapedQuery = this._query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedQuery, 'i');

            this._filteredSessions = sessions.filter(session => {
                // Search by title
                if (regex.test(session.title)) return true;

                // Search by date
                if (regex.test(session.date)) return true;

                // Search by participant names
                if (session.participantNames?.some(name => regex.test(name))) return true;

                // Deep search in transcript messages
                const messages = session.transcript?.messages || [];
                return messages.some(msg => regex.test(msg.speaker) || regex.test(msg.text));
            });
        }

        // Re-render session list with filtered results
        if (window.SessionUIManager?.renderSessionHistory) {
            window.SessionUIManager.renderSessionHistory();
        }
    },

    /**
     * Get filtered sessions (used by SessionUIManager.renderSessionHistory)
     * Returns null if no search is active (use full sessionHistory)
     */
    getFilteredSessions() {
        return this._filteredSessions;
    },

    /**
     * Check if search is active
     */
    isSearchActive() {
        return this._query.length > 0;
    },

    clearSearch() {
        this._query = '';
        this._filteredSessions = null;
        const searchInput = document.getElementById('sessionSearchInput');
        const clearBtn = document.getElementById('sessionSearchClear');
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.style.display = 'none';

        if (window.SessionUIManager?.renderSessionHistory) {
            window.SessionUIManager.renderSessionHistory();
        }
    }
};
