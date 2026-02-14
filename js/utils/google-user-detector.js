/**
 * Google User Detector - Enhanced detection of Google account name
 * Handles various Google Meet UI versions and provides retry mechanisms
 */

window.GoogleUserDetector = {
    config: {
        maxRetries: 10,
        retryInterval: 3000,
        debugMode: true
    },

    state: {
        detectionAttempts: 0,
        lastDetectedName: null,
        isDetecting: false,
        retryTimer: null
    },

    fallbackSelectors: [
        '[aria-label*="Google Account"] .gb_Ab',
        '[aria-label*="Konto Google"] .gb_Ab',
        '.gb_B [role="button"] span:not(.gb_D)',
        '.gb_b .gb_db'
    ],

    // Strings that indicate a technical identifier rather than a human name
    _googleServiceTerms: [
        'gmail', 'drive', 'docs', 'sheets', 'slides', 'youtube', 'maps', 'photos',
        'apis.google.com', 'client.js', 'googleapis.com', 'gstatic.com',
        'googleusercontent.com', 'accounts.google.com'
    ],

    _commonUITerms: [
        'settings', 'account', 'profile', 'user', 'default', 'unknown',
        'anonymous', 'guest', 'zamknij', 'close', 'menu'
    ],

    /**
     * Shared name validation used by both script-tag and DOM detection paths
     * @param {string} candidate - Text to validate
     * @returns {boolean} True if the candidate looks like a valid user name
     */
    _isValidName(candidate) {
        if (!candidate || typeof candidate !== 'string') return false;

        const name = candidate.trim();
        if (name.length < 2 || name.length > 50) return false;
        if (!/[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(name)) return false;
        if (name.includes('@') || name.startsWith('http') || name.includes('://')) return false;

        const lowerName = name.toLowerCase();
        if (this._googleServiceTerms.some(term => lowerName.includes(term))) return false;
        if (this._commonUITerms.some(term => lowerName === term)) return false;

        return true;
    },

    /**
     * Check if a string looks like a human name (proper capitalization pattern)
     */
    _looksLikeName(str) {
        return /^[A-ZĄŻĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(\s+[A-ZĄŻĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)*$/.test(str);
    },

    /**
     * Extended validation for script-tag candidates (includes technical identifier check)
     */
    _isValidScriptName(candidate) {
        if (!this._isValidName(candidate)) return false;

        const name = candidate.trim();
        if (/^[a-z0-9_\-\.]+$/i.test(name) && !this._looksLikeName(name)) return false;

        return true;
    },

    /**
     * Detect user name from Google's AF_initDataCallback script tags
     */
    detectFromScriptTags() {
        this.log('Starting script tag detection for AF_initDataCallback...');

        try {
            // PRIORITY 1: ds: class scripts (most likely to contain user data)
            const dsScriptTags = document.querySelectorAll('script[class*="ds:"]');

            if (dsScriptTags.length > 0) {
                const sortedDsScripts = Array.from(dsScriptTags).sort((a, b) => {
                    return this._extractDsNumber(b.className) - this._extractDsNumber(a.className);
                });

                for (const script of sortedDsScripts) {
                    const content = script.textContent || script.innerHTML;
                    if (content && content.includes('AF_initDataCallback')) {
                        const userName = this._parseAFInitDataCallback(content);
                        if (userName) return userName;
                    }
                }
            }

            // PRIORITY 2: All other script tags
            const allScriptTags = document.querySelectorAll('script');

            for (const script of allScriptTags) {
                if (script.className && script.className.includes('ds:')) continue;

                const content = script.textContent || script.innerHTML;
                if (content && content.includes('AF_initDataCallback')) {
                    const userName = this._parseAFInitDataCallback(content);
                    if (userName) return userName;
                }
            }

            return null;
        } catch (error) {
            this.log(`Error during script tag detection: ${error.message}`);
            return null;
        }
    },

    /**
     * Extract ds: number from class name for sorting
     */
    _extractDsNumber(className) {
        const match = className.match(/ds:(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    },

    /**
     * Parse AF_initDataCallback content to extract user name
     */
    _parseAFInitDataCallback(scriptContent) {
        try {
            const callbackPattern = /AF_initDataCallback\(\{[^}]*data:\s*(\[)/;
            const callbackMatch = scriptContent.match(callbackPattern);
            if (!callbackMatch) return null;

            const arrayStartIndex = callbackMatch.index + callbackMatch[0].length - 1;
            const dataArrayStr = this._extractCompleteJsonArray(scriptContent, arrayStartIndex);
            if (!dataArrayStr) return null;

            let dataArray;
            try {
                dataArray = JSON.parse(dataArrayStr);
            } catch (parseError) {
                return this._extractNameDirectlyFromScript(scriptContent);
            }

            // Try common indices first, then scan the full array
            const priorityIndices = [6, 5, 7, 4];

            for (const index of priorityIndices) {
                if (index < dataArray.length && typeof dataArray[index] === 'string' && this._isValidScriptName(dataArray[index])) {
                    return this.cleanUserName(dataArray[index]);
                }
            }

            for (let i = 0; i < dataArray.length; i++) {
                if (typeof dataArray[i] === 'string' && this._isValidScriptName(dataArray[i])) {
                    return this.cleanUserName(dataArray[i]);
                }
            }

            return null;
        } catch (error) {
            this.log(`Error parsing AF_initDataCallback: ${error.message}`);
            return null;
        }
    },

    /**
     * Extract complete JSON array using bracket counting
     */
    _extractCompleteJsonArray(scriptContent, startIndex) {
        let bracketCount = 0;
        let inString = false;
        let escapeNext = false;

        for (let i = startIndex; i < scriptContent.length; i++) {
            const char = scriptContent[i];

            if (escapeNext) {
                escapeNext = false;
            } else if (char === '\\' && inString) {
                escapeNext = true;
            } else if (char === '"') {
                inString = !inString;
            } else if (!inString) {
                if (char === '[') {
                    bracketCount++;
                } else if (char === ']') {
                    bracketCount--;
                    if (bracketCount === 0) {
                        return scriptContent.substring(startIndex, i + 1);
                    }
                }
            }
        }

        return null;
    },

    /**
     * Fallback: extract name directly from script content using regex patterns
     */
    _extractNameDirectlyFromScript(scriptContent) {
        try {
            // Pattern 1: email followed by name in quotes
            const emailNamePattern = /"([^"]+@[^"]+)","[^"]*","([^"]{2,50})"/g;
            let match;

            while ((match = emailNamePattern.exec(scriptContent)) !== null) {
                if (this._isValidScriptName(match[2])) {
                    return this.cleanUserName(match[2]);
                }
            }

            // Pattern 2: Properly capitalized multi-word names (including Polish characters)
            const namePattern = /"([A-ZĄŻĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\s+[A-ZĄŻĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)"/g;

            while ((match = namePattern.exec(scriptContent)) !== null) {
                if (this._isValidScriptName(match[1])) {
                    return this.cleanUserName(match[1]);
                }
            }

            // Pattern 3: Capitalized strings near email patterns
            if (scriptContent.includes('@')) {
                const nearEmailPattern = /"([A-ZĄŻĆĘŁŃÓŚŹŻ][^"]{1,49})"/g;

                while ((match = nearEmailPattern.exec(scriptContent)) !== null) {
                    if (this._isValidScriptName(match[1]) && this._looksLikeName(match[1])) {
                        return this.cleanUserName(match[1]);
                    }
                }
            }

            return null;
        } catch (error) {
            this.log(`Error in direct extraction: ${error.message}`);
            return null;
        }
    },

    /**
     * Main detection function with script-tag primary and DOM fallback
     */
    detect() {
        this.log('Starting Google user name detection...');

        const scriptName = this.detectFromScriptTags();
        if (scriptName) {
            this.state.lastDetectedName = scriptName;
            this.state.detectionAttempts++;
            this.notifyUserNameDetected(scriptName);
            return scriptName;
        }

        this.log('Script tag failed, trying DOM fallback...');
        const domName = this.detectFromDOM();
        if (domName) {
            this.state.lastDetectedName = domName;
            this.state.detectionAttempts++;
            this.notifyUserNameDetected(domName);
            return domName;
        }

        this.log('All detection methods failed');
        this.state.detectionAttempts++;
        return null;
    },

    /**
     * Simple DOM detection fallback
     */
    detectFromDOM() {
        for (const selector of this.fallbackSelectors) {
            try {
                const elements = document.querySelectorAll(selector);

                for (const element of elements) {
                    const text = element.textContent?.trim();
                    if (text && this._isValidName(text)) {
                        const cleaned = this.cleanUserName(text);
                        if (cleaned) return cleaned;
                    }
                }
            } catch (error) {
                this.log(`Error with selector "${selector}": ${error.message}`);
            }
        }

        return null;
    },

    /**
     * Clean and normalize a detected user name
     * @param {string} name - Raw detected name
     * @returns {string|null} Cleaned name or null if invalid
     */
    cleanUserName(name) {
        if (!name) return null;

        name = name.trim();
        name = name.replace(/^(Google Account|Konto Google|Account|Profile|Profil):\s*/i, '');
        name = name.replace(/\s*\([^()]*@[^()]*\)\s*$/, '');
        name = name.replace(/\s+/g, ' ').trim();

        if (name.length >= 2 && name.length <= 50 && !name.includes('@')) {
            return name;
        }

        return null;
    },

    /**
     * Start continuous detection with retry mechanism
     */
    startContinuousDetection() {
        if (this.state.isDetecting) return;

        this.log('Starting continuous detection...');
        this.state.isDetecting = true;
        this.state.detectionAttempts = 0;

        const userName = this.detect();
        if (userName) {
            this.state.isDetecting = false;
            return userName;
        }

        this.state.retryTimer = setInterval(() => {
            if (this.state.detectionAttempts >= this.config.maxRetries) {
                this.log(`Stopping detection after ${this.config.maxRetries} attempts`);
                this.stopContinuousDetection();
                return;
            }

            this.log(`Retry attempt ${this.state.detectionAttempts + 1}/${this.config.maxRetries}`);
            const detectedName = this.detect();

            if (detectedName) {
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
    },

    /**
     * Manual detection trigger (for settings UI)
     */
    manualDetect() {
        this.state.detectionAttempts = 0;
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
        } catch (error) {
            this.log(`Failed to send user name: ${error.message}`);
        }
    },

    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            config: this.config,
            state: this.state,
            fallbackSelectorsCount: this.fallbackSelectors.length,
            pageUrl: window.location.href,
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Debug logging
     */
    log(message) {
        if (this.config.debugMode) {
            console.log(`[GOOGLE_DETECTOR] ${message}`);
        }
    },

    /**
     * Initialize the detector
     */
    initialize() {
        this.log('GoogleUserDetector initialized');

        if (document.readyState === 'complete') {
            setTimeout(() => this.startContinuousDetection(), 1000);
        } else {
            window.addEventListener('load', () => {
                setTimeout(() => this.startContinuousDetection(), 1000);
            });
        }
    }
};

// Auto-initialize when script loads on Google Meet pages
if (window.location.href.includes('meet.google.com')) {
    window.GoogleUserDetector.initialize();
}
