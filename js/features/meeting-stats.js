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
        // Use the same avatar gradient palette from the extension
        const colors = [
            '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
            '#f97316', '#eab308', '#22c55e', '#14b8a6',
            '#06b6d4', '#3b82f6', '#a855f7', '#d946ef'
        ];
        return colors[index % colors.length];
    },

    _renderStatsContent(stats) {
        const body = document.getElementById('statsModalBody');
        if (!body) return;

        let html = `
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
            <div class="stats-section">
                <h4 class="stats-section-title">Wiadomości na uczestnika</h4>
        `;

        for (let idx = 0; idx < stats.speakers.length; idx++) {
            const speaker = stats.speakers[idx];
            const color = this._getSpeakerColor(idx);
            html += `
                <div class="stats-bar-row">
                    <span class="stats-bar-label">${speaker.name}</span>
                    <div class="stats-bar-track">
                        <div class="stats-bar-fill" style="width: ${speaker.messagePercent}%; background: ${color};"></div>
                    </div>
                    <span class="stats-bar-value">${speaker.messages} (${speaker.messagePercent}%)</span>
                </div>
            `;
        }

        html += `</div><div class="stats-section"><h4 class="stats-section-title">Słowa na uczestnika</h4>`;

        for (let idx = 0; idx < stats.speakers.length; idx++) {
            const speaker = stats.speakers[idx];
            const color = this._getSpeakerColor(idx);
            html += `
                <div class="stats-bar-row">
                    <span class="stats-bar-label">${speaker.name}</span>
                    <div class="stats-bar-track">
                        <div class="stats-bar-fill" style="width: ${speaker.wordPercent}%; background: ${color};"></div>
                    </div>
                    <span class="stats-bar-value">${speaker.words} (${speaker.wordPercent}%)</span>
                </div>
            `;
        }

        html += `</div><div class="stats-section"><h4 class="stats-section-title">Szacowany czas mówienia</h4>`;

        const maxMinutes = Math.max(...stats.speakers.map(speaker => speaker.estimatedMinutes), 1);
        for (let idx = 0; idx < stats.speakers.length; idx++) {
            const speaker = stats.speakers[idx];
            const color = this._getSpeakerColor(idx);
            const pct = Math.round((speaker.estimatedMinutes / maxMinutes) * 100);
            html += `
                <div class="stats-bar-row">
                    <span class="stats-bar-label">${speaker.name}</span>
                    <div class="stats-bar-track">
                        <div class="stats-bar-fill" style="width: ${pct}%; background: ${color};"></div>
                    </div>
                    <span class="stats-bar-value">${speaker.estimatedMinutes} min</span>
                </div>
            `;
        }

        html += `</div>`;
        body.innerHTML = html;
    }
};
