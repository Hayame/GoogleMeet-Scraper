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

// Make debug status available globally - compatible with all contexts
try {
    // Popup and Content Script (have window)
    if (typeof window !== 'undefined') {
        window.DEBUG_ENABLED = DEBUG_ENABLED;
    }
    // Service Worker (has globalThis)
    if (typeof globalThis !== 'undefined') {
        globalThis.DEBUG_ENABLED = DEBUG_ENABLED;
    }
} catch (e) {
    // Ignore errors when setting global variables
}

// Safe status logging
try {
    console.warn('🔧 Debug Config: Logging is', DEBUG_ENABLED ? 'ENABLED' : 'DISABLED');
} catch (e) {
    // Ignore if console.warn is also blocked
}