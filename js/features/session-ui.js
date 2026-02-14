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
            if (window.SessionSearchManager?.isSearchActive()) {
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

        const metaDiv = this._el('div', 'session-meta');
        metaDiv.innerHTML = `${dateStr} ${timeStr} • `;
        metaDiv.appendChild(this._createParticipantsSpan(session));
        metaDiv.appendChild(document.createTextNode(` • ${session.entryCount} wpisów`));

        sessionInfo.appendChild(titleDiv);
        sessionInfo.appendChild(metaDiv);

        const deleteBtn = this._el('button', 'delete-btn');
        deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
        deleteBtn.title = 'Usuń sesję';
        deleteBtn.onclick = (e) => {
            window.SessionHistoryManager?.deleteSessionFromHistory(session.id, e);
        };

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
            span.style.cursor = 'pointer';
            span.style.textDecoration = 'underline';
            span.style.color = 'var(--btn-primary-bg)';
            span.onclick = (e) => {
                e.stopPropagation();
                this.showParticipantsList(session);
            };
        } else {
            span.className = 'participants-non-clickable';
            span.title = 'Brak uczestników';
            span.style.cursor = 'default';
            span.style.color = 'var(--text-muted)';
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

    /**
     * Update session tooltips for collapsed sidebar.
     */
    updateSessionTooltips() {
        const sidebar = document.querySelector('.sidebar');
        const sessionItems = document.querySelectorAll('.session-item');
        const newSessionBtn = document.querySelector('.new-session-btn');
        const isCollapsed = sidebar?.classList.contains('collapsed');

        if (!isCollapsed) {
            sessionItems.forEach(item => item.removeAttribute('data-tooltip'));
            newSessionBtn?.removeAttribute('data-tooltip');
            return;
        }

        for (const item of sessionItems) {
            const title = item.querySelector('.session-title')?.textContent || 'Sesja';
            const meta = item.querySelector('.session-meta')?.textContent || '';
            const parts = meta.split(' • ');

            const lines = [`📝 ${title}`];
            const icons = ['📅', '👥', '💬'];
            if (parts.length >= 2) {
                for (let i = 0; i < Math.min(parts.length, 3); i++) {
                    lines.push(`${icons[i]} ${parts[i]}`);
                }
            } else if (meta) {
                lines.push(`📋 ${meta}`);
            }

            item.setAttribute('data-tooltip', lines.join('\n\n'));
        }

        newSessionBtn?.setAttribute('data-tooltip', '➕ Nowa sesja');
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
