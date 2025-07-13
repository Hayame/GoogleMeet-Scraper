/**
 * Google User Detector - Enhanced detection of Google account name
 * Handles various Google Meet UI versions and provides retry mechanisms
 */

window.GoogleUserDetector = {
    // Configuration
    config: {
        maxRetries: 10,
        retryInterval: 3000, // 3 seconds
        debugMode: true
    },

    // Detection state
    state: {
        detectionAttempts: 0,
        lastDetectedName: null,
        isDetecting: false,
        retryTimer: null
    },

    /**
     * Enhanced selectors for different Google Meet UI versions (2024/2025)
     */
    selectors: [
        // Google Account buttons and menus
        '[aria-label*="Google Account"]',
        '[aria-label*="Konto Google"]',
        '[aria-label*="Account menu"]',
        '[aria-label*="Menu konta"]',
        
        // Google Bar (top navigation)
        '.gb_db',           // Classic Google bar username
        '.gb_Ab',           // Alternative Google bar
        '.gb_Ca',           // Google bar profile name
        
        // Material Design buttons
        '.VfPpkd-Bz112c-LgbsSe',  // Material button with account
        '.VfPpkd-LgbsSe',         // Alternative material button
        
        // Profile/Avatar areas
        '[data-name]',                    // Elements with data-name attribute
        '[aria-label*="profile"]',        // Profile related elements
        '[aria-label*="profil"]',         // Polish profile elements
        
        // Google Meet specific selectors (2024/2025)
        '.uArJ5e.Y5sE8d',                // Meet user area
        '[jsname="r4nke"]',              // Meet profile section
        '[data-tooltip*="Google"]',       // Tooltip with Google info
        
        // Header and navigation areas
        'header [aria-label*="Account"]', // Header account area
        'nav [aria-label*="Account"]',    // Navigation account area
        '.gb_D .gb_Da',                  // Google services area
        
        // Alternative detection points
        '[role="button"][aria-label*="Account"]',
        '.gb_d[aria-label*="Google"]',
        '[data-ogsr-up]',                // Google profile data
        
        // Fallback selectors
        'img[alt*="Google Account"]',
        'img[alt*="Konto Google"]',
        '[title*="Google Account"]',
        '[title*="Konto Google"]'
    ],

    /**
     * Main detection function with enhanced logic
     */
    detect() {
        this.log('🔍 Starting Google user name detection...');
        
        for (let i = 0; i < this.selectors.length; i++) {
            const selector = this.selectors[i];
            const elements = document.querySelectorAll(selector);
            
            this.log(`🔍 Trying selector ${i + 1}/${this.selectors.length}: "${selector}" - found ${elements.length} elements`);
            
            for (let j = 0; j < elements.length; j++) {
                const element = elements[j];
                const userName = this.extractUserName(element, `${selector}[${j}]`);
                
                if (userName) {
                    this.log(`✅ Google user name detected: "${userName}" from ${selector}[${j}]`);
                    this.state.lastDetectedName = userName;
                    this.state.detectionAttempts++;
                    
                    // Send to background/popup
                    this.notifyUserNameDetected(userName);
                    return userName;
                }
            }
        }
        
        this.log('❌ No Google user name found in this attempt');
        this.state.detectionAttempts++;
        return null;
    },

    /**
     * Enhanced user name extraction from DOM element
     */
    extractUserName(element, context) {
        if (!element) return null;
        
        let userName = null;
        
        // Method 1: Extract from aria-label
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) {
            userName = this.parseAriaLabel(ariaLabel);
            if (userName) {
                this.log(`📝 Extracted from aria-label: "${userName}" (${context})`);
                return userName;
            }
        }
        
        // Method 2: Extract from title attribute
        const title = element.getAttribute('title');
        if (title) {
            userName = this.parseTitleAttribute(title);
            if (userName) {
                this.log(`📝 Extracted from title: "${userName}" (${context})`);
                return userName;
            }
        }
        
        // Method 3: Extract from text content
        const textContent = element.textContent?.trim();
        if (textContent) {
            userName = this.parseTextContent(textContent);
            if (userName) {
                this.log(`📝 Extracted from text: "${userName}" (${context})`);
                return userName;
            }
        }
        
        // Method 4: Extract from data attributes
        const dataName = element.getAttribute('data-name');
        if (dataName) {
            userName = this.parseDataAttribute(dataName);
            if (userName) {
                this.log(`📝 Extracted from data-name: "${userName}" (${context})`);
                return userName;
            }
        }
        
        // Method 5: Extract from nested elements
        const nestedUserName = this.extractFromNestedElements(element);
        if (nestedUserName) {
            this.log(`📝 Extracted from nested elements: "${nestedUserName}" (${context})`);
            return nestedUserName;
        }
        
        return null;
    },

    /**
     * Parse aria-label for user name
     */
    parseAriaLabel(ariaLabel) {
        const patterns = [
            /Google Account:\s*(.+)/i,
            /Konto Google:\s*(.+)/i,
            /Account menu for\s*(.+)/i,
            /Menu konta dla\s*(.+)/i,
            /Profile for\s*(.+)/i,
            /Profil dla\s*(.+)/i
        ];
        
        for (const pattern of patterns) {
            const match = ariaLabel.match(pattern);
            if (match && match[1]) {
                return this.cleanUserName(match[1]);
            }
        }
        
        return null;
    },

    /**
     * Parse title attribute for user name
     */
    parseTitleAttribute(title) {
        // Similar patterns as aria-label
        return this.parseAriaLabel(title);
    },

    /**
     * Parse text content for user name
     */
    parseTextContent(text) {
        // Filter out obviously non-name content
        if (text.length === 0 || text.length > 100) return null;
        if (text.includes('@')) return null; // Probably email, not display name
        if (/^[0-9\s\-\(\)\[\]]+$/.test(text)) return null; // Numbers/symbols only
        if (/^(settings|menu|account|profile|konto|profil|ustawienia)$/i.test(text)) return null; // UI labels
        
        // Check if it looks like a name
        if (text.length >= 2 && text.length <= 50) {
            return this.cleanUserName(text);
        }
        
        return null;
    },

    /**
     * Parse data attributes for user name
     */
    parseDataAttribute(dataValue) {
        if (dataValue && dataValue.length >= 2 && dataValue.length <= 50 && !dataValue.includes('@')) {
            return this.cleanUserName(dataValue);
        }
        return null;
    },

    /**
     * Extract user name from nested elements
     */
    extractFromNestedElements(element) {
        // Look for text in child elements
        const textElements = element.querySelectorAll('span, div, p');
        
        for (const textEl of textElements) {
            const text = textEl.textContent?.trim();
            if (text) {
                const userName = this.parseTextContent(text);
                if (userName) return userName;
            }
        }
        
        return null;
    },

    /**
     * Clean and validate user name
     */
    cleanUserName(name) {
        if (!name) return null;
        
        // Remove extra whitespace
        name = name.trim();
        
        // Remove common prefixes/suffixes
        name = name.replace(/^(Google Account|Konto Google|Account|Profile|Profil):\s*/i, '');
        name = name.replace(/\s*(Account|Konto|Profile|Profil)$/i, '');
        
        // Remove email parts if present
        name = name.replace(/\s*\([^)]*@[^)]*\)/, '');
        name = name.replace(/\s*<[^>]*@[^>]*>/, '');
        
        // Final validation
        if (name.length >= 2 && name.length <= 50 && !name.includes('@')) {
            return name;
        }
        
        return null;
    },

    /**
     * Start continuous detection with retry mechanism
     */
    startContinuousDetection() {
        if (this.state.isDetecting) {
            this.log('🔄 Detection already running, skipping...');
            return;
        }
        
        this.log('🚀 Starting continuous Google user name detection...');
        this.state.isDetecting = true;
        this.state.detectionAttempts = 0;
        
        // Try immediate detection
        const userName = this.detect();
        if (userName) {
            this.log('✅ Immediate detection successful!');
            this.state.isDetecting = false;
            return userName;
        }
        
        // Start retry mechanism
        this.state.retryTimer = setInterval(() => {
            if (this.state.detectionAttempts >= this.config.maxRetries) {
                this.log(`⏹️ Stopping detection after ${this.config.maxRetries} attempts`);
                this.stopContinuousDetection();
                return;
            }
            
            this.log(`🔄 Retry attempt ${this.state.detectionAttempts + 1}/${this.config.maxRetries}`);
            const detectedName = this.detect();
            
            if (detectedName) {
                this.log('✅ Retry detection successful!');
                this.stopContinuousDetection();
            }
        }, this.config.retryInterval);
        
        return null;
    },

    /**
     * Stop continuous detection
     */
    stopContinuousDetection() {
        if (this.state.retryTimer) {
            clearInterval(this.state.retryTimer);
            this.state.retryTimer = null;
        }
        this.state.isDetecting = false;
        this.log('⏹️ Continuous detection stopped');
    },

    /**
     * Manual detection trigger (for settings UI)
     */
    manualDetect() {
        this.log('👤 Manual detection triggered');
        this.state.detectionAttempts = 0; // Reset counter for manual detection
        return this.detect();
    },

    /**
     * Notify other scripts about detected user name
     */
    notifyUserNameDetected(userName) {
        try {
            chrome.runtime.sendMessage({
                action: 'updateGoogleUserName',
                userName: userName,
                source: 'GoogleUserDetector'
            });
            this.log(`📤 Sent user name to background: "${userName}"`);
        } catch (error) {
            this.log(`❌ Failed to send user name: ${error.message}`);
        }
    },

    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            config: this.config,
            state: this.state,
            selectorsCount: this.selectors.length,
            pageUrl: window.location.href,
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Debug logging
     */
    log(message) {
        if (this.config.debugMode) {
            console.log(`👤 [GOOGLE_DETECTOR] ${message}`);
        }
    },

    /**
     * Initialize the detector
     */
    initialize() {
        this.log('🚀 GoogleUserDetector initialized');
        
        // Start detection after page is fully loaded
        if (document.readyState === 'complete') {
            setTimeout(() => this.startContinuousDetection(), 1000);
        } else {
            window.addEventListener('load', () => {
                setTimeout(() => this.startContinuousDetection(), 1000);
            });
        }
    }
};

// Auto-initialize when script loads
if (window.location.href.includes('meet.google.com')) {
    window.GoogleUserDetector.initialize();
}