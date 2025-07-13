/**
 * Settings Manager - Manages user preferences and settings
 * Handles custom user display name and other future settings
 */

window.SettingsManager = {
    // Current settings
    userDisplayName: '',
    googleUserName: null,
    
    /**
     * Initialize Settings Manager
     */
    async initialize() {
        console.log('⚙️ [SETTINGS] Initializing SettingsManager...');
        
        // Load saved settings from storage
        await this.loadSettings();
        
        // Try to fetch Google user name if available
        await this.fetchGoogleUserName();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup global aliases
        this.setupGlobalAliases();
        
        console.log('✅ [SETTINGS] SettingsManager initialized');
    },
    
    /**
     * Load settings from chrome storage
     */
    async loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['userDisplayName', 'googleUserName'], (result) => {
                this.userDisplayName = result.userDisplayName || '';
                this.googleUserName = result.googleUserName || null;
                
                console.log('⚙️ [SETTINGS] Loaded settings:', {
                    userDisplayName: this.userDisplayName,
                    googleUserName: this.googleUserName
                });
                
                resolve();
            });
        });
    },
    
    /**
     * Try to fetch Google user name from various sources
     */
    async fetchGoogleUserName() {
        // Option 1: Try to get from Google Meet DOM (if content script can access it)
        // This will be implemented when we have access to the page
        
        // Option 2: Check if we have it stored from previous sessions
        if (this.googleUserName) {
            console.log('⚙️ [SETTINGS] Using stored Google name:', this.googleUserName);
        }
        
        // For now, we'll rely on the content script to detect and send the name
    },
    
    /**
     * Get the display name to use for the user
     * Priority: Custom name > "Ty (Google Name)" > "Ty"
     */
    getUserDisplayName() {
        if (this.userDisplayName && this.userDisplayName.trim()) {
            return this.userDisplayName.trim();
        }
        
        if (this.googleUserName) {
            return `Ty (${this.googleUserName})`;
        }
        
        return 'Ty';
    },
    
    /**
     * Get placeholder text for the settings input
     */
    getPlaceholderText() {
        if (this.googleUserName) {
            return `Ty (${this.googleUserName})`;
        }
        return 'Ty';
    },
    
    /**
     * Save settings to chrome storage
     */
    async saveSettings(settings) {
        // Validate and save settings
        const dataToSave = {
            userDisplayName: settings.userDisplayName || ''
        };
        
        // Update local state
        this.userDisplayName = dataToSave.userDisplayName;
        
        // Save to storage
        return new Promise((resolve) => {
            chrome.storage.sync.set(dataToSave, () => {
                console.log('⚙️ [SETTINGS] Settings saved:', dataToSave);
                
                // Update UI status
                if (window.UIManager && window.UIManager.updateStatus) {
                    window.UIManager.updateStatus('Ustawienia zapisane', 'success');
                }
                
                // Notify content script about the change
                this.notifyContentScript();
                
                resolve();
            });
        });
    },
    
    /**
     * Clean Google user name by removing email parts
     */
    cleanGoogleUserName(name) {
        if (!name) return name;
        
        console.log('🧹 [SETTINGS] Cleaning Google name:', name);
        
        let cleaned = name.trim();
        
        // Remove email in parentheses (including nested)
        cleaned = cleaned.replace(/\s*\([^()]*@[^()]*\)\s*$/, '');
        cleaned = cleaned.replace(/\s*\([^()]*\([^()]*@[^()]*\)[^()]*\)\s*$/, '');
        
        // Remove email in angle brackets
        cleaned = cleaned.replace(/\s*<[^>]*@[^>]*>\s*$/, '');
        
        // Remove standalone email addresses at the end
        cleaned = cleaned.replace(/\s+[^\s]+@[^\s]+\s*$/, '');
        
        // If still contains email but nothing was removed, try broader parentheses removal
        if (name.includes('@') && cleaned === name) {
            cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/, '');
        }
        
        // Clean up extra spaces and punctuation
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        cleaned = cleaned.replace(/[,;:\-\.\s]+$/, '').trim();
        
        console.log('🧹 [SETTINGS] Cleaned Google name result:', cleaned);
        
        return cleaned || name; // Return original if cleaning failed
    },

    /**
     * Update Google user name (called from content script)
     */
    async updateGoogleUserName(name) {
        if (name && name !== this.googleUserName) {
            // Clean the name before storing
            const cleanedName = this.cleanGoogleUserName(name);
            this.googleUserName = cleanedName;
            
            // Store it for future use
            chrome.storage.sync.set({ googleUserName: cleanedName }, () => {
                console.log('⚙️ [SETTINGS] Updated Google user name:', cleanedName);
            });
            
            // Update placeholder in settings modal if it's open
            this.updateSettingsModalPlaceholder();
        }
    },
    
    /**
     * Notify content script about settings change
     */
    notifyContentScript() {
        // Send message to all Google Meet tabs
        chrome.tabs.query({ url: 'https://meet.google.com/*' }, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'updateUserDisplayName',
                    displayName: this.getUserDisplayName()
                }, (response) => {
                    // Handle response if needed
                    if (chrome.runtime.lastError) {
                        console.log('⚙️ [SETTINGS] Could not notify content script (tab may be inactive)');
                    }
                });
            });
        });
    },
    
    /**
     * Show settings modal
     */
    showSettingsModal() {
        console.log('⚙️ [SETTINGS] Showing settings modal');
        
        // Update input values before showing
        const userNameInput = document.getElementById('userDisplayName');
        if (userNameInput) {
            userNameInput.value = this.userDisplayName;
            userNameInput.placeholder = this.getPlaceholderText();
        }
        
        // Show modal using ModalManager
        if (window.ModalManager) {
            window.ModalManager.showModal('settingsModal');
        }
    },
    
    /**
     * Hide settings modal
     */
    hideSettingsModal() {
        if (window.ModalManager) {
            window.ModalManager.hideModal('settingsModal');
        }
    },
    
    /**
     * Update settings modal placeholder if it's visible
     */
    updateSettingsModalPlaceholder() {
        const userNameInput = document.getElementById('userDisplayName');
        if (userNameInput) {
            userNameInput.placeholder = this.getPlaceholderText();
        }
    },
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Settings button click
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettingsModal());
        }
        
        // Settings modal save button
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.handleSaveSettings());
        }
        
        // Settings modal cancel button
        const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
        if (cancelSettingsBtn) {
            cancelSettingsBtn.addEventListener('click', () => this.hideSettingsModal());
        }
        
        // Close button in modal header
        const closeBtn = document.querySelector('#settingsModal .modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideSettingsModal());
        }
        
        // Manual Google name detection button
        const detectBtn = document.getElementById('detectGoogleNameBtn');
        if (detectBtn) {
            detectBtn.addEventListener('click', () => this.handleManualDetection());
        }
    },
    
    /**
     * Handle manual Google name detection
     */
    async handleManualDetection() {
        const statusEl = document.getElementById('googleDetectionStatus');
        const detectBtn = document.getElementById('detectGoogleNameBtn');
        
        console.log('🔍 [SETTINGS] Starting manual Google name detection...');
        
        // Show loading state
        if (statusEl) {
            statusEl.textContent = 'Wykrywanie...';
            statusEl.className = 'detection-status info';
        }
        
        if (detectBtn) {
            detectBtn.disabled = true;
        }
        
        try {
            // Get current active tab (Google Meet)
            console.log('🔍 [SETTINGS] Querying for Google Meet tabs...');
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('🔍 [SETTINGS] Found tabs:', tabs.length, tabs.map(t => t.url));
            
            // Check if any tab is Google Meet
            const meetTabs = tabs.filter(tab => tab.url && tab.url.includes('meet.google.com'));
            console.log('🔍 [SETTINGS] Google Meet tabs:', meetTabs.length);
            
            if (meetTabs.length === 0) {
                // Try to find any Google Meet tab (not necessarily active)
                const allMeetTabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });
                console.log('🔍 [SETTINGS] All Google Meet tabs:', allMeetTabs.length);
                
                if (allMeetTabs.length === 0) {
                    if (statusEl) {
                        statusEl.textContent = 'Brak otwartej karty Google Meet';
                        statusEl.className = 'detection-status error';
                    }
                    return;
                } else {
                    // Use the first available Google Meet tab
                    meetTabs.push(allMeetTabs[0]);
                    console.log('🔍 [SETTINGS] Using first available Meet tab:', allMeetTabs[0].url);
                }
            }
            
            const targetTab = meetTabs[0];
            console.log('🔍 [SETTINGS] Sending detection request to tab:', targetTab.id, targetTab.url);
            
            // Send manual detection request to content script with timeout
            const response = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout: Content script nie odpowiedział w ciągu 10 sekund'));
                }, 10000);
                
                chrome.tabs.sendMessage(targetTab.id, {
                    action: 'manualDetectGoogleName'
                }, (response) => {
                    clearTimeout(timeout);
                    
                    if (chrome.runtime.lastError) {
                        reject(new Error(`Chrome runtime error: ${chrome.runtime.lastError.message}`));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            console.log('🔍 [SETTINGS] Received response from content script:', response);
            
            if (response && response.success && response.userName) {
                // Clean the detected name before using
                const cleanedName = this.cleanGoogleUserName(response.userName);
                console.log('🔍 [SETTINGS] Cleaned name:', cleanedName);
                
                // Update local state with cleaned name
                await this.updateGoogleUserName(cleanedName);
                
                if (statusEl) {
                    statusEl.textContent = `Wykryto: ${cleanedName}`;
                    statusEl.className = 'detection-status success';
                }
                
                console.log('✅ [SETTINGS] Manual detection successful:', cleanedName);
            } else {
                const errorMsg = response?.error || 'Nieznany błąd';
                if (statusEl) {
                    statusEl.textContent = `Nie udało się wykryć nazwy: ${errorMsg}`;
                    statusEl.className = 'detection-status error';
                }
                
                console.log('❌ [SETTINGS] Manual detection failed:', response);
            }
            
        } catch (error) {
            console.error('❌ [SETTINGS] Manual detection error:', error);
            
            let errorMessage = 'Błąd podczas wykrywania';
            if (error.message.includes('Timeout')) {
                errorMessage = 'Przekroczono czas oczekiwania';
            } else if (error.message.includes('Could not establish connection')) {
                errorMessage = 'Brak połączenia z kartą Meet';
            } else if (error.message.includes('runtime error')) {
                errorMessage = 'Błąd komunikacji z rozszerzeniem';
            }
            
            if (statusEl) {
                statusEl.textContent = errorMessage;
                statusEl.className = 'detection-status error';
            }
        } finally {
            // Re-enable button
            if (detectBtn) {
                detectBtn.disabled = false;
            }
            
            // Clear status after 8 seconds (longer for error messages)
            setTimeout(() => {
                if (statusEl) {
                    statusEl.textContent = '';
                    statusEl.className = 'detection-status';
                }
            }, 8000);
        }
    },

    /**
     * Handle save settings button click
     */
    async handleSaveSettings() {
        const userNameInput = document.getElementById('userDisplayName');
        if (!userNameInput) return;
        
        const newSettings = {
            userDisplayName: userNameInput.value.trim()
        };
        
        await this.saveSettings(newSettings);
        this.hideSettingsModal();
    },
    
    /**
     * Setup global aliases for backward compatibility
     */
    setupGlobalAliases() {
        window.showSettingsModal = this.showSettingsModal.bind(this);
        window.getUserDisplayName = this.getUserDisplayName.bind(this);
        
        console.log('🔗 [SETTINGS] Global function aliases created');
    }
};