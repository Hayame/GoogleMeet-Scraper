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
     * Update Google user name (called from content script)
     */
    async updateGoogleUserName(name) {
        if (name && name !== this.googleUserName) {
            this.googleUserName = name;
            
            // Store it for future use
            chrome.storage.sync.set({ googleUserName: name }, () => {
                console.log('⚙️ [SETTINGS] Updated Google user name:', name);
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
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true, url: 'https://meet.google.com/*' });
            
            if (tabs.length === 0) {
                if (statusEl) {
                    statusEl.textContent = 'Brak aktywnej karty Google Meet';
                    statusEl.className = 'detection-status error';
                }
                return;
            }
            
            // Send manual detection request to content script
            const response = await chrome.tabs.sendMessage(tabs[0].id, {
                action: 'manualDetectGoogleName'
            });
            
            if (response && response.success && response.userName) {
                // Update local state
                await this.updateGoogleUserName(response.userName);
                
                if (statusEl) {
                    statusEl.textContent = `Wykryto: ${response.userName}`;
                    statusEl.className = 'detection-status success';
                }
                
                console.log('✅ [SETTINGS] Manual detection successful:', response.userName);
            } else {
                if (statusEl) {
                    statusEl.textContent = 'Nie udało się wykryć nazwy';
                    statusEl.className = 'detection-status error';
                }
                
                console.log('❌ [SETTINGS] Manual detection failed:', response);
            }
            
        } catch (error) {
            console.error('❌ [SETTINGS] Manual detection error:', error);
            
            if (statusEl) {
                statusEl.textContent = 'Błąd podczas wykrywania';
                statusEl.className = 'detection-status error';
            }
        } finally {
            // Re-enable button
            if (detectBtn) {
                detectBtn.disabled = false;
            }
            
            // Clear status after 5 seconds
            setTimeout(() => {
                if (statusEl) {
                    statusEl.textContent = '';
                    statusEl.className = 'detection-status';
                }
            }, 5000);
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