/**
 * Global Debug Configuration
 * Controls console.log visibility across all extension contexts:
 * - Background script (service worker)
 * - Content script (Google Meet page)
 * - Popup script (extension popup)
 * 
 * IMPORTANT: This file must be loaded FIRST in each context
 */

// Global debug control - Change to true to enable all logging
const DEBUG_ENABLED = false;

// Override console methods when debug is disabled
if (!DEBUG_ENABLED) {
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    // console.warn and console.error remain active for critical issues
}

// Make debug status available globally
window.DEBUG_ENABLED = DEBUG_ENABLED;

console.warn('🔧 Debug Config: Logging is', DEBUG_ENABLED ? 'ENABLED' : 'DISABLED');