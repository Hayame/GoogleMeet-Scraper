/**
 * Session History UI Management Module
 * Handles UI rendering and interactions for session history
 */

window.SessionUIManager = {
    /**
     * Create a DOM element with className and optional textContent.
     * @private
     */
    _el(tag, className, textContent) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent != null) el.textContent = textContent;
        return el;
    },

    /**
     * Render the session history list
     */
    renderSessionHistory() {
        const historyContainer = document.getElementById('sessionList');
        if (!historyContainer) {
            return;
        }

        historyContainer.innerHTML = '';

        const sessions = window.SessionSearchManager?.getFilteredSessions() ?? window.sessionHistory ?? [];

        if (!sessions.length) {
            if (window.SessionSearchManager?.isSearchActive() || window.SessionFilterManager?.hasActiveFilters()) {
                historyContainer.innerHTML = '<div class="session-search-empty"><p>Nie znaleziono sesji</p></div>';
            } else if (!window.sessionHistory?.length) {
                historyContainer.innerHTML = '<div class="empty-sessions"><p>Brak zapisanych sesji</p></div>';
            }
            return;
        }

        for (const session of sessions) {
            historyContainer.appendChild(this._buildSessionItem(session));
        }

        window.reinitializeEnhancedInteractions?.();
        setTimeout(() => this.updateSessionTooltips(), 50);
    },

    /**
     * Build a single session item element.
     * @private
     */
    _buildSessionItem(session) {
        const sessionDiv = this._el('div', 'session-item');
        if (session.id === window.currentSessionId) {
            sessionDiv.classList.add('active');
        }

        const sessionInfo = this._el('div', 'session-info');

        const titleDiv = this._el('div', 'session-title', session.title);

        const date = new Date(session.date);
        const dateStr = date.toLocaleDateString('pl-PL');
        const timeStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

        const metaGrid = this._el('div', 'session-meta-grid');

        const dateItem = this._el('div', 'session-meta-item');
        dateItem.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
        dateItem.appendChild(document.createTextNode(` ${dateStr} ${timeStr}`));

        const participantsItem = this._el('div', 'session-meta-item');
        participantsItem.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
        participantsItem.appendChild(document.createTextNode(' '));
        participantsItem.appendChild(this._createParticipantsSpan(session));

        const entriesItem = this._el('div', 'session-meta-item');
        entriesItem.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
        entriesItem.appendChild(document.createTextNode(` ${session.entryCount} wpisów`));

        metaGrid.append(dateItem, participantsItem, entriesItem);

        sessionInfo.appendChild(titleDiv);
        sessionInfo.appendChild(metaGrid);

        const deleteBtn = this._el('button', 'delete-btn');
        deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
        deleteBtn.title = 'Usuń sesję';
        deleteBtn.onclick = (e) => {
            window.SessionHistoryManager?.deleteSessionFromHistory(session.id, e);
        };

        const timeBadge = this._el('div', 'session-time-badge', timeStr);

        sessionDiv.appendChild(timeBadge);
        sessionDiv.appendChild(sessionInfo);
        sessionDiv.appendChild(deleteBtn);

        sessionDiv.onclick = () => {
            window.SessionHistoryManager?.loadSessionFromHistory(session.id);
        };

        return sessionDiv;
    },

    /**
     * Create a participants span element with appropriate styling.
     * @private
     */
    _createParticipantsSpan(session) {
        const span = this._el('span', null, `${session.participantCount} uczestników`);

        if (session.participantCount > 0) {
            span.className = 'participants-clickable';
            span.title = 'Kliknij aby zobaczyć listę uczestników';
            span.onclick = (e) => {
                e.stopPropagation();
                this.showParticipantsList(session);
            };
        } else {
            span.className = 'participants-non-clickable';
            span.title = 'Brak uczestników';
        }

        return span;
    },

    /**
     * Get initials from a name (max 2 characters).
     * @private
     */
    _getInitials(name) {
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    },

    /**
     * Show participants list modal for a session.
     */
    showParticipantsList(session) {
        const messages = session.transcript?.messages || [];
        const participantsMap = new Map();

        for (const message of messages) {
            const speaker = message.speaker;
            if (!speaker || speaker === 'Nieznany') {
                continue;
            }
            if (!participantsMap.has(speaker)) {
                participantsMap.set(speaker, { name: speaker, messageCount: 0 });
            }
            participantsMap.get(speaker).messageCount++;
        }

        const participants = Array.from(participantsMap.values())
            .sort((a, b) => b.messageCount - a.messageCount);

        const participantsList = document.getElementById('participantsList');
        if (!participantsList) {
            return;
        }

        participantsList.innerHTML = '';

        if (participants.length === 0) {
            participantsList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Brak uczestników do wyświetlenia</p>';
        } else {
            const speakerColors = window.getSpeakerColorMap(messages);

            for (const participant of participants) {
                participantsList.appendChild(this._buildParticipantItem(participant, speakerColors));
            }
        }

        const modalTitle = document.querySelector('#participantsModal .modal-title');
        if (modalTitle) {
            modalTitle.textContent = `Uczestnicy - ${session.title}`;
        }

        window.showModal('participantsModal');
    },

    /**
     * Build a single participant item element.
     * @private
     */
    _buildParticipantItem(participant, speakerColors) {
        const participantDiv = this._el('div', 'participant-item');

        const colorIndex = speakerColors.get(participant.name) || 1;
        const avatar = this._el('div', `participant-avatar color-${colorIndex}`, this._getInitials(participant.name));

        const info = this._el('div', 'participant-info');
        const nameDiv = this._el('div', 'participant-name', participant.name);

        const count = participant.messageCount;
        const statsDiv = this._el('div', 'participant-stats', `${count} ${count === 1 ? 'wiadomość' : 'wiadomości'}`);

        info.appendChild(nameDiv);
        info.appendChild(statsDiv);
        participantDiv.appendChild(avatar);
        participantDiv.appendChild(info);

        return participantDiv;
    },

    /** SVG icons for tooltips (14px, stroke-based) */
    _tooltipIcons: {
        document: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
        calendar: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
        users: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        message: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    },

    /** Remove any existing tooltip from the DOM */
    _removeTooltip() {
        document.querySelector('.session-tooltip')?.remove();
    },

    /** Show a DOM tooltip next to the given element */
    _showTooltip(el, html) {
        this._removeTooltip();
        const tip = document.createElement('div');
        tip.className = 'session-tooltip';
        tip.innerHTML = html;
        document.body.appendChild(tip);

        const rect = el.getBoundingClientRect();
        tip.style.left = `${rect.right + 8}px`;
        tip.style.top = `${rect.top + rect.height / 2}px`;
        tip.style.transform = 'translateY(-50%)';
    },

    /** Build tooltip HTML for a session item */
    _buildSessionTooltipHTML(item) {
        const title = item.querySelector('.session-title')?.textContent || 'Sesja';
        const meta = item.querySelector('.session-meta-grid')?.textContent || '';
        const icons = this._tooltipIcons;

        const titleHTML = `<div class="session-tooltip-title">${icons.document}<span>${title}</span></div>`;

        const parts = meta.split(' • ').slice(0, 3);
        if (parts.length < 2) {
            if (!meta) return titleHTML;
            return titleHTML + `<div class="session-tooltip-meta"><div class="session-tooltip-row">${icons.calendar}<span>${meta}</span></div></div>`;
        }

        const metaIcons = [icons.calendar, icons.users, icons.message];
        const rows = parts.map((part, i) =>
            `<div class="session-tooltip-row">${metaIcons[i]}<span>${part}</span></div>`
        ).join('');

        return titleHTML + `<div class="session-tooltip-meta">${rows}</div>`;
    },

    /** Remove tooltip listeners and data attributes from an element */
    _clearTooltip(el) {
        if (!el) return;
        el.removeAttribute('data-tooltip');
        el._tooltipCleanup?.();
    },

    /** Attach mouseenter/mouseleave tooltip listeners to an element */
    _attachTooltip(el, htmlFn) {
        if (!el) return;
        el._tooltipCleanup?.();

        const onEnter = () => this._showTooltip(el, htmlFn());
        const onLeave = () => this._removeTooltip();
        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mouseleave', onLeave);
        el._tooltipCleanup = () => {
            el.removeEventListener('mouseenter', onEnter);
            el.removeEventListener('mouseleave', onLeave);
            delete el._tooltipCleanup;
        };
    },

    /** Update session tooltips for collapsed sidebar */
    updateSessionTooltips() {
        const sidebar = document.querySelector('.sidebar');
        const sessionItems = document.querySelectorAll('.session-item');
        const newSessionBtn = document.querySelector('.new-session-btn');
        const isCollapsed = sidebar?.classList.contains('collapsed');

        if (!isCollapsed) {
            sessionItems.forEach(item => this._clearTooltip(item));
            this._clearTooltip(newSessionBtn);
            this._removeTooltip();
            return;
        }

        for (const item of sessionItems) {
            this._attachTooltip(item, () => this._buildSessionTooltipHTML(item));
        }

        this._attachTooltip(newSessionBtn, () =>
            `<div class="session-tooltip-title">${this._tooltipIcons.plus}<span>Nowa sesja</span></div>`
        );
    },

    /**
     * Initialize session UI components.
     */
    initialize() {
        const closeBtn = document.querySelector('#participantsModal .close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => window.hideModal('participantsModal'));
        }

        this.setupGlobalAliases();
        console.log('🎨 [SESSION UI] SessionUIManager initialized');
    },

    setupGlobalAliases() {
        window.renderSessionHistory = this.renderSessionHistory.bind(this);
        window.updateSessionTooltips = this.updateSessionTooltips.bind(this);
    }
};
