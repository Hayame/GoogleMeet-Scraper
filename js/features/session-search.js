/**
 * Session Search Module
 * Provides search functionality across all saved sessions
 * with grouped search results in content area
 */
window.SessionSearchManager = {
    _query: '',
    _debounceTimer: null,
    _filteredSessions: null,
    _searchResults: null,
    _viewMode: 'NORMAL',

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

    /**
     * Restore persisted search query after session history is loaded.
     * Called from popup.js after SessionHistoryManager.initialize().
     */
    async restoreSearch() {
        try {
            const key = window.AppConstants?.STORAGE_KEYS?.GLOBAL_SEARCH_QUERY;
            if (!key) return;
            const result = await window.StorageManager.getStorageData([key]);
            const savedQuery = result[key];
            if (savedQuery) {
                this._query = savedQuery;
                const searchInput = document.getElementById('sessionSearchInput');
                if (searchInput) searchInput.value = savedQuery;
                this._performSearch();
            }
        } catch (e) {
            console.error('❌ [SESSION-SEARCH] Failed to restore search:', e);
        }
    },

    _handleSearchInput(event) {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            this._query = event.target.value.trim().toLowerCase();
            this._performSearch();
            this._persistQuery();
        }, 300);
    },

    /**
     * Persist query to chrome.storage so it survives popup close/open
     */
    _persistQuery() {
        const key = window.AppConstants?.STORAGE_KEYS?.GLOBAL_SEARCH_QUERY;
        if (key) {
            window.StorageManager?.setStorageData({ [key]: this._query || '' })
                .catch(e => console.error('❌ [SESSION-SEARCH] Failed to persist query:', e));
        }
    },

    _performSearch() {
        const clearBtn = document.getElementById('sessionSearchClear');
        if (clearBtn) {
            clearBtn.style.display = this._query ? 'flex' : 'none';
        }

        if (!this._query) {
            this._filteredSessions = null;
            this._searchResults = null;
            if (this._viewMode === 'SEARCH_RESULTS') {
                this._restoreNormalView();
            }
        } else {
            const sessions = window.sessionHistory || [];
            const escapedQuery = this._query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedQuery, 'i');

            this._filteredSessions = [];
            this._searchResults = [];
            let hasTranscriptMatches = false;

            for (const session of sessions) {
                const titleMatch = regex.test(session.title);
                const dateMatch = regex.test(session.date);
                const participantMatch = session.participantNames?.some(name => regex.test(name));

                const messages = session.transcript?.messages || [];
                const matchedMessages = [];
                for (const msg of messages) {
                    if (regex.test(msg.speaker) || regex.test(msg.text)) {
                        matchedMessages.push(msg);
                    }
                }

                if (titleMatch || dateMatch || participantMatch || matchedMessages.length > 0) {
                    this._filteredSessions.push(session);
                }

                if (matchedMessages.length > 0) {
                    hasTranscriptMatches = true;
                    this._searchResults.push({ session, matchedMessages });
                }
            }

            if (hasTranscriptMatches) {
                this._viewMode = 'SEARCH_RESULTS';
                this._renderSearchResults();
            } else {
                this._searchResults = null;
                if (this._viewMode === 'SEARCH_RESULTS') {
                    this._restoreNormalView();
                }
            }
        }

        // Apply SessionFilterManager filters (AND logic)
        if (window.SessionFilterManager?.hasActiveFilters()) {
            const base = this._filteredSessions ?? (window.sessionHistory || []);
            this._filteredSessions = window.SessionFilterManager.applyFilters(base);
        }

        // Re-render session list with filtered results
        if (window.SessionUIManager?.renderSessionHistory) {
            window.SessionUIManager.renderSessionHistory();
        }
    },

    /**
     * Clear search and navigate to a session
     */
    _navigateToSession(sessionId) {
        this.clearSearch();
        window.SessionHistoryManager?.loadSessionFromHistory(sessionId);
    },

    /**
     * Render search results grouped by session in the content area
     */
    _renderSearchResults() {
        const transcriptContent = document.getElementById('transcriptContent');
        if (!transcriptContent) return;

        // Hide elements that belong to normal view
        this._setNormalViewVisibility(false);

        // Update transcript title
        const titleEl = document.querySelector('.transcript-title');
        if (titleEl) {
            titleEl.textContent = 'Wyniki wyszukiwania';
        }

        transcriptContent.innerHTML = '';

        // Summary header
        const totalMatches = this._searchResults.reduce((sum, r) => sum + r.matchedMessages.length, 0);
        const sessionCount = this._searchResults.length;

        const header = document.createElement('div');
        header.className = 'search-results-header';
        header.textContent = `Znaleziono ${totalMatches} wyników w ${sessionCount} ${sessionCount === 1 ? 'sesji' : 'sesjach'}`;
        transcriptContent.appendChild(header);

        // Render each session card
        for (const result of this._searchResults) {
            const card = this._createSessionCard(result);
            transcriptContent.appendChild(card);
        }
    },

    /**
     * Create a session card with matched messages
     */
    _createSessionCard(result) {
        const { session, matchedMessages } = result;
        const totalMatches = matchedMessages.length;
        const query = this._query;

        const card = document.createElement('div');
        card.className = 'search-result-card';

        // Header
        const header = document.createElement('div');
        header.className = 'search-result-card-header';
        header.onclick = () => this._navigateToSession(session.id);

        const headerInfo = document.createElement('div');
        headerInfo.className = 'search-result-card-header-info';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'search-result-card-title';
        titleSpan.textContent = session.title;

        const date = new Date(session.date);
        const dateStr = date.toLocaleDateString('pl-PL');
        const timeStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        const dateSpan = document.createElement('span');
        dateSpan.className = 'search-result-card-date';
        dateSpan.textContent = `${dateStr} ${timeStr}`;

        headerInfo.appendChild(titleSpan);
        headerInfo.appendChild(dateSpan);

        const badge = document.createElement('span');
        badge.className = 'search-result-match-badge';
        badge.textContent = totalMatches;

        header.appendChild(headerInfo);
        header.appendChild(badge);
        card.appendChild(header);

        // Messages preview (max 5)
        const messagesContainer = document.createElement('div');
        messagesContainer.className = 'search-result-messages';

        const allMessages = session.transcript?.messages || [];
        const speakerColors = window.TranscriptManager?.getSpeakerColorMap(allMessages) || new Map();
        const previewMessages = matchedMessages.slice(0, 5);

        for (const msg of previewMessages) {
            messagesContainer.appendChild(this._createResultMessage(msg, query, speakerColors, session.id));
        }

        card.appendChild(messagesContainer);

        // "Show all" link if more than 5 matches
        if (totalMatches > 5) {
            const viewAll = document.createElement('a');
            viewAll.className = 'search-result-view-all';
            viewAll.textContent = `Pokaż wszystkie (${totalMatches})`;
            viewAll.href = '#';
            viewAll.onclick = (e) => {
                e.preventDefault();
                this._navigateToSession(session.id);
            };
            card.appendChild(viewAll);
        }

        return card;
    },

    /**
     * Create a single message preview element
     */
    _createResultMessage(msg, query, speakerColors, sessionId) {
        const row = document.createElement('div');
        row.className = 'search-result-message';
        row.onclick = () => {
            this._navigateToSession(sessionId);
            // Scroll to message after session loads
            if (msg.hash) {
                setTimeout(() => {
                    const el = document.querySelector(`[data-message-hash="${msg.hash}"]`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('search-result-highlight-flash');
                        setTimeout(() => el.classList.remove('search-result-highlight-flash'), 2000);
                    }
                }, 300);
            }
        };

        const colorIndex = speakerColors.get(msg.speaker) || 1;
        const avatar = document.createElement('div');
        avatar.className = `avatar color-${colorIndex}`;
        avatar.textContent = msg.speaker.charAt(0).toUpperCase();

        const content = document.createElement('div');
        content.className = 'search-result-message-content';

        const speaker = document.createElement('span');
        speaker.className = 'search-result-message-speaker';
        speaker.textContent = msg.speaker;

        const text = document.createElement('p');
        text.className = 'search-result-message-text';
        const highlightFn = window.TranscriptManager?.highlightText;
        text.innerHTML = highlightFn ? highlightFn(msg.text, query) : msg.text;

        content.appendChild(speaker);
        content.appendChild(text);
        row.appendChild(avatar);
        row.appendChild(content);

        return row;
    },

    /**
     * Toggle visibility of normal-view elements
     */
    _setNormalViewVisibility(visible) {
        const els = [
            document.querySelector('.recording-controls'),
            document.getElementById('transcriptStats'),
            document.getElementById('statsBtn'),
            document.querySelector('.transcript-actions'),
        ];
        for (const el of els) {
            el?.classList.toggle('search-results-hidden', !visible);
        }
    },

    /**
     * Restore the normal content area view
     */
    _restoreNormalView() {
        this._viewMode = 'NORMAL';
        this._searchResults = null;

        // Restore title
        const titleEl = document.querySelector('.transcript-title');
        if (titleEl) {
            titleEl.textContent = 'Transkrypcja';
        }

        // Restore hidden elements
        this._setNormalViewVisibility(true);

        // Re-display current session or empty state
        if (window.transcriptData) {
            window.displayTranscript(window.transcriptData);
            window.updateStats(window.transcriptData);
        } else {
            const transcriptContent = document.getElementById('transcriptContent');
            if (transcriptContent) {
                transcriptContent.innerHTML = `
                    <div class="empty-transcript">
                        <svg class="empty-icon" width="48" height="48" viewBox="0 0 24 24">
                            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                        </svg>
                        <p>Brak transkrypcji</p>
                        <p class="empty-subtitle">Rozpocznij nagrywanie, aby zobaczyć transkrypcję</p>
                    </div>`;
            }
        }

        // Restore action group visibility based on current state
        window.UIManager?.updateUIState?.();
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

    /**
     * Check if the search results view is currently displayed
     */
    isSearchResultsView() {
        return this._viewMode === 'SEARCH_RESULTS';
    },

    /**
     * Exit search results view without clearing the query
     */
    exitResultsView() {
        if (this._viewMode !== 'SEARCH_RESULTS') {
            return;
        }

        this._viewMode = 'NORMAL';
        this._searchResults = null;
        this._setNormalViewVisibility(true);
    },

    clearSearch() {
        this._query = '';
        this._filteredSessions = null;
        const searchInput = document.getElementById('sessionSearchInput');
        const clearBtn = document.getElementById('sessionSearchClear');
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.style.display = 'none';

        if (this._viewMode === 'SEARCH_RESULTS') {
            this._restoreNormalView();
        }

        this._persistQuery();

        if (window.SessionUIManager?.renderSessionHistory) {
            window.SessionUIManager.renderSessionHistory();
        }
    }
};
