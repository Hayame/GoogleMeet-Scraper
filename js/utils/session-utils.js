/**
 * Session Utilities - Helper functions for session management
 * Extracted from popup.js for better modularity
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
     * Uses Formatters.formatSessionTime() for consistent time formatting
     * @returns {string} Formatted session title
     */
    generateSessionTitle() {
        const now = new Date();
        
        // Use Formatters if available, otherwise fallback to basic formatting
        if (window.Formatters && window.Formatters.formatSessionTime) {
            const time = window.Formatters.formatSessionTime(now);
            return `Spotkanie o ${time}`;
        } else {
            // Fallback formatting
            const time = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            return `Spotkanie o ${time}`;
        }
    },
    
    /**
     * Generate session title with custom date
     * @param {Date} date - Date to use for title generation
     * @returns {string} Formatted session title
     */
    generateSessionTitleForDate(date) {
        if (window.Formatters && window.Formatters.formatSessionTime) {
            const time = window.Formatters.formatSessionTime(date);
            return `Spotkanie o ${time}`;
        } else {
            const time = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            return `Spotkanie o ${time}`;
        }
    },
    
    /**
     * Validate session ID format
     * @param {string} sessionId - Session ID to validate
     * @returns {boolean} True if valid session ID format
     */
    isValidSessionId(sessionId) {
        if (!sessionId || typeof sessionId !== 'string') {
            return false;
        }
        
        // Check if it matches the expected format: session_timestamp_randomString
        const sessionIdPattern = /^session_\d+_[a-z0-9]+$/;
        return sessionIdPattern.test(sessionId);
    }
};