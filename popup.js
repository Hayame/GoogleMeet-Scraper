/**
 * Google Meet Transcript Scraper - Main Entry Point
 * Modularized version using extracted components
 */

// Main initialization function
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('🚀 [INIT] Initializing Google Meet Transcript Scraper');
        
        // Check for essential DOM elements
        validateEssentialElements();
        
        // Initialize all modules in the correct order
        initializeApplication();
        
        console.log('✅ [INIT] Application initialized successfully');
        
    } catch (error) {
        console.error('❌ [INIT] Critical initialization error:', error);
        showInitializationError(error);
    }
});

/**
 * Validate that essential DOM elements are present
 */
function validateEssentialElements() {
    const essentialElements = [
        { id: 'recordBtn', name: 'Record button' },
        { id: 'recordingStatus', name: 'Status div' },
        { id: 'transcriptContent', name: 'Transcript content' },
        { id: 'transcriptStats', name: 'Transcript stats' }
    ];
    
    for (const element of essentialElements) {
        if (!document.getElementById(element.id)) {
            throw new Error(`${element.name} not found (ID: ${element.id})`);
        }
    }
}

/**
 * Initialize all application modules in the correct order
 */
function initializeApplication() {
    // 1. Initialize storage management first
    if (window.StorageManager) {
        window.StorageManager.initialize();
        console.log('✅ Storage Manager initialized');
    }
    
    // 2. Initialize core state management
    if (window.StateManager) {
        window.StateManager.initialize();
        console.log('✅ State Manager initialized');
    }
    
    // 3. Initialize UI management
    if (window.UIManager) {
        window.UIManager.initialize();
        console.log('✅ UI Manager initialized');
    }
    
    // 4. Initialize timer management
    if (window.TimerManager) {
        window.TimerManager.initialize();
        console.log('✅ Timer Manager initialized');
    }
    
    // 5. Initialize modal system
    if (window.ModalManager) {
        window.ModalManager.initialize();
        console.log('✅ Modal Manager initialized');
    }
    
    // 6. Initialize background scanner
    if (window.BackgroundScanner) {
        window.BackgroundScanner.initialize();
        console.log('✅ Background Scanner initialized');
    }
    
    // 7. Initialize recording management
    if (window.RecordingManager) {
        window.RecordingManager.initialize();
        console.log('✅ Recording Manager initialized');
    }
    
    // 8. Initialize session history
    if (window.SessionHistoryManager && window.SessionUIManager) {
        window.SessionHistoryManager.initialize();
        window.SessionUIManager.initialize();
        console.log('✅ Session History initialized');
    }
    
    // 9. Initialize transcript features
    if (window.TranscriptManager) {
        window.TranscriptManager.initialize();
        console.log('✅ Transcript Manager initialized');
    }
    
    // 10. Initialize search and filter
    if (window.SearchFilterManager) {
        window.SearchFilterManager.initialize();
        console.log('✅ Search Filter Manager initialized');
    }
    
    // 11. Initialize export functionality
    if (window.ExportManager) {
        window.ExportManager.initialize();
        console.log('✅ Export Manager initialized');
    }
    
    // 12. Setup main event listeners
    setupMainEventListeners();
    
    // 13. Initialize theme system
    initializeTheme();
    
    // 14. Restore application state
    if (window.StateManager) {
        window.StateManager.restoreStateFromStorage();
        console.log('✅ Application state restored');
    }
}

/**
 * Setup main application event listeners
 */
function setupMainEventListeners() {
    // Record button click handler
    const recordBtn = document.getElementById('recordBtn');
    if (recordBtn && window.RecordingManager) {
        recordBtn.addEventListener('click', window.RecordingManager.handleRecordButtonClick);
    }
    
    // Close session button handler
    const closeSessionBtn = document.getElementById('closeSessionBtn');
    if (closeSessionBtn && window.SessionHistoryManager) {
        closeSessionBtn.addEventListener('click', window.SessionHistoryManager.handleCloseSession);
    }
    
    // Clear button handler
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClearButtonClick);
    }
    
    // New session button handler
    const newSessionBtn = document.getElementById('newSessionBtn');
    if (newSessionBtn && window.SessionHistoryManager) {
        newSessionBtn.addEventListener('click', window.SessionHistoryManager.createNewSession);
    }
    
    // Theme toggle handler
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    console.log('✅ Main event listeners setup complete');
}

/**
 * Handle clear button click
 */
function handleClearButtonClick() {
    if (window.realtimeMode) {
        console.log('🔍 [CLEAR BTN] Disabled - recording active');
        return;
    }
    
    if (window.ModalManager) {
        window.ModalManager.showClearConfirmation();
    }
}

/**
 * Initialize theme system
 */
function initializeTheme() {
    // Get saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Update theme toggle icon
    updateThemeToggleIcon(savedTheme);
    
    console.log('✅ Theme initialized:', savedTheme);
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggleIcon(newTheme);
    
    console.log('🎨 Theme changed to:', newTheme);
}

/**
 * Update theme toggle icon based on current theme
 */
function updateThemeToggleIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    const lightIcon = themeToggle.querySelector('.theme-icon-light');
    const darkIcon = themeToggle.querySelector('.theme-icon-dark');
    
    if (lightIcon && darkIcon) {
        if (theme === 'dark') {
            lightIcon.style.display = 'none';
            darkIcon.style.display = 'block';
        } else {
            lightIcon.style.display = 'block';
            darkIcon.style.display = 'none';
        }
    }
}

/**
 * Show initialization error to user
 */
function showInitializationError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #f44336;
        color: white;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        z-index: 10000;
        max-width: 300px;
    `;
    errorDiv.innerHTML = `
        <h3>Błąd inicjalizacji</h3>
        <p>Wystąpił błąd podczas uruchamiania rozszerzenia:</p>
        <p><strong>${error.message}</strong></p>
        <p>Spróbuj odświeżyć stronę lub zrestartować rozszerzenie.</p>
    `;
    document.body.appendChild(errorDiv);
}

/**
 * Utility functions for backward compatibility
 */

// Export commonly used functions to global scope for compatibility
window.generateSessionId = function() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

window.generateSessionTitle = function() {
    const now = new Date();
    const date = now.toLocaleDateString('pl-PL');
    const time = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    return `Spotkanie o ${time}`;
};

// Global error handler
window.addEventListener('error', function(event) {
    console.error('❌ [GLOBAL ERROR]', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ [UNHANDLED PROMISE REJECTION]', event.reason);
});

console.log('📝 Main popup.js loaded - waiting for DOMContentLoaded');