/**
 * Formatters - Utility functions for formatting various data types
 * Extracted from popup.js for better modularity
 */

window.Formatters = {
    /**
     * Format duration in seconds to display format (from popup.js lines 2606-2616)
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
     * Format timestamp for display
     * @param {Date} date - Date object to format
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(date) {
        if (!date) return '';
        return date.toLocaleString('pl-PL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    /**
     * Format date for session titles
     * @param {Date} date - Date object to format
     * @returns {string} Formatted date string
     */
    formatSessionDate(date) {
        if (!date) return '';
        return date.toLocaleDateString('pl-PL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    },

    /**
     * Format time for session titles
     * @param {Date} date - Date object to format
     * @returns {string} Formatted time string
     */
    formatSessionTime(date) {
        if (!date) return '';
        return date.toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Format file size in bytes to human readable format
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size string
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Format speaker name for display (trim and handle empty names)
     * @param {string} speaker - Speaker name
     * @returns {string} Formatted speaker name
     */
    formatSpeakerName(speaker) {
        if (!speaker || typeof speaker !== 'string') return 'Nieznany';
        const trimmed = speaker.trim();
        return trimmed || 'Nieznany';
    },

    /**
     * Format transcript text for display (trim and handle empty text)
     * @param {string} text - Transcript text
     * @returns {string} Formatted text
     */
    formatTranscriptText(text) {
        if (!text || typeof text !== 'string') return '';
        return text.trim();
    },

    /**
     * Escape HTML entities in text
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Truncate text to specified length with ellipsis
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncateText(text, maxLength = 100) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
};

console.log('Formatters module loaded');