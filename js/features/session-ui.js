/**
 * Session History UI Management Module
 * Handles UI rendering and interactions for session history
 * 
 * Extracted from popup.js lines: 2038-2114, 2820-2905, 2117-2133
 */

window.SessionUIManager = {
    /**
     * Render the session history list
     * Source: popup.js lines 2038-2114
     */
    renderSessionHistory() {
        const historyContainer = document.getElementById('sessionList');
        if (!historyContainer) {
            console.error('Session list container not found');
            return;
        }
        
        historyContainer.innerHTML = '';
        
        if (!window.sessionHistory || window.sessionHistory.length === 0) {
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
            
            // Create participants section - clickable only if count > 0
            const participantsSpan = document.createElement('span');
            participantsSpan.textContent = `${session.participantCount} uczestników`;
            
            // CRITICAL FIX: Only make clickable when there are participants
            if (session.participantCount > 0) {
                participantsSpan.className = 'participants-clickable';
                participantsSpan.title = 'Kliknij aby zobaczyć listę uczestników';
                participantsSpan.style.cursor = 'pointer';
                participantsSpan.style.textDecoration = 'underline';
                participantsSpan.style.color = 'var(--btn-primary-bg)';
                participantsSpan.onclick = (e) => {
                    e.stopPropagation(); // Prevent session loading
                    this.showParticipantsList(session);
                };
            } else {
                // Non-clickable style for 0 participants
                participantsSpan.className = 'participants-non-clickable';
                participantsSpan.title = 'Brak uczestników';
                participantsSpan.style.cursor = 'default';
                participantsSpan.style.textDecoration = 'none';
                participantsSpan.style.color = 'var(--text-muted)';
            }
            
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
                if (window.SessionHistoryManager && window.SessionHistoryManager.deleteSessionFromHistory) {
                    window.SessionHistoryManager.deleteSessionFromHistory(session.id, e);
                }
            };
            
            sessionDiv.appendChild(sessionInfo);
            sessionDiv.appendChild(deleteBtn);
            
            sessionDiv.onclick = () => {
                if (window.SessionHistoryManager && window.SessionHistoryManager.loadSessionFromHistory) {
                    window.SessionHistoryManager.loadSessionFromHistory(session.id);
                }
            };
            
            historyContainer.appendChild(sessionDiv);
        });
            
        // Reinitialize enhanced interactions for session items
        if (window.reinitializeEnhancedInteractions) {
            window.reinitializeEnhancedInteractions();
        }
        
        // Update tooltips for collapsed sidebar (with delay for DOM to settle)
        if (typeof window.updateSessionTooltips === 'function') {
            setTimeout(() => {
                window.updateSessionTooltips();
            }, 50); // Small delay to ensure DOM is fully rendered
        }
    },

    /**
     * Show participants list modal for a session
     * Source: popup.js lines 2820-2905
     */
    showParticipantsList(session) {
        // Extract unique participants from session transcript
        const participantsMap = new Map();
        
        if (session.transcript && session.transcript.messages) {
            session.transcript.messages.forEach(message => {
                const speaker = message.speaker;
                if (speaker && speaker !== 'Nieznany') {
                    if (!participantsMap.has(speaker)) {
                        participantsMap.set(speaker, {
                            name: speaker,
                            messageCount: 0
                        });
                    }
                    participantsMap.get(speaker).messageCount++;
                }
            });
        }
        
        const participants = Array.from(participantsMap.values())
            .sort((a, b) => b.messageCount - a.messageCount); // Sort by message count
        
        // Get color mapping using the same function as transcript
        const speakerColors = window.getSpeakerColorMap(session.transcript.messages);
        
        // Generate initials
        function getInitials(name) {
            return name.split(' ')
                .map(word => word.charAt(0).toUpperCase())
                .slice(0, 2) // Max 2 initials
                .join('');
        }
        
        // Generate participant list HTML
        const participantsList = document.getElementById('participantsList');
        if (!participantsList) {
            console.error('Participants list container not found');
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
                avatar.className = 'participant-avatar';
                avatar.textContent = getInitials(participant.name);
                
                // Apply the same color as in transcript
                const colorIndex = speakerColors.get(participant.name) || 1;
                avatar.classList.add(`color-${colorIndex}`);
                
                const info = document.createElement('div');
                info.className = 'participant-info';
                
                const name = document.createElement('div');
                name.className = 'participant-name';
                name.textContent = participant.name;
                
                const stats = document.createElement('div');
                stats.className = 'participant-stats';
                stats.textContent = `${participant.messageCount} ${participant.messageCount === 1 ? 'wiadomość' : participant.messageCount < 5 ? 'wiadomości' : 'wiadomości'}`;
                
                info.appendChild(name);
                info.appendChild(stats);
                
                participantDiv.appendChild(avatar);
                participantDiv.appendChild(info);
                
                participantsList.appendChild(participantDiv);
            });
        }
        
        // Show the modal
        const modalTitle = document.querySelector('#participantsModal .modal-title');
        if (modalTitle) {
            modalTitle.textContent = `Uczestnicy - ${session.title}`;
        }
        
        window.showModal('participantsModal');
    },


    /**
     * Initialize session UI components
     */
    initialize() {
        // Setup event listeners for session-related UI elements
        this.setupEventListeners();
    },

    /**
     * Setup event listeners for session UI
     */
    setupEventListeners() {
        // Event listeners for session history UI will be added here
        // This is called after the DOM is ready and session history is loaded
        
        // Participants modal close button
        const participantsModal = document.getElementById('participantsModal');
        if (participantsModal) {
            const closeBtn = participantsModal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    window.hideModal('participantsModal');
                });
            }
        }
    },

};