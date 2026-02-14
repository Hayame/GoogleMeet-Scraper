/**
 * Theme Manager - Handles light/dark theme switching functionality
 */

window.ThemeManager = {
    /**
     * Initialize theme system
     */
    initialize() {
        this.applyDefaultTheme();
        this.setupEventListeners();
        console.log('🎨 [THEME] ThemeManager initialized');
    },

    /**
     * Apply default theme (restored theme is applied later via UIManager.restoreUIState)
     */
    applyDefaultTheme() {
        document.documentElement.setAttribute('data-theme', 'light');
        this.updateThemeToggleIcon('light');
    },

    /**
     * Setup event listener for theme toggle button
     */
    setupEventListeners() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggle());
        } else {
            console.warn('⚠️ [THEME] Theme toggle button not found');
        }
    },

    /**
     * Toggle between light and dark themes
     */
    toggle() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        this.updateThemeToggleIcon(newTheme);

        // Persist to chrome.storage
        window.UIManager?.saveCurrentUIState?.();

        console.log('🎨 [THEME] Theme changed to:', newTheme);
    },

    /**
     * Update theme toggle icon based on current theme
     */
    updateThemeToggleIcon(theme) {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        const lightIcon = themeToggle.querySelector('.theme-icon-light');
        const darkIcon = themeToggle.querySelector('.theme-icon-dark');

        if (lightIcon && darkIcon) {
            const isDark = theme === 'dark';
            lightIcon.style.display = isDark ? 'none' : 'block';
            darkIcon.style.display = isDark ? 'block' : 'none';
        }
    },

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    }
};
