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
        // PRIORITY 0: Google Meet participants list (MOST RELIABLE during meeting)
        '[role="list"][aria-label*="Uczestnicy"] [role="listitem"]:first-child[aria-label]',    // Polish participants list - flexible match
        '[role="list"][aria-label*="Participants"] [role="listitem"]:first-child[aria-label]', // English participants list - flexible match
        '[role="list"][aria-label="Uczestnicy rozmowy"] [role="listitem"]:first-child[aria-label]', // Specific Polish version
        '[role="list"][aria-label="Participants in call"] [role="listitem"]:first-child[aria-label]', // Specific English version
        '[role="list"][aria-label*="Uczestnicy"] [role="listitem"]:first-child .zWGUib',       // Polish participants list - name span
        '[role="list"][aria-label*="Participants"] [role="listitem"]:first-child .zWGUib',    // English participants list - name span
        '[role="list"][aria-label="Uczestnicy rozmowy"] [role="listitem"]:first-child .zWGUib', // Specific Polish name span
        '[role="list"][aria-label="Participants in call"] [role="listitem"]:first-child .zWGUib', // Specific English name span
        
        // PRIORITY 1: Specific Google Account name containers (fallback when not in meeting)
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
        
        // METHOD 1: Try script tag detection first (most reliable)
        this.log('🔍 [METHOD 1] Attempting script tag detection...');
        const scriptName = this.detectFromScriptTags();
        if (scriptName) {
            this.log(`✅ [METHOD 1] Script tag detection successful: "${scriptName}"`);
            this.state.lastDetectedName = scriptName;
            this.state.detectionAttempts++;
            this.notifyUserNameDetected(scriptName);
            return scriptName;
        }
        this.log('❌ [METHOD 1] Script tag detection failed');
        
        // METHOD 2: Fallback to DOM selector detection
        this.log('🔍 [METHOD 2] Attempting DOM selector detection...');
        
        // Check if we're in a Google Meet meeting context
        const inMeeting = this.isInMeetingContext();
        this.log(`📍 Meeting context: ${inMeeting ? 'IN MEETING' : 'NOT IN MEETING'}`);
        
        for (let i = 0; i < this.selectors.length; i++) {
            const selector = this.selectors[i];
            
            // Skip participants list selectors only if we're definitely not in a meeting context
            // Allow them to run on main page in case participants list is visible
            if (!inMeeting && (selector.includes('Uczestnicy') || selector.includes('Participants'))) {
                // Only skip if we're clearly on a non-meeting page
                const url = window.location.href;
                if (!url.includes('meet.google.com/')) {
                    this.log(`⏭️ Skipping participants selector (not on Meet page): "${selector}"`);
                    continue;
                }
                // Allow to continue if we're on Meet page even without meeting context
                this.log(`🤔 Trying participants selector on Meet page: "${selector}"`);
            }
            
            const elements = document.querySelectorAll(selector);
            
            this.log(`🔍 Trying selector ${i + 1}/${this.selectors.length}: "${selector}" - found ${elements.length} elements`);
            
            // Extra debugging for participants list selectors
            if ((selector.includes('Uczestnicy') || selector.includes('Participants')) && elements.length === 0) {
                // Check what participants lists actually exist
                const allLists = document.querySelectorAll('[role="list"]');
                this.log(`🔍 [DEBUG] Found ${allLists.length} total lists on page`);
                allLists.forEach((list, idx) => {
                    const ariaLabel = list.getAttribute('aria-label');
                    this.log(`🔍 [DEBUG] List ${idx}: aria-label="${ariaLabel}"`);
                });
            }
            
            // If this is a participants list selector and we found elements, prioritize it
            if (elements.length > 0 && (selector.includes('Uczestnicy') || selector.includes('Participants'))) {
                this.log(`🎯 PARTICIPANTS LIST FOUND - high priority detection!`);
            }
            
            for (let j = 0; j < elements.length; j++) {
                const element = elements[j];
                const userName = this.extractUserName(element, `${selector}[${j}]`);
                
                if (userName) {
                    this.log(`✅ [METHOD 2] DOM selector detection successful: "${userName}" from ${selector}[${j}]`);
                    this.state.lastDetectedName = userName;
                    this.state.detectionAttempts++;
                    
                    // Send to background/popup
                    this.notifyUserNameDetected(userName);
                    return userName;
                }
            }
        }
        
        this.log('❌ [METHOD 2] DOM selector detection failed - no valid names found');
        this.log('❌ All detection methods failed in this attempt');
        this.state.detectionAttempts++;
        return null;
    },

    /**
     * Check if we're currently in a Google Meet meeting context
     */
    isInMeetingContext() {
        // Check URL pattern - allow both main page and meeting rooms
        const url = window.location.href;
        const isOnMeetPage = url.includes('meet.google.com/');
        
        // Check for participants list existence (indicates active meeting)
        const participantsList = document.querySelector('[role="list"][aria-label*="Uczestnicy"], [role="list"][aria-label*="Participants"]');
        
        // Check for meeting controls (camera/mic buttons)
        const meetingControls = document.querySelector('[aria-label*="mikrofon"], [aria-label*="microphone"], [aria-label*="kamera"], [aria-label*="camera"]');
        
        // We're in meeting context if we have participants list OR meeting controls
        // This allows detection on both main page and during meetings
        const inMeeting = isOnMeetPage && (participantsList || meetingControls);
        
        this.log(`📍 Meeting context check: URL=${isOnMeetPage}, participants=${!!participantsList}, controls=${!!meetingControls} => ${inMeeting}`);
        
        return inMeeting;
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
        
        // Method 5: Extract from participants list (special handling)
        const participantsName = this.extractFromParticipantsList(element, context);
        if (participantsName) {
            this.log(`📝 Extracted from participants list: "${participantsName}" (${context})`);
            return participantsName;
        }
        
        // Method 6: Extract from nested elements
        const nestedUserName = this.extractFromNestedElements(element);
        if (nestedUserName) {
            this.log(`📝 Extracted from nested elements: "${nestedUserName}" (${context})`);
            return nestedUserName;
        }
        
        return null;
    },

    /**
     * Extract user name from Google Meet participants list
     * Special handling for participants list which has clean, reliable data
     */
    extractFromParticipantsList(element, context) {
        // Check if this is a participants list context
        if (!context.includes('role="list"') || !context.includes('aria-label')) {
            return null;
        }
        
        this.log(`👥 [PARTICIPANTS] Analyzing participants list element: ${context}`);
        this.log(`👥 [PARTICIPANTS] Element HTML: ${element.outerHTML?.substring(0, 200)}...`);
        
        // Method 1: Extract from aria-label (most reliable for participants)
        const ariaLabel = element.getAttribute('aria-label');
        this.log(`👥 [PARTICIPANTS] Element aria-label: "${ariaLabel}"`);
        if (ariaLabel) {
            // For participants list, aria-label usually contains clean name
            const cleanName = this.parseParticipantAriaLabel(ariaLabel);
            if (cleanName) {
                this.log(`👥 [PARTICIPANTS] Clean name from aria-label: "${cleanName}"`);
                return cleanName;
            }
        }
        
        // Method 2: Extract from .zWGUib span (participants name span)
        if (element.classList && element.classList.contains('zWGUib')) {
            const textContent = element.textContent?.trim();
            if (textContent && textContent.length >= 2 && textContent.length <= 50) {
                this.log(`👥 [PARTICIPANTS] Name from .zWGUib span: "${textContent}"`);
                return textContent;
            }
        }
        
        // Method 3: Look for .zWGUib within this element
        const nameSpan = element.querySelector('.zWGUib');
        if (nameSpan) {
            const textContent = nameSpan.textContent?.trim();
            if (textContent && textContent.length >= 2 && textContent.length <= 50) {
                this.log(`👥 [PARTICIPANTS] Name from nested .zWGUib: "${textContent}"`);
                return textContent;
            }
        }
        
        // Method 4: Check if this is a container with "(Ty)" marker
        // Look for elements that contain Ty/You marker programmatically (not using :contains selector)
        const allElements = element.querySelectorAll('*');
        for (const el of allElements) {
            const text = el.textContent;
            if (text && (text.includes('(Ty)') || text.includes('(You)')) && el.classList.contains('NnTWjc')) {
                // Found "(Ty)" marker, look for associated name in parent/sibling
                const parent = el.parentElement;
                if (parent) {
                    const nameSpanNearby = parent.querySelector('.zWGUib');
                    if (nameSpanNearby) {
                        const textContent = nameSpanNearby.textContent?.trim();
                        if (textContent && textContent.length >= 2 && textContent.length <= 50) {
                            this.log(`👥 [PARTICIPANTS] Name associated with "(Ty)" marker: "${textContent}"`);
                            return textContent;
                        }
                    }
                }
            }
        }
        
        // Method 5: Check if parent/ancestor is listitem and we're the first child
        let parentElement = element.parentElement;
        while (parentElement && !parentElement.getAttribute('role')) {
            parentElement = parentElement.parentElement;
        }
        
        if (parentElement && parentElement.getAttribute('role') === 'listitem') {
            // We're inside a listitem, check if it's the first child (host)
            const listContainer = parentElement.parentElement;
            if (listContainer && listContainer.querySelector('[role="listitem"]:first-child') === parentElement) {
                // This is the first participant (host), try to get name from aria-label
                const hostAriaLabel = parentElement.getAttribute('aria-label');
                if (hostAriaLabel) {
                    const cleanName = this.parseParticipantAriaLabel(hostAriaLabel);
                    if (cleanName) {
                        this.log(`👥 [PARTICIPANTS] Host name from parent listitem: "${cleanName}"`);
                        return cleanName;
                    }
                }
            }
        }
        
        return null;
    },

    /**
     * Parse aria-label specifically for participants list
     * Participants aria-labels are usually clean names without prefixes
     */
    parseParticipantAriaLabel(ariaLabel) {
        if (!ariaLabel) return null;
        
        this.log(`👥 [PARTICIPANTS] Parsing aria-label: "${ariaLabel}"`);
        
        const cleanLabel = ariaLabel.trim();
        
        // For participants list, aria-label is usually just the clean name
        // Examples: "Łukasz Szlachtowski", "John Smith", etc.
        
        // Basic validation - should look like a name
        if (cleanLabel.length >= 2 && cleanLabel.length <= 50 && 
            !cleanLabel.includes('@') && 
            !this.isUILabel(cleanLabel)) {
            
            this.log(`👥 [PARTICIPANTS] Valid participant name found: "${cleanLabel}"`);
            return cleanLabel;
        }
        
        this.log(`👥 [PARTICIPANTS] Aria-label validation failed for: "${cleanLabel}"`);
        return null;
    },

    /**
     * Check if text is a UI label (helper for participants parsing)
     */
    isUILabel(text) {
        const lowerText = text.toLowerCase();
        const uiLabels = [
            'uczestnicy', 'participants', 'więcej', 'more', 'actions', 'czynności',
            'mikrofon', 'microphone', 'kamera', 'camera', 'udostępnij', 'share'
        ];
        
        return uiLabels.some(label => lowerText.includes(label));
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
        // First, try patterns with prefixes (Google Account, etc.)
        const prefixPatterns = [
            /Google Account:\s*(.+)/i,
            /Konto Google:\s*(.+)/i,
            /Account menu for\s*(.+)/i,
            /Menu konta dla\s*(.+)/i,
            /Profile for\s*(.+)/i,
            /Profil dla\s*(.+)/i
        ];
        
        for (const pattern of prefixPatterns) {
            const match = ariaLabel.match(pattern);
            if (match && match[1]) {
                return this.cleanUserName(match[1]);
            }
        }
        
        // If no prefix patterns match, check if this might be a clean name
        // (especially for participants list where aria-label is just the name)
        const cleanLabel = ariaLabel.trim();
        
        // Basic validation for clean names
        if (cleanLabel.length >= 2 && cleanLabel.length <= 50 && 
            !cleanLabel.includes('@') && 
            !this.isUILabel(cleanLabel) &&
            !this.isBlacklistedValue(cleanLabel)) {
            
            // Looks like a clean name, apply light cleaning and return
            this.log(`🏷️ [ARIA] Clean name detected (no prefix): "${cleanLabel}"`);
            return this.cleanUserName(cleanLabel);
        }
        
        return null;
    },

    /**
     * Check if value is in blacklist (helper for aria-label parsing)
     */
    isBlacklistedValue(text) {
        const lowerText = text.toLowerCase();
        const quickBlacklist = [
            'domain_disabled', 'camera', 'microphone', 'video', 'audio', 'muted',
            'disabled', 'enabled', 'settings', 'menu', 'more', 'button'
        ];
        
        return quickBlacklist.some(blacklisted => lowerText.includes(blacklisted));
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