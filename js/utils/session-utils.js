/**
 * Session Utilities - Helper functions for session management
 */

window.SessionUtils = {
    /**
     * Generate a unique session ID
     * @returns {string} Unique session identifier
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Generate a session title based on current time
     * @returns {string} Formatted session title
     */
    generateSessionTitle() {
        return this.generateSessionTitleForDate(new Date());
    },

    /**
     * Generate session title for a specific date
     * @param {Date} date - Date to use for title generation
     * @returns {string} Formatted session title
     */
    generateSessionTitleForDate(date) {
        const time = window.Formatters
            ? window.Formatters.formatSessionTime(date)
            : date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        return `Spotkanie o ${time}`;
    },

    /**
     * Validate session ID format
     * @param {string} sessionId - Session ID to validate
     * @returns {boolean} True if valid session ID format
     */
    isValidSessionId(sessionId) {
        if (!sessionId || typeof sessionId !== 'string') return false;
        return /^session_\d+_[a-z0-9]+$/.test(sessionId);
    }
};
