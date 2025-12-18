/**
 * Timer Manager - Handles duration tracking and timer functionality
 */

window.TimerManager = {
    /**
     * Start duration timer
     * Timer is based on recordingStartTime timestamp, not local setInterval so it works even when popup is closed
     */
    startDurationTimer() {
        // Get recordingStartTime from state manager
        const recordingStartTime = window.StateManager?.getRecordingStartTime();

        // Validate recordingStartTime exists and is a valid Date
        if (!recordingStartTime) {
            console.error('❌ [TIMER] Cannot start timer: recordingStartTime not set');
            return;
        }

        if (!recordingStartTime.getTime || isNaN(recordingStartTime.getTime())) {
            console.error('❌ [TIMER] Cannot start timer: recordingStartTime is Invalid Date:', recordingStartTime);
            console.error('❌ [TIMER] This usually means storage corruption during pause/stop');
            return;
        }

        console.log('🕐 Starting duration timer with recordingStartTime:', recordingStartTime.toISOString());
        
        // Clear any existing timer first
        const durationTimer = window.StateManager?.getDurationTimer();
        if (durationTimer) {
            clearInterval(durationTimer);
            window.StateManager?.setDurationTimer(null);
        }
        
        // Immediate display update to show current time
        this.updateDurationDisplay();
        
        // Start UI update interval only when popup is open
        const newTimer = setInterval(() => this.updateDurationDisplay(), 1000);
        window.StateManager?.setDurationTimer(newTimer);
        console.log('🕐 Duration timer UI started');
    },

    /**
     * Stop duration timer
     */
    stopDurationTimer() {
        const durationTimer = window.StateManager?.getDurationTimer();
        if (durationTimer) {
            clearInterval(durationTimer);
            window.StateManager?.setDurationTimer(null);
            console.log('🕐 Duration timer UI stopped');
        }
    },

    /**
     * Update duration display
     * Always calculate duration in real-time from the actual start time
     */
    updateDurationDisplay() {
        const durationSpan = document.getElementById('duration');
        if (!durationSpan) return;

        const recordingStartTime = window.StateManager?.getRecordingStartTime();
        const sessionTotalDuration = window.StateManager?.getSessionTotalDuration() || 0;

        if (recordingStartTime) {
            // Validate it's a valid date before calculating duration
            if (isNaN(recordingStartTime.getTime())) {
                console.error('❌ [TIMER] Invalid recordingStartTime in updateDurationDisplay - showing accumulated duration only');
                durationSpan.textContent = this.formatDuration(sessionTotalDuration);
                return;
            }

            // Always calculate duration in real-time from the actual start time
            const now = new Date();
            const currentSessionDuration = Math.floor((now - recordingStartTime) / 1000);
            const totalDuration = sessionTotalDuration + currentSessionDuration;
            
            // Update display with current calculated time
            durationSpan.textContent = this.formatDuration(totalDuration);
            
            // Debug log every 30 seconds to help with troubleshooting
            if (currentSessionDuration % 30 === 0) {
                console.log('🕐 Timer update:', {
                    recordingStartTime: recordingStartTime.toISOString(),
                    currentSessionDuration,
                    sessionTotalDuration,
                    totalDuration,
                    displayText: this.formatDuration(totalDuration)
                });
            }
            
            // Save timer state to storage periodically (every 10 seconds) for popup restoration
            if (totalDuration % 10 === 0) {
                // Use StorageManager for consistent storage operations
                // Save duration to storage (non-blocking)
                (async () => {
                    try {
                        await window.StorageManager.saveSessionState({
                            sessionTotalDuration: sessionTotalDuration,
                            recordingStartTime: recordingStartTime
                        });
                    } catch (error) {
                        console.error('❌ [TIMER] Failed to save duration:', error);
                        // Non-fatal - timer continues updating in UI
                    }
                })();
            }
        } else {
            // No active recording - show total accumulated duration
            durationSpan.textContent = this.formatDuration(sessionTotalDuration);
        }
    },

    /**
     * Format duration in seconds to display format
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration string (H:MM:SS or M:SS)
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    },

    /**
     * Calculate current session duration in seconds
     * Used throughout popup.js for duration calculations
     * @returns {number} Current session duration in seconds
     */
    getCurrentSessionDuration() {
        const recordingStartTime = window.StateManager?.getRecordingStartTime();
        if (!recordingStartTime) {
            return 0;
        }
        const now = new Date();
        return Math.floor((now - recordingStartTime) / 1000);
    },

    /**
     * Calculate total duration including previous sessions
     * @returns {number} Total duration in seconds
     */
    getTotalDuration() {
        const sessionTotalDuration = window.StateManager?.getSessionTotalDuration() || 0;
        const currentSessionDuration = this.getCurrentSessionDuration();
        return sessionTotalDuration + currentSessionDuration;
    },

    /**
     * Add current session duration to total and reset recording start time
     * Used when pausing/stopping recording
     */
    accumulateSessionDuration() {
        const recordingStartTime = window.StateManager?.getRecordingStartTime();
        if (recordingStartTime) {
            const now = new Date();
            const currentSessionDuration = Math.floor((now - recordingStartTime) / 1000);
            const currentTotal = window.StateManager?.getSessionTotalDuration() || 0;
            window.StateManager?.setSessionTotalDuration(currentTotal + currentSessionDuration);
        }
    },

    /**
     * Initialize TimerManager module
     */
    initialize() {
        console.log('⏰ [TIMER] TimerManager initialized');
        
        // Set up global aliases for backward compatibility
        this.setupGlobalAliases();
    },

    /**
     * Set up global function aliases for backward compatibility
     */
    setupGlobalAliases() {
        // Expose timer functions globally
        window.startDurationTimer = this.startDurationTimer.bind(this);
        window.stopDurationTimer = this.stopDurationTimer.bind(this);
        window.updateDurationDisplay = this.updateDurationDisplay.bind(this);
        // NOTE: formatDuration is also available via UIManager for UI formatting
        
        console.log('🔗 [TIMER] Global timer function aliases created for backward compatibility');
    }
};

console.log('TimerManager module loaded');