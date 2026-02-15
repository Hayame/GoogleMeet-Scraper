/**
 * Meeting Statistics Module
 * Shows per-speaker analytics with CSS bar charts
 */
window.MeetingStatsManager = {
    initialize() {
        const statsBtn = document.getElementById('statsBtn');
        if (statsBtn) {
            statsBtn.addEventListener('click', () => this.openStatsModal());
        }
        console.log('📊 [STATS] MeetingStatsManager initialized');
    },

    calculateStats(transcriptData) {
        const messages = transcriptData?.messages || [];
        const speakers = new Map();
        let totalWords = 0;

        for (const msg of messages) {
            const name = msg.speaker || 'Nieznany';
            if (!speakers.has(name)) {
                speakers.set(name, { messages: 0, words: 0, chars: 0 });
            }
            const stats = speakers.get(name);
            const wordCount = msg.text ? msg.text.split(/\s+/).filter(Boolean).length : 0;
            stats.messages++;
            stats.words += wordCount;
            stats.chars += (msg.text || '').length;
            totalWords += wordCount;
        }

        // Calculate percentages and estimated speaking time
        const speakerStats = [];
        for (const [name, stats] of speakers) {
            speakerStats.push({
                name,
                messages: stats.messages,
                words: stats.words,
                chars: stats.chars,
                estimatedMinutes: Math.round((stats.words / 150) * 10) / 10, // 150 wpm avg for Polish
                messagePercent: messages.length > 0 ? Math.round((stats.messages / messages.length) * 100) : 0,
                wordPercent: totalWords > 0 ? Math.round((stats.words / totalWords) * 100) : 0
            });
        }

        // Sort by message count descending
        speakerStats.sort((speakerA, speakerB) => speakerB.messages - speakerA.messages);

        return {
            totalMessages: messages.length,
            totalWords,
            totalSpeakers: speakers.size,
            speakers: speakerStats
        };
    },

    openStatsModal() {
        if (!window.transcriptData?.messages?.length) {
            window.ExportManager?.showToast('Brak danych do analizy', 'error');
            return;
        }
        const stats = this.calculateStats(window.transcriptData);
        this._renderStatsContent(stats);
        window.ModalManager?.showModal('statsModal');
    },

    _getSpeakerColor(index) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const colors = isDark
            ? ['#818cf8', '#a78bfa', '#f472b6', '#fb7185',
               '#fb923c', '#facc15', '#4ade80', '#2dd4bf',
               '#22d3ee', '#60a5fa', '#c084fc', '#e879f9']
            : ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e',
               '#f97316', '#eab308', '#22c55e', '#14b8a6',
               '#06b6d4', '#2563eb', '#a855f7', '#d946ef'];
        return colors[index % colors.length];
    },

    _renderBarSection(title, speakers, getPercent, formatValue) {
        let html = `<div class="stats-section"><h4 class="stats-section-title">${title}</h4>`;
        for (let idx = 0; idx < speakers.length; idx++) {
            const speaker = speakers[idx];
            const color = this._getSpeakerColor(idx);
            const percent = getPercent(speaker);
            html += `
                <div class="stats-bar-row">
                    <span class="stats-bar-label">${speaker.name}</span>
                    <div class="stats-bar-track">
                        <div class="stats-bar-fill" style="width: ${percent}%; background: ${color};"></div>
                    </div>
                    <span class="stats-bar-value">${formatValue(speaker)}</span>
                </div>
            `;
        }
        return html + `</div>`;
    },

    _renderStatsContent(stats) {
        const body = document.getElementById('statsModalBody');
        if (!body) return;

        const maxMinutes = Math.max(...stats.speakers.map(speaker => speaker.estimatedMinutes), 1);

        body.innerHTML = `
            <div class="stats-summary">
                <div class="stats-summary-item">
                    <span class="stats-summary-value">${stats.totalMessages}</span>
                    <span class="stats-summary-label">Wiadomości</span>
                </div>
                <div class="stats-summary-item">
                    <span class="stats-summary-value">${stats.totalWords}</span>
                    <span class="stats-summary-label">Słowa</span>
                </div>
                <div class="stats-summary-item">
                    <span class="stats-summary-value">${stats.totalSpeakers}</span>
                    <span class="stats-summary-label">Uczestnicy</span>
                </div>
            </div>
            ${this._renderBarSection(
                'Wiadomości na uczestnika',
                stats.speakers,
                speaker => speaker.messagePercent,
                speaker => `${speaker.messages} (${speaker.messagePercent}%)`
            )}
            ${this._renderBarSection(
                'Słowa na uczestnika',
                stats.speakers,
                speaker => speaker.wordPercent,
                speaker => `${speaker.words} (${speaker.wordPercent}%)`
            )}
            ${this._renderBarSection(
                'Szacowany czas mówienia',
                stats.speakers,
                speaker => Math.round((speaker.estimatedMinutes / maxMinutes) * 100),
                speaker => `${speaker.estimatedMinutes} min`
            )}
        `;
    }
};
