/**
 * Theme Manager - Handles light/dark theme switching functionality
 */

window.ThemeManager = {
    /**
     * Initialize theme system
     */
    initialize() {
        this.loadSavedTheme();
        this.setupEventListeners();
        console.log('🎨 [THEME] ThemeManager initialized');
    },

    /**
     * Load saved theme or default to light
     */
    loadSavedTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeToggleIcon(savedTheme);
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
        localStorage.setItem('theme', newTheme);
        this.updateThemeToggleIcon(newTheme);

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
