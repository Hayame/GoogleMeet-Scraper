/**
 * Global Debug Configuration
 * Controls console.log visibility across all extension contexts.
 * Must be loaded FIRST in each context (service worker, content script, popup).
 */

const DEBUG_ENABLED = false;

if (!DEBUG_ENABLED) {
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    // console.warn and console.error remain active for critical issues
}

// Expose globally in whatever context we're running in
const globalScope = (typeof globalThis !== 'undefined') ? globalThis
    : (typeof self !== 'undefined') ? self
    : (typeof window !== 'undefined') ? window
    : null;

if (globalScope) {
    globalScope.DEBUG_ENABLED = DEBUG_ENABLED;
}

console.warn('🔧 Debug Config: Logging is', DEBUG_ENABLED ? 'ENABLED' : 'DISABLED');