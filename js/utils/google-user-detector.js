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
     * Precision selectors prioritized by reliability and context
     * Ordered from most specific to most general
     */
    selectors: [
        // PRIORITY 1: Specific Google Account name containers
        '[aria-label*="Google Account"] .gb_Ab',           // Google bar account name
        '[aria-label*="Konto Google"] .gb_Ab',            // Polish Google bar account name
        '.gb_B [role="button"] span:not(.gb_D)',          // Google bar button text (not services)
        '.gb_b .gb_db',                                   // Classic Google bar username
        
        // PRIORITY 2: Google Account menu patterns with context validation
        '[aria-label*="Google Account"]:not([data-ved]):not([jsname])', // Avoid controls
        '[aria-label*="Konto Google"]:not([data-ved]):not([jsname])',  // Polish version
        '[aria-label*="Account menu"]:not([data-ved])',   // Account menu (not video controls)
        '[aria-label*="Menu konta"]:not([data-ved])',     // Polish account menu
        
        // PRIORITY 3: Navigation and header account areas
        'header .gb_Ab:not(.gb_Cc)',                      // Header account name (not services)
        'nav [role="button"][aria-label*="Account"] span', // Navigation account button text
        '.gb_D .gb_Ca:first-child',                       // Google services first name element
        
        // PRIORITY 4: Profile containers (avoid status elements)
        '.profile-info .user-name',                       // Profile container username
        '.account-info .display-name',                    // Account display name
        '.user-profile .name-text',                       // User profile name
        
        // PRIORITY 5: Breadcrumb and navigation name display
        '.breadcrumb .user-info span',                    // Breadcrumb user info
        '.account-name:not(.status):not(.control)',       // Account name (not status/control)
        
        // PRIORITY 6: Validated aria-label patterns
        '[aria-label*="profile"]:not([aria-label*="camera"]):not([aria-label*="microphone"])',
        '[aria-label*="profil"]:not([aria-label*="kamera"]):not([aria-label*="mikrofon"])',
        
        // PRIORITY 7: Google Bar alternatives with validation
        '.gb_db:not(.gb_Ec):not([jsname])',              // Google bar name (not controls)
        '.gb_Ca:not(.gb_Cc):not([data-ved])',            // Alternative bar name
        
        // PRIORITY 8: Material Design account buttons (validated)
        '.VfPpkd-Bz112c-LgbsSe:not([jsname*="camera"]):not([jsname*="mic"])', // MD button (not camera/mic)
        
        // PRIORITY 9: Safe title/alt patterns  
        '[title*="Google Account"]:not([title*="camera"]):not([title*="microphone"])',
        '[title*="Konto Google"]:not([title*="kamera"]):not([title*="mikrofon"])',
        'img[alt*="Google Account"]:not([alt*="camera"])',
        'img[alt*="Konto Google"]:not([alt*="kamera"])',
        
        // PRIORITY 10: Last resort - highly validated generic patterns
        '[role="button"][aria-label*="Account"]:not([aria-label*="camera"]):not([aria-label*="video"])',
        '.gb_d[aria-label*="Google"]:not([aria-label*="Meet"]):not([data-tooltip*="camera"])'
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
     * Enhanced user name extraction from DOM element with context validation
     */
    extractUserName(element, context) {
        if (!element) return null;
        
        // STEP 1: Validate element context before extraction
        if (!this.validateElementContext(element, context)) {
            return null;
        }
        
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
        
        // Method 4: Extract from data attributes (limited and validated)
        const dataName = element.getAttribute('data-name');
        if (dataName && this.isValidDataAttribute(dataName)) {
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
     * Validate element context to avoid controls/status elements
     */
    validateElementContext(element, context) {
        if (!element) return false;
        
        this.log(`🔍 Validating context for element: ${context}`);
        
        // Check element's own classes for problematic patterns
        const className = element.className || '';
        const classList = className.toLowerCase();
        
        // REJECT: Camera/microphone control classes
        const badClassPatterns = [
            'camera', 'mic', 'microphone', 'video', 'audio', 'mute',
            'control', 'button', 'toggle', 'switch', 'status',
            'device', 'connection', 'stream', 'feed', 'permission',
            'disabled', 'enabled', 'unavailable', 'blocked'
        ];
        
        if (badClassPatterns.some(pattern => classList.includes(pattern))) {
            this.log(`❌ Element has problematic class: ${className}`);
            return false;
        }
        
        // Check parent element context (up to 3 levels)
        let parent = element.parentElement;
        let level = 0;
        
        while (parent && level < 3) {
            const parentClass = (parent.className || '').toLowerCase();
            const parentId = (parent.id || '').toLowerCase();
            
            // REJECT: Parent is clearly a control area
            const badParentPatterns = [
                'camera-control', 'mic-control', 'video-control', 'audio-control',
                'device-controls', 'meeting-controls', 'toolbar', 'control-bar',
                'status-bar', 'status-panel', 'device-status', 'connection-status',
                'permission-dialog', 'settings-panel', 'controls-container'
            ];
            
            if (badParentPatterns.some(pattern => 
                parentClass.includes(pattern) || parentId.includes(pattern)
            )) {
                this.log(`❌ Parent element (level ${level}) is control area: ${parent.className || parent.id}`);
                return false;
            }
            
            // ACCEPT: Parent is account/profile area
            const goodParentPatterns = [
                'account', 'profile', 'user', 'avatar', 'header', 'navigation',
                'gb_', 'google-bar', 'breadcrumb', 'menu'
            ];
            
            if (goodParentPatterns.some(pattern => 
                parentClass.includes(pattern) || parentId.includes(pattern)
            )) {
                this.log(`✅ Parent element (level ${level}) is valid context: ${parent.className || parent.id}`);
                break; // Found good context, stop checking
            }
            
            parent = parent.parentElement;
            level++;
        }
        
        // Check element attributes for additional validation
        const attributes = element.attributes;
        for (let i = 0; i < attributes.length; i++) {
            const attr = attributes[i];
            const attrValue = attr.value.toLowerCase();
            
            // REJECT: Attributes suggesting control functionality
            if (attr.name.includes('data-') && (
                attrValue.includes('camera') || 
                attrValue.includes('mic') || 
                attrValue.includes('video') ||
                attrValue.includes('control') ||
                attrValue.includes('device') ||
                attrValue.includes('status') ||
                attrValue.includes('permission')
            )) {
                this.log(`❌ Element has problematic attribute: ${attr.name}="${attr.value}"`);
                return false;
            }
        }
        
        // Check element position and size (controls are usually small or positioned specifically)
        try {
            const rect = element.getBoundingClientRect();
            
            // REJECT: Very small elements (likely icons)
            if (rect.width < 10 || rect.height < 10) {
                this.log(`❌ Element too small: ${rect.width}x${rect.height}`);
                return false;
            }
            
            // REJECT: Hidden elements
            if (rect.width === 0 || rect.height === 0) {
                this.log(`❌ Element is hidden`);
                return false;
            }
            
        } catch (error) {
            // getBoundingClientRect failed, but don't reject based on this
            this.log(`⚠️ Could not get element bounds: ${error.message}`);
        }
        
        this.log(`✅ Element passed context validation`);
        return true;
    },

    /**
     * Validate data-name attribute to avoid technical values
     */
    isValidDataAttribute(dataValue) {
        if (!dataValue) return false;
        
        const lowerValue = dataValue.toLowerCase();
        
        // REJECT: Technical patterns
        if (lowerValue.includes('_') && lowerValue.length > 8) {
            return false; // Likely technical identifier
        }
        
        // REJECT: Known bad patterns
        const badPatterns = [
            'domain_disabled', 'camera', 'mic', 'video', 'audio',
            'control', 'button', 'status', 'device', 'permission'
        ];
        
        return !badPatterns.some(pattern => lowerValue.includes(pattern));
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
     * Parse text content for user name with comprehensive filtering
     */
    parseTextContent(text) {
        // Filter out obviously non-name content
        if (text.length === 0 || text.length > 100) return null;
        if (text.includes('@')) return null; // Probably email, not display name
        if (/^[0-9\s\-\(\)\[\]]+$/.test(text)) return null; // Numbers/symbols only
        
        this.log(`🔍 Analyzing text content: "${text}"`);
        
        // BLACKLIST: Google Meet controls and statuses
        const blacklistedValues = [
            // Device/connection statuses
            'domain_disabled', 'disabled', 'enabled', 'connected', 'disconnected',
            'on', 'off', 'active', 'inactive', 'available', 'unavailable',
            
            // Camera/Audio controls
            'camera', 'microphone', 'mic', 'video', 'audio', 'muted', 'unmuted',
            'camera_on', 'camera_off', 'mic_on', 'mic_off', 'video_on', 'video_off',
            'kamera', 'mikrofon', 'dźwięk', 'wideo', 'wyciszony', 'niewyciszony',
            
            // Google Meet UI elements
            'share', 'screen', 'chat', 'participants', 'settings', 'more', 'options',
            'udostępnij', 'ekran', 'czat', 'uczestnicy', 'ustawienia', 'więcej',
            'join', 'leave', 'end', 'call', 'meeting', 'room',
            'dołącz', 'opuść', 'zakończ', 'rozmowa', 'spotkanie', 'sala',
            
            // Generic UI labels
            'settings', 'menu', 'account', 'profile', 'konto', 'profil', 'ustawienia',
            'button', 'przycisk', 'link', 'loading', 'ładowanie', 'error', 'błąd',
            
            // Status indicators
            'online', 'offline', 'busy', 'away', 'do_not_disturb', 'invisible',
            'dostępny', 'niedostępny', 'zajęty', 'zaraz_wracam', 'nie_przeszkadzać',
            
            // Google services
            'google', 'gmail', 'drive', 'docs', 'sheets', 'slides', 'calendar',
            'photos', 'maps', 'youtube', 'search', 'chrome', 'android',
            
            // Common false positives
            'user', 'admin', 'guest', 'host', 'owner', 'moderator',
            'użytkownik', 'administrator', 'gość', 'gospodarz', 'właściciel', 'moderator',
            'default', 'domyślny', 'unknown', 'nieznany', 'anonymous', 'anonimowy'
        ];
        
        // Check if text exactly matches blacklisted values (case insensitive)
        const lowerText = text.toLowerCase().trim();
        if (blacklistedValues.some(blacklisted => lowerText === blacklisted.toLowerCase())) {
            this.log(`❌ Text "${text}" is blacklisted`);
            return null;
        }
        
        // Check if text contains blacklisted patterns (for compound values)
        const blacklistPatterns = [
            /^(camera|mic|video|audio)_/i,           // camera_enabled, mic_disabled
            /_(on|off|enabled|disabled)$/i,          // device_on, status_off
            /^(domain|connection|device)_/i,         // domain_disabled, connection_lost
            /(status|state|mode)$/i,                 // camera_status, mic_state
            /^(btn|button|icon)_/i,                  // btn_camera, button_mic
            /^google_(meet|hangouts|duo)/i,          // google_meet_camera
            /\b(true|false|null|undefined)\b/i       // boolean/null values
        ];
        
        if (blacklistPatterns.some(pattern => pattern.test(text))) {
            this.log(`❌ Text "${text}" matches blacklist pattern`);
            return null;
        }
        
        // Enhanced UI label detection
        if (/^(settings|menu|account|profile|konto|profil|ustawienia|opcje|narzędzia)$/i.test(text)) {
            this.log(`❌ Text "${text}" is UI label`);
            return null;
        }
        
        // Filter out technical identifiers
        if (/^[a-z0-9_\-]{3,}$/i.test(text) && !(/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(text))) {
            // Looks like technical ID (lowercase_with_underscores) unless it's proper Name Format
            this.log(`❌ Text "${text}" looks like technical identifier`);
            return null;
        }
        
        // Check if it looks like a name
        if (text.length >= 2 && text.length <= 50) {
            this.log(`✅ Text "${text}" passed filters, attempting to clean`);
            return this.cleanUserName(text);
        }
        
        this.log(`❌ Text "${text}" failed length validation`);
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
        this.log(`🧹 Cleaning name: "${name}"`);
        
        // Remove common prefixes/suffixes
        name = name.replace(/^(Google Account|Konto Google|Account|Profile|Profil):\s*/i, '');
        name = name.replace(/\s*(Account|Konto|Profile|Profil)$/i, '');
        this.log(`🧹 After prefix/suffix removal: "${name}"`);
        
        // Enhanced email removal - handle nested parentheses and various formats
        const originalName = name;
        
        // Pattern 1: Remove email in parentheses (including nested)
        // "Łukasz Szlachtowski (szlachtowski.lukasz@gmail.com)" → "Łukasz Szlachtowski"
        name = name.replace(/\s*\([^()]*@[^()]*\)\s*$/, '');
        
        // Pattern 2: Remove email in nested parentheses 
        // "Name (info (email@domain.com))" → "Name"
        name = name.replace(/\s*\([^()]*\([^()]*@[^()]*\)[^()]*\)\s*$/, '');
        
        // Pattern 3: Remove email in angle brackets
        // "Name <email@domain.com>" → "Name"
        name = name.replace(/\s*<[^>]*@[^>]*>\s*$/, '');
        
        // Pattern 4: Remove standalone email addresses
        // "Name email@domain.com" → "Name"
        name = name.replace(/\s+[^\s]+@[^\s]+\s*$/, '');
        
        // Pattern 5: More aggressive parentheses cleaning if email detected
        if (originalName.includes('@') && name === originalName) {
            // If nothing was removed but email is present, try broader patterns
            name = name.replace(/\s*\([^)]*\)\s*$/, ''); // Remove last parentheses group
        }
        
        // Clean up extra spaces
        name = name.replace(/\s+/g, ' ').trim();
        
        this.log(`🧹 After email removal: "${name}"`);
        
        // Additional cleaning patterns
        // Remove trailing punctuation
        name = name.replace(/[,;:\-\.\s]+$/, '');
        
        // Remove leading punctuation
        name = name.replace(/^[,;:\-\.\s]+/, '');
        
        // Final trim
        name = name.trim();
        
        this.log(`🧹 Final cleaned name: "${name}"`);
        
        // Final validation
        if (name.length >= 2 && name.length <= 50 && !name.includes('@')) {
            return name;
        }
        
        this.log(`❌ Name validation failed: length=${name.length}, hasEmail=${name.includes('@')}`);
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
            // Send the cleaned name to background/popup
            chrome.runtime.sendMessage({
                action: 'updateGoogleUserName',
                userName: userName, // userName is already cleaned by cleanUserName()
                source: 'GoogleUserDetector'
            });
            this.log(`📤 Sent cleaned user name to background: "${userName}"`);
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