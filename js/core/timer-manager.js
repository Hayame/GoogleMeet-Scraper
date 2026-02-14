/**
 * Timer Manager - Handles duration tracking and timer functionality
 * Timer is based on recordingStartTime, not setInterval, so it survives popup close/reopen.
 */

window.TimerManager = {
    startDurationTimer() {
        const recordingStartTime = window.StateManager?.getRecordingStartTime();

        if (!recordingStartTime) {
            console.error('❌ [TIMER] Cannot start timer: recordingStartTime not set');
            return;
        }

        if (!recordingStartTime.getTime || isNaN(recordingStartTime.getTime())) {
            console.error('❌ [TIMER] Cannot start timer: recordingStartTime is Invalid Date:', recordingStartTime);
            return;
        }

        console.log('🕐 [TIMER] Starting duration timer with recordingStartTime:', recordingStartTime.toISOString());

        // Clear any existing timer first
        this.stopDurationTimer();

        this.updateDurationDisplay();

        const newTimer = setInterval(() => this.updateDurationDisplay(), 1000);
        window.StateManager?.setDurationTimer(newTimer);
    },

    stopDurationTimer() {
        const durationTimer = window.StateManager?.getDurationTimer();
        if (durationTimer) {
            clearInterval(durationTimer);
            window.StateManager?.setDurationTimer(null);
            console.log('🕐 [TIMER] Duration timer stopped');
        }
    },

    /**
     * Update duration display by calculating elapsed time from recordingStartTime
     */
    updateDurationDisplay() {
        const durationSpan = document.getElementById('duration');
        if (!durationSpan) return;

        const recordingStartTime = window.StateManager?.getRecordingStartTime();
        const sessionTotalDuration = window.StateManager?.getSessionTotalDuration() || 0;

        if (!recordingStartTime) {
            durationSpan.textContent = this.formatDuration(sessionTotalDuration);
            return;
        }

        if (isNaN(recordingStartTime.getTime())) {
            console.error('❌ [TIMER] Invalid recordingStartTime - showing accumulated duration only');
            durationSpan.textContent = this.formatDuration(sessionTotalDuration);
            return;
        }

        const currentSessionDuration = Math.floor((Date.now() - recordingStartTime.getTime()) / 1000);
        const totalDuration = sessionTotalDuration + currentSessionDuration;

        durationSpan.textContent = this.formatDuration(totalDuration);

        // Debug log every 30 seconds
        if (currentSessionDuration % 30 === 0) {
            console.log('🕐 [TIMER] Update:', { currentSessionDuration, sessionTotalDuration, totalDuration });
        }

        // Save to storage periodically (every 10 seconds) for popup restoration
        if (totalDuration % 10 === 0) {
            window.StorageManager.saveSessionState({
                sessionTotalDuration,
                recordingStartTime
            }).catch((error) => {
                console.error('❌ [TIMER] Failed to save duration:', error);
            });
        }
    },

    /**
     * Format seconds to H:MM:SS or M:SS display string
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    },

    getCurrentSessionDuration() {
        const recordingStartTime = window.StateManager?.getRecordingStartTime();
        if (!recordingStartTime) return 0;
        return Math.floor((Date.now() - recordingStartTime.getTime()) / 1000);
    },

    getTotalDuration() {
        const sessionTotalDuration = window.StateManager?.getSessionTotalDuration() || 0;
        return sessionTotalDuration + this.getCurrentSessionDuration();
    },

    /**
     * Add current session duration to accumulated total (used when pausing/stopping)
     */
    accumulateSessionDuration() {
        const recordingStartTime = window.StateManager?.getRecordingStartTime();
        if (!recordingStartTime) return;

        const currentSessionDuration = Math.floor((Date.now() - recordingStartTime.getTime()) / 1000);
        const currentTotal = window.StateManager?.getSessionTotalDuration() || 0;
        window.StateManager?.setSessionTotalDuration(currentTotal + currentSessionDuration);
    },

    initialize() {
        console.log('⏰ [TIMER] TimerManager initialized');
        this.setupGlobalAliases();
    },

    setupGlobalAliases() {
        window.startDurationTimer = this.startDurationTimer.bind(this);
        window.stopDurationTimer = this.stopDurationTimer.bind(this);
        window.updateDurationDisplay = this.updateDurationDisplay.bind(this);
        console.log('🔗 [TIMER] Global timer aliases created');
    }
};