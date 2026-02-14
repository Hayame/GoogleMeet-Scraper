/**
 * Session History UI Management Module
 * Handles UI rendering and interactions for session history
 */

window.SessionUIManager = {
    /**
     * Render the session history list
     */
    renderSessionHistory() {
        const historyContainer = document.getElementById('sessionList');
        if (!historyContainer) {
            return;
        }

        historyContainer.innerHTML = '';

        if (!window.sessionHistory?.length) {
            historyContainer.innerHTML = '<div class="empty-sessions"><p>Brak zapisanych sesji</p></div>';
            return;
        }

        window.sessionHistory.forEach(session => {
            const sessionDiv = document.createElement('div');
            sessionDiv.className = 'session-item';
            if (session.id === window.currentSessionId) {
                sessionDiv.classList.add('active');
            }

            const sessionInfo = document.createElement('div');
            sessionInfo.className = 'session-info';

            const titleDiv = document.createElement('div');
            titleDiv.className = 'session-title';
            titleDiv.textContent = session.title;

            const metaDiv = document.createElement('div');
            metaDiv.className = 'session-meta';
            const date = new Date(session.date);
            const dateStr = date.toLocaleDateString('pl-PL');
            const timeStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

            const participantsSpan = this._createParticipantsSpan(session);

            metaDiv.innerHTML = `${dateStr} ${timeStr} • `;
            metaDiv.appendChild(participantsSpan);
            metaDiv.appendChild(document.createTextNode(` • ${session.entryCount} wpisów`));

            sessionInfo.appendChild(titleDiv);
            sessionInfo.appendChild(metaDiv);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '🗑';
            deleteBtn.title = 'Usuń sesję';
            deleteBtn.onclick = (e) => {
                window.SessionHistoryManager?.deleteSessionFromHistory(session.id, e);
            };

            sessionDiv.appendChild(sessionInfo);
            sessionDiv.appendChild(deleteBtn);

            sessionDiv.onclick = () => {
                window.SessionHistoryManager?.loadSessionFromHistory(session.id);
            };

            historyContainer.appendChild(sessionDiv);
        });

        window.reinitializeEnhancedInteractions?.();

        setTimeout(() => this.updateSessionTooltips(), 50);
    },

    /**
     * Create a participants span element with appropriate styling
     * @private
     */
    _createParticipantsSpan(session) {
        const span = document.createElement('span');
        span.textContent = `${session.participantCount} uczestników`;

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
     * Show participants list modal for a session
     */
    /**
     * Get initials from a name (max 2 characters)
     * @private
     */
    _getInitials(name) {
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    },

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

        const speakerColors = window.getSpeakerColorMap(messages);

        const participantsList = document.getElementById('participantsList');
        if (!participantsList) {
            return;
        }

        participantsList.innerHTML = '';

        if (participants.length === 0) {
            participantsList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Brak uczestników do wyświetlenia</p>';
        } else {
            participants.forEach(participant => {
                const participantDiv = document.createElement('div');
                participantDiv.className = 'participant-item';

                const avatar = document.createElement('div');
                avatar.className = `participant-avatar color-${speakerColors.get(participant.name) || 1}`;
                avatar.textContent = this._getInitials(participant.name);

                const info = document.createElement('div');
                info.className = 'participant-info';

                const nameDiv = document.createElement('div');
                nameDiv.className = 'participant-name';
                nameDiv.textContent = participant.name;

                const statsDiv = document.createElement('div');
                statsDiv.className = 'participant-stats';
                const count = participant.messageCount;
                statsDiv.textContent = `${count} ${count === 1 ? 'wiadomość' : 'wiadomości'}`;

                info.appendChild(nameDiv);
                info.appendChild(statsDiv);
                participantDiv.appendChild(avatar);
                participantDiv.appendChild(info);
                participantsList.appendChild(participantDiv);
            });
        }

        const modalTitle = document.querySelector('#participantsModal .modal-title');
        if (modalTitle) {
            modalTitle.textContent = `Uczestnicy - ${session.title}`;
        }

        window.showModal('participantsModal');
    },

    /**
     * Update session tooltips for collapsed sidebar
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

        sessionItems.forEach(item => {
            const sessionInfo = item.querySelector('.session-info');
            if (!sessionInfo) {
                return;
            }

            const title = sessionInfo.querySelector('.session-title')?.textContent || 'Sesja';
            const meta = sessionInfo.querySelector('.session-meta')?.textContent || '';
            const parts = meta.split(' • ');

            let tooltip = `📝 ${title}`;
            if (parts.length >= 3) {
                tooltip += `\n\n📅 ${parts[0]}\n👥 ${parts[1]}\n💬 ${parts[2]}`;
            } else if (parts.length >= 2) {
                tooltip += `\n\n📅 ${parts[0]}\n👥 ${parts[1]}`;
            } else if (meta) {
                tooltip += `\n\n📋 ${meta}`;
            }

            item.setAttribute('data-tooltip', tooltip);
        });

        newSessionBtn?.setAttribute('data-tooltip', '➕ Nowa sesja');
    },

    /**
     * Initialize session UI components
     */
    initialize() {
        const participantsModal = document.getElementById('participantsModal');
        const closeBtn = participantsModal?.querySelector('.close');
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