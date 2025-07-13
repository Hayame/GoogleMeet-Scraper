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

    // Essential Google Account selectors for fallback detection
    fallbackSelectors: [
        '[aria-label*="Google Account"] .gb_Ab',
        '[aria-label*="Konto Google"] .gb_Ab',
        '.gb_B [role="button"] span:not(.gb_D)',
        '.gb_b .gb_db'
    ],

    /**
     * Detect user name from Google's AF_initDataCallback script tags
     * This is the most reliable method as it extracts data directly from Google's internal data
     */
    detectFromScriptTags() {
        this.log('📜 [SCRIPT] Starting script tag detection for AF_initDataCallback...');
        
        try {
            // PRIORITY 1: Find script tags with ds: classes (most likely to contain user data)
            const dsScriptTags = document.querySelectorAll('script[class*="ds:"]');
            this.log(`📜 [SCRIPT] Found ${dsScriptTags.length} script tags with ds: classes`);
            
            if (dsScriptTags.length > 0) {
                // Sort ds scripts by number (higher numbers first, as they're more likely to contain user data)
                const sortedDsScripts = Array.from(dsScriptTags).sort((a, b) => {
                    const aNum = this.extractDsNumber(a.className);
                    const bNum = this.extractDsNumber(b.className);
                    return bNum - aNum; // Higher numbers first
                });
                
                this.log(`📜 [SCRIPT] Processing ${sortedDsScripts.length} ds: scripts in priority order...`);
                
                for (let i = 0; i < sortedDsScripts.length; i++) {
                    const script = sortedDsScripts[i];
                    const dsClass = script.className;
                    const content = script.textContent || script.innerHTML;
                    
                    this.log(`📜 [SCRIPT] Processing ds: script ${i + 1}/${sortedDsScripts.length} with class "${dsClass}"`);
                    
                    // Look for AF_initDataCallback pattern
                    if (content && content.includes('AF_initDataCallback')) {
                        this.log(`📜 [SCRIPT] ✅ Found AF_initDataCallback in ds: script with class "${dsClass}"`);
                        
                        // Try to extract user name from this script
                        const userName = this.parseAFInitDataCallback(content, i, `ds:${dsClass}`);
                        if (userName) {
                            this.log(`✅ [SCRIPT] Successfully extracted user name from ds: script: "${userName}"`);
                            return userName;
                        }
                    } else {
                        this.log(`📜 [SCRIPT] No AF_initDataCallback in ds: script with class "${dsClass}"`);
                    }
                }
            }
            
            // PRIORITY 2: Fallback to all script tags if ds: scripts didn't work
            this.log('📜 [SCRIPT] ds: scripts search complete, falling back to all script tags...');
            const allScriptTags = document.querySelectorAll('script');
            this.log(`📜 [SCRIPT] Found ${allScriptTags.length} total script tags to analyze`);
            
            for (let i = 0; i < allScriptTags.length; i++) {
                const script = allScriptTags[i];
                const content = script.textContent || script.innerHTML;
                
                // Skip if this was already processed as a ds: script
                if (script.className && script.className.includes('ds:')) {
                    continue;
                }
                
                // Look for AF_initDataCallback pattern
                if (content && content.includes('AF_initDataCallback')) {
                    this.log(`📜 [SCRIPT] Found AF_initDataCallback in regular script ${i + 1}`);
                    
                    // Try to extract user name from this script
                    const userName = this.parseAFInitDataCallback(content, i, 'regular');
                    if (userName) {
                        this.log(`✅ [SCRIPT] Successfully extracted user name from regular script: "${userName}"`);
                        return userName;
                    }
                }
            }
            
            this.log('📜 [SCRIPT] No valid user name found in any AF_initDataCallback scripts');
            return null;
            
        } catch (error) {
            this.log(`❌ [SCRIPT] Error during script tag detection: ${error.message}`);
            return null;
        }
    },
    
    /**
     * Extract ds: number from class name for sorting
     */
    extractDsNumber(className) {
        const match = className.match(/ds:(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    },
    
    /**
     * Parse AF_initDataCallback content to extract user name
     */
    parseAFInitDataCallback(scriptContent, scriptIndex) {
        this.log(`📜 [SCRIPT] Parsing AF_initDataCallback from script ${scriptIndex + 1}`);
        
        try {
            // Look for AF_initDataCallback pattern
            const callbackPattern = /AF_initDataCallback\(\{[^}]*data:\s*(\[)/;
            const callbackMatch = scriptContent.match(callbackPattern);
            if (!callbackMatch) {
                this.log(`📜 [SCRIPT] No AF_initDataCallback with data array found in script ${scriptIndex + 1}`);
                return null;
            }
            
            // Find the start position of the JSON array
            const arrayStartIndex = callbackMatch.index + callbackMatch[0].length - 1; // -1 to include the opening bracket
            
            // Extract complete JSON array using bracket counting
            const dataArrayStr = this.extractCompleteJsonArray(scriptContent, arrayStartIndex);
            if (!dataArrayStr) {
                this.log(`📜 [SCRIPT] Could not extract complete JSON array from script ${scriptIndex + 1}`);
                return null;
            }
            
            this.log(`📜 [SCRIPT] Found data array: ${dataArrayStr.substring(0, 200)}...`);
            
            // Try to parse the JSON array
            let dataArray;
            try {
                // Parse the JSON array directly
                dataArray = JSON.parse(dataArrayStr);
                this.log(`📜 [SCRIPT] Successfully parsed JSON array with ${dataArray.length} elements`);
                
                // Log first few elements for debugging
                for (let i = 0; i < Math.min(10, dataArray.length); i++) {
                    this.log(`📜 [SCRIPT] data[${i}]: "${dataArray[i]}" (${typeof dataArray[i]})`);
                }
            } catch (parseError) {
                this.log(`📜 [SCRIPT] JSON parse error: ${parseError.message}`);
                this.log(`📜 [SCRIPT] Problematic data string: ${dataArrayStr.substring(0, 300)}...`);
                
                // Fallback: try to extract name directly with regex
                return this.extractNameDirectlyFromScript(scriptContent);
            }
            
            // Look for user name - typically at index 6, but let's be flexible
            const potentialNameIndices = [6, 5, 7, 4]; // Try multiple positions
            
            for (const index of potentialNameIndices) {
                if (index < dataArray.length && dataArray[index]) {
                    const candidate = dataArray[index];
                    this.log(`📜 [SCRIPT] Checking index ${index}: "${candidate}" (type: ${typeof candidate})`);
                    
                    // Validate that this looks like a user name
                    if (typeof candidate === 'string' && this.isValidUserNameFromScript(candidate)) {
                        this.log(`📜 [SCRIPT] Valid user name found at index ${index}: "${candidate}"`);
                        return this.cleanUserName(candidate);
                    }
                }
            }
            
            // If fixed indices don't work, scan the entire array for name-like strings
            this.log(`📜 [SCRIPT] Fixed indices failed, scanning entire array...`);
            for (let i = 0; i < dataArray.length; i++) {
                const candidate = dataArray[i];
                if (typeof candidate === 'string' && this.isValidUserNameFromScript(candidate)) {
                    this.log(`📜 [SCRIPT] Valid user name found at index ${i}: "${candidate}"`);
                    return this.cleanUserName(candidate);
                }
            }
            
            this.log(`📜 [SCRIPT] No valid user name found in data array`);
            return null;
            
        } catch (error) {
            this.log(`❌ [SCRIPT] Error parsing AF_initDataCallback: ${error.message}`);
            return null;
        }
    },
    
    /**
     * Extract complete JSON array using bracket counting
     */
    extractCompleteJsonArray(scriptContent, startIndex) {
        this.log(`📜 [SCRIPT] Extracting JSON array starting at index ${startIndex}`);
        
        let bracketCount = 0;
        let inString = false;
        let escapeNext = false;
        let i = startIndex;
        
        // Find the complete JSON array by counting brackets
        while (i < scriptContent.length) {
            const char = scriptContent[i];
            
            if (escapeNext) {
                escapeNext = false;
            } else if (char === '\\' && inString) {
                escapeNext = true;
            } else if (char === '"' && !escapeNext) {
                inString = !inString;
            } else if (!inString) {
                if (char === '[') {
                    bracketCount++;
                } else if (char === ']') {
                    bracketCount--;
                    if (bracketCount === 0) {
                        // Found the matching closing bracket
                        const jsonStr = scriptContent.substring(startIndex, i + 1);
                        this.log(`📜 [SCRIPT] Extracted complete JSON array (length: ${jsonStr.length})`);
                        return jsonStr;
                    }
                }
            }
            i++;
        }
        
        this.log(`📜 [SCRIPT] Could not find matching closing bracket`);
        return null;
    },
    
    /**
     * Fallback method to extract name directly from script content using regex
     */
    extractNameDirectlyFromScript(scriptContent) {
        this.log(`📜 [SCRIPT] Attempting direct name extraction fallback`);
        
        try {
            // Look for patterns that might contain the user name
            // Pattern 1: Look for email followed by name in quotes
            const emailNamePattern = /"([^"]+@[^"]+)","[^"]*","([^"]{2,50})"/g;
            let match;
            
            while ((match = emailNamePattern.exec(scriptContent)) !== null) {
                const email = match[1];
                const name = match[2];
                
                this.log(`📜 [SCRIPT] Found email-name pair: "${email}" -> "${name}"`);
                
                if (this.isValidUserNameFromScript(name)) {
                    this.log(`📜 [SCRIPT] Direct extraction successful: "${name}"`);
                    return this.cleanUserName(name);
                }
            }
            
            // Pattern 2: Look for Google account names in quotes (Polish names with special chars)
            const namePattern = /"([A-ZĄŻĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\s+[A-ZĄŻĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)"/g;
            
            while ((match = namePattern.exec(scriptContent)) !== null) {
                const name = match[1];
                
                this.log(`📜 [SCRIPT] Found potential name: "${name}"`);
                
                if (this.isValidUserNameFromScript(name)) {
                    this.log(`📜 [SCRIPT] Direct extraction successful: "${name}"`);
                    return this.cleanUserName(name);
                }
            }
            
            // Pattern 3: Look for any quoted strings that look like names near email patterns
            if (scriptContent.includes('@gmail.com') || scriptContent.includes('@')) {
                const nearEmailPattern = /"([A-ZĄŻĆĘŁŃÓŚŹŻ][^"]{1,49})"/g;
                
                while ((match = nearEmailPattern.exec(scriptContent)) !== null) {
                    const candidate = match[1];
                    
                    if (this.isValidUserNameFromScript(candidate) && this.looksLikeName(candidate)) {
                        this.log(`📜 [SCRIPT] Found name near email: "${candidate}"`);
                        return this.cleanUserName(candidate);
                    }
                }
            }
            
            this.log(`📜 [SCRIPT] Direct extraction failed - no valid names found`);
            return null;
            
        } catch (error) {
            this.log(`❌ [SCRIPT] Error in direct extraction: ${error.message}`);
            return null;
        }
    },
    
    /**
     * Validate if a string from script data looks like a user name
     */
    isValidUserNameFromScript(candidate) {
        if (!candidate || typeof candidate !== 'string') {
            return false;
        }
        
        const name = candidate.trim();
        
        // Basic length validation
        if (name.length < 2 || name.length > 50) {
            this.log(`📜 [SCRIPT] Rejected "${name}" - invalid length: ${name.length}`);
            return false;
        }
        
        // Must contain at least one letter
        if (!/[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(name)) {
            this.log(`📜 [SCRIPT] Rejected "${name}" - no letters found`);
            return false;
        }
        
        // Should not be an email address
        if (name.includes('@')) {
            this.log(`📜 [SCRIPT] Rejected "${name}" - contains @ (email)`);
            return false;
        }
        
        // Should not be a URL
        if (name.startsWith('http') || name.includes('://')) {
            this.log(`📜 [SCRIPT] Rejected "${name}" - looks like URL`);
            return false;
        }
        
        // Should not be pure technical identifiers
        if (/^[a-z0-9_\-\.]+$/i.test(name) && !this.looksLikeName(name)) {
            this.log(`📜 [SCRIPT] Rejected "${name}" - looks like technical identifier`);
            return false;
        }
        
        // Should not be common Google service identifiers or API URLs
        const googleServices = [
            'gmail', 'drive', 'docs', 'sheets', 'slides', 'youtube', 'maps', 'photos',
            'apis.google.com', 'client.js', 'googleapis.com', 'gstatic.com',
            'googleusercontent.com', 'accounts.google.com'
        ];
        if (googleServices.some(service => name.toLowerCase().includes(service))) {
            this.log(`📜 [SCRIPT] Rejected "${name}" - contains Google service/API name`);
            return false;
        }
        
        // Should not be common settings/UI text
        const commonUIText = ['settings', 'account', 'profile', 'user', 'default', 'unknown', 'anonymous', 'guest'];
        if (commonUIText.some(ui => name.toLowerCase() === ui)) {
            this.log(`📜 [SCRIPT] Rejected "${name}" - common UI text`);
            return false;
        }
        
        this.log(`📜 [SCRIPT] "${name}" passed validation checks`);
        return true;
    },
    
    /**
     * Check if a string looks like a human name (has proper name formatting)
     */
    looksLikeName(str) {
        // Check for common name patterns:
        // - "FirstName LastName" 
        // - "First Middle Last"
        // - Single names with proper capitalization
        
        const namePattern = /^[A-ZĄŻĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(\s+[A-ZĄŻĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)*$/;
        return namePattern.test(str);
    },

    /**
     * Main detection function with enhanced logic
     */
    detect() {
        this.log('🔍 Starting Google user name detection...');
        
        // PRIMARY METHOD: Script tag detection (most reliable)
        this.log('📜 Attempting script tag detection...');
        const scriptName = this.detectFromScriptTags();
        if (scriptName) {
            this.log(`✅ Script tag detection successful: "${scriptName}"`);
            this.state.lastDetectedName = scriptName;
            this.state.detectionAttempts++;
            this.notifyUserNameDetected(scriptName);
            return scriptName;
        }
        
        // FALLBACK METHOD: Basic DOM detection
        this.log('🔍 Script tag failed, trying basic DOM fallback...');
        const domName = this.detectFromDOM();
        if (domName) {
            this.log(`✅ DOM fallback successful: "${domName}"`);
            this.state.lastDetectedName = domName;
            this.state.detectionAttempts++;
            this.notifyUserNameDetected(domName);
            return domName;
        }
        
        this.log('❌ All detection methods failed');
        this.state.detectionAttempts++;
        return null;
    },

    /**
     * Simple DOM detection fallback
     */
    detectFromDOM() {
        this.log('🔍 Starting basic DOM detection...');
        
        for (const selector of this.fallbackSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                this.log(`🔍 Trying selector: "${selector}" - found ${elements.length} elements`);
                
                for (const element of elements) {
                    const text = element.textContent?.trim();
                    if (text && this.isValidBasicUserName(text)) {
                        const cleaned = this.cleanUserName(text);
                        if (cleaned) {
                            this.log(`✅ Found valid name: "${cleaned}"`);
                            return cleaned;
                        }
                    }
                }
            } catch (error) {
                this.log(`⚠️ Error with selector "${selector}": ${error.message}`);
            }
        }
        
        this.log('❌ DOM detection failed');
        return null;
    },

    /**
     * Basic name validation for DOM detection
     */
    isValidBasicUserName(name) {
        if (!name || typeof name !== 'string') return false;
        
        const trimmed = name.trim();
        if (trimmed.length < 2 || trimmed.length > 50) return false;
        if (!/[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(trimmed)) return false;
        if (trimmed.includes('@') || trimmed.includes('http')) return false;
        
        const blacklisted = ['settings', 'account', 'profile', 'zamknij', 'close', 'menu'];
        return !blacklisted.some(term => trimmed.toLowerCase().includes(term));
    },

    /**
     * Simplified name cleaning
     */
    cleanUserName(name) {
        if (!name) return null;
        
        name = name.trim();
        this.log(`🧹 Cleaning name: "${name}"`);
        
        // Remove prefixes
        name = name.replace(/^(Google Account|Konto Google|Account|Profile|Profil):\s*/i, '');
        
        // Remove email in parentheses
        name = name.replace(/\s*\([^()]*@[^()]*\)\s*$/, '');
        
        // Clean up spaces
        name = name.replace(/\s+/g, ' ').trim();
        
        this.log(`🧹 Cleaned: "${name}"`);
        
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