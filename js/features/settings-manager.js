/**
 * Settings Manager - Manages user preferences and settings
 * Handles custom user display name and other future settings
 */

window.SettingsManager = {
    // Current settings
    userDisplayName: '',
    googleUserName: null,
    useDefaultPrompt: true,
    customPrompt: '',
    
    // Track original values for change detection
    originalUserDisplayName: '',
    originalUseDefaultPrompt: true,
    originalCustomPrompt: '',
    
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
            chrome.storage.sync.get(['userDisplayName', 'googleUserName', 'useDefaultPrompt', 'customPrompt'], (result) => {
                this.userDisplayName = result.userDisplayName || '';
                this.googleUserName = result.googleUserName || null;
                this.useDefaultPrompt = result.useDefaultPrompt ?? true;
                this.customPrompt = result.customPrompt || '';

                console.log('⚙️ [SETTINGS] Loaded settings:', {
                    userDisplayName: this.userDisplayName,
                    googleUserName: this.googleUserName,
                    useDefaultPrompt: this.useDefaultPrompt,
                    customPrompt: this.customPrompt ? 'Custom prompt set' : 'No custom prompt'
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
     * Get the display name to use for the user.
     * Priority: Custom name > "Ty (Google Name)" > "Ty"
     */
    getUserDisplayName() {
        const trimmed = this.userDisplayName?.trim();
        if (trimmed) return trimmed;
        return this.getPlaceholderText();
    },

    /**
     * Get placeholder/fallback text (used for input placeholder and default display name)
     */
    getPlaceholderText() {
        return this.googleUserName ? `Ty (${this.googleUserName})` : 'Ty';
    },
    
    /**
     * Save settings to chrome storage
     */
    async saveSettings(settings) {
        const dataToSave = {
            userDisplayName: settings.userDisplayName || ''
        };

        if (settings.useDefaultPrompt !== undefined) {
            dataToSave.useDefaultPrompt = settings.useDefaultPrompt;
        }
        if (settings.customPrompt !== undefined) {
            dataToSave.customPrompt = settings.customPrompt;
        }

        // Update local state from what we are saving
        Object.assign(this, dataToSave);

        return new Promise((resolve) => {
            chrome.storage.sync.set(dataToSave, () => {
                console.log('⚙️ [SETTINGS] Settings saved:', dataToSave);

                if (window.UIManager?.updateStatus) {
                    window.UIManager.updateStatus('Ustawienia zapisane', 'success');
                }

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
            
            // Store original value for change detection
            this.originalUserDisplayName = this.userDisplayName;
            
            // Setup input change listener
            this.setupInputChangeListener();
        }
        
        // Update prompt settings
        const useDefaultPromptSwitch = document.getElementById('useDefaultPrompt');
        const customPromptText = document.getElementById('customPromptText');
        const customPromptGroup = document.getElementById('customPromptGroup');
        
        if (useDefaultPromptSwitch) {
            useDefaultPromptSwitch.checked = this.useDefaultPrompt;
            
            // Store original values for change detection
            this.originalUseDefaultPrompt = this.useDefaultPrompt;
            this.originalCustomPrompt = this.customPrompt;
        }
        
        if (customPromptText) {
            customPromptText.value = this.customPrompt;
            
            // Load default prompt if custom is empty
            if (!this.customPrompt) {
                this.loadDefaultPrompt();
            }
        }
        
        // Show/hide custom prompt based on switch
        if (customPromptGroup && useDefaultPromptSwitch) {
            customPromptGroup.style.display = useDefaultPromptSwitch.checked ? 'none' : 'block';
        }
        
        // Update session count info
        this.updateSessionCountInfo();
        
        // Hide settings footer initially (no changes yet)
        this.updateSettingsFooterVisibility(false);
        
        // Show modal using ModalManager
        if (window.ModalManager) {
            window.ModalManager.showModal('settingsModal');
        }
    },

    /**
     * Load default prompt from prompt.md file
     */
    async loadDefaultPrompt() {
        try {
            const response = await fetch(chrome.runtime.getURL('prompt.md'));
            const defaultPrompt = await response.text();
            
            const customPromptText = document.getElementById('customPromptText');
            if (customPromptText && !this.customPrompt) {
                customPromptText.value = defaultPrompt;
                customPromptText.placeholder = '';
            }
            
            console.log('⚙️ [SETTINGS] Default prompt loaded');
        } catch (error) {
            console.error('❌ [SETTINGS] Error loading default prompt:', error);
            const customPromptText = document.getElementById('customPromptText');
            if (customPromptText) {
                customPromptText.placeholder = 'Błąd podczas wczytywania domyślnego promptu';
            }
        }
    },
    
    /**
     * Setup input change listeners for real-time change detection.
     * Uses stored bound references so listeners can be properly removed to avoid duplicates.
     */
    setupInputChangeListener() {
        // Create stable bound references once so removeEventListener works
        if (!this._boundHandleInputChange) {
            this._boundHandleInputChange = this.handleInputChange.bind(this);
        }
        if (!this._boundHandlePromptSwitchChange) {
            this._boundHandlePromptSwitchChange = this.handlePromptSwitchChange.bind(this);
        }

        const userNameInput = document.getElementById('userDisplayName');
        if (userNameInput) {
            userNameInput.removeEventListener('input', this._boundHandleInputChange);
            userNameInput.addEventListener('input', this._boundHandleInputChange);
        }

        const customPromptText = document.getElementById('customPromptText');
        if (customPromptText) {
            customPromptText.removeEventListener('input', this._boundHandleInputChange);
            customPromptText.addEventListener('input', this._boundHandleInputChange);
        }

        const useDefaultPromptSwitch = document.getElementById('useDefaultPrompt');
        if (useDefaultPromptSwitch) {
            useDefaultPromptSwitch.removeEventListener('change', this._boundHandlePromptSwitchChange);
            useDefaultPromptSwitch.addEventListener('change', this._boundHandlePromptSwitchChange);
        }
    },

    /**
     * Handle input changes and update footer visibility
     */
    handleInputChange() {
        const hasChanges = this.hasUnsavedChanges();
        this.updateSettingsFooterVisibility(hasChanges);
    },

    /**
     * Check if there are unsaved changes across all settings fields
     */
    hasUnsavedChanges() {
        const userNameInput = document.getElementById('userDisplayName');
        if (userNameInput && userNameInput.value.trim() !== this.originalUserDisplayName) {
            return true;
        }

        const useDefaultPromptSwitch = document.getElementById('useDefaultPrompt');
        if (useDefaultPromptSwitch && useDefaultPromptSwitch.checked !== this.originalUseDefaultPrompt) {
            return true;
        }

        const customPromptText = document.getElementById('customPromptText');
        if (customPromptText && customPromptText.value.trim() !== this.originalCustomPrompt) {
            return true;
        }

        return false;
    },

    /**
     * Update settings footer visibility based on whether changes exist
     */
    updateSettingsFooterVisibility(visible) {
        const settingsFooter = document.querySelector('.settings-footer');
        if (settingsFooter) {
            settingsFooter.classList.toggle('visible', visible);
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
        
        // Unified settings save button
        const saveAllSettingsBtn = document.getElementById('saveAllSettingsBtn');
        if (saveAllSettingsBtn) {
            saveAllSettingsBtn.addEventListener('click', () => this.handleSaveAllSettings());
        }
        
        // Unified settings cancel button
        const cancelAllSettingsBtn = document.getElementById('cancelAllSettingsBtn');
        if (cancelAllSettingsBtn) {
            cancelAllSettingsBtn.addEventListener('click', () => this.handleCancelAllSettings());
        }
        
        // Legacy button support (if needed)
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.handleSaveSettings());
        }
        
        const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
        if (cancelSettingsBtn) {
            cancelSettingsBtn.addEventListener('click', () => this.handleCancelSettings());
        }
        
        // Manual Google name detection button
        const detectBtn = document.getElementById('detectGoogleNameBtn');
        if (detectBtn) {
            detectBtn.addEventListener('click', () => this.handleManualDetection());
        }
        
        // Clear all sessions button
        const clearAllSessionsBtn = document.getElementById('clearAllSessionsBtn');
        if (clearAllSessionsBtn) {
            clearAllSessionsBtn.addEventListener('click', () => this.handleClearAllSessions());
        }

        // Prompt settings
        const useDefaultPromptSwitch = document.getElementById('useDefaultPrompt');
        if (useDefaultPromptSwitch) {
            useDefaultPromptSwitch.addEventListener('change', () => this.handlePromptSwitchChange());
        }

        const customPromptText = document.getElementById('customPromptText');
        if (customPromptText) {
            customPromptText.addEventListener('input', () => this.handleInputChange());
        }

        // Prompt save/cancel buttons (removed - now using unified buttons)

        // Tab switching functionality
        this.setupTabSwitching();
    },

    /**
     * Setup tab switching functionality
     */
    setupTabSwitching() {
        const tabButtons = document.querySelectorAll('.tab-button');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = button.getAttribute('data-tab');
                this.switchTab(targetTab);
            });
        });
    },

    /**
     * Switch to specified tab
     */
    switchTab(targetTab) {
        // Remove active class from all tab buttons
        const allTabButtons = document.querySelectorAll('.tab-button');
        allTabButtons.forEach(button => {
            button.classList.remove('active');
        });

        // Add active class to clicked tab button
        const targetButton = document.querySelector(`[data-tab="${targetTab}"]`);
        if (targetButton) {
            targetButton.classList.add('active');
        }

        // Hide all tab panes
        const allTabPanes = document.querySelectorAll('.tab-pane');
        allTabPanes.forEach(pane => {
            pane.classList.remove('active');
        });

        // Show target tab pane
        const targetPane = document.getElementById(`${targetTab}-tab`);
        if (targetPane) {
            targetPane.classList.add('active');
        }

        console.log(`⚙️ [SETTINGS] Switched to tab: ${targetTab}`);
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
     * Collect current form values into a settings object
     */
    _collectFormValues() {
        const settings = {};

        const userNameInput = document.getElementById('userDisplayName');
        if (userNameInput) settings.userDisplayName = userNameInput.value.trim();

        const useDefaultPromptSwitch = document.getElementById('useDefaultPrompt');
        if (useDefaultPromptSwitch) settings.useDefaultPrompt = useDefaultPromptSwitch.checked;

        const customPromptText = document.getElementById('customPromptText');
        if (customPromptText) settings.customPrompt = customPromptText.value.trim();

        return settings;
    },

    /**
     * Close settings modal and hide the footer
     */
    _closeSettingsModal() {
        this.updateSettingsFooterVisibility(false);
        if (window.ModalManager) {
            window.ModalManager.hideModal('settingsModal');
        }
    },

    /**
     * Handle save all settings button click
     */
    async handleSaveAllSettings() {
        await this.saveSettings(this._collectFormValues());

        // Sync original values so change detection resets
        this.originalUserDisplayName = this.userDisplayName;
        this.originalUseDefaultPrompt = this.useDefaultPrompt;
        this.originalCustomPrompt = this.customPrompt;

        this._closeSettingsModal();
    },

    /**
     * Handle cancel all settings button click -- restores original values and closes
     */
    handleCancelAllSettings() {
        const userNameInput = document.getElementById('userDisplayName');
        if (userNameInput) userNameInput.value = this.originalUserDisplayName;

        const useDefaultPromptSwitch = document.getElementById('useDefaultPrompt');
        if (useDefaultPromptSwitch) useDefaultPromptSwitch.checked = this.originalUseDefaultPrompt;

        const customPromptText = document.getElementById('customPromptText');
        if (customPromptText) customPromptText.value = this.originalCustomPrompt;

        const customPromptGroup = document.getElementById('customPromptGroup');
        if (customPromptGroup && useDefaultPromptSwitch) {
            customPromptGroup.style.display = useDefaultPromptSwitch.checked ? 'none' : 'block';
        }

        this._closeSettingsModal();
    },

    /** Legacy alias */
    async handleSaveSettings() { return this.handleSaveAllSettings(); },

    /** Legacy alias */
    handleCancelSettings() { return this.handleCancelAllSettings(); },
    
    /**
     * Handle clear all sessions button click
     */
    async handleClearAllSessions() {
        const sessionCount = window.sessionHistory?.length || 0;

        if (sessionCount === 0) {
            window.ModalManager?.showToast?.('Brak sesji do usunięcia', 'info');
            return;
        }

        this.showClearAllSessionsConfirmation(sessionCount);
    },
    
    /**
     * Show clear all sessions confirmation modal
     */
    showClearAllSessionsConfirmation(sessionCount) {
        const confirmModal = document.getElementById('confirmModal');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmOk = document.getElementById('confirmOk');
        const confirmCancel = document.getElementById('confirmCancel');
        
        if (!confirmModal || !confirmMessage || !confirmOk || !confirmCancel) {
            console.error('❌ [SETTINGS] Required modal elements not found');
            return;
        }
        
        // Update modal content
        confirmMessage.innerHTML = `
            <div class="clear-all-sessions-warning">
                <div class="warning-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                </div>
                <div class="warning-content">
                    <h4>Usuń wszystkie sesje?</h4>
                    <p>Czy na pewno chcesz usunąć <strong>${sessionCount} ${sessionCount === 1 ? 'sesję' : sessionCount < 5 ? 'sesje' : 'sesji'}</strong> z historii?</p>
                    <div class="warning-note">
                        <strong>Ta akcja jest nieodwracalna!</strong>
                        Wszystkie zapisane transkrypcje zostaną trwale usunięte.
                    </div>
                </div>
            </div>
        `;
        
        // Update button text
        confirmOk.textContent = 'Usuń wszystkie';
        confirmOk.className = 'btn btn-danger';
        confirmCancel.textContent = 'Anuluj';
        
        // Replace buttons with clones to remove existing listeners
        const newConfirmOk = confirmOk.cloneNode(true);
        confirmOk.parentNode.replaceChild(newConfirmOk, confirmOk);

        const newConfirmCancel = confirmCancel.cloneNode(true);
        confirmCancel.parentNode.replaceChild(newConfirmCancel, confirmCancel);

        newConfirmOk.addEventListener('click', () => {
            this.executeClearAllSessions();
            window.ModalManager?.hideModal('confirmModal');
        });

        newConfirmCancel.addEventListener('click', () => {
            window.ModalManager?.hideModal('confirmModal');
            setTimeout(() => this.showSettingsModal(), 100);
        });

        window.ModalManager?.showModal('confirmModal');
    },
    
    /**
     * Execute the clear all sessions action
     */
    async executeClearAllSessions() {
        try {
            console.log('🗑️ [SETTINGS] Clearing all sessions...');

            if (!window.SessionHistoryManager?.clearAllSessionsFromHistory) {
                console.error('❌ [SETTINGS] SessionHistoryManager not available');
                window.ModalManager?.showToast?.('Błąd podczas usuwania sesji', 'error');
                return;
            }

            await window.SessionHistoryManager.clearAllSessionsFromHistory();
            this.updateSessionCountInfo();
            window.ModalManager?.showToast?.('Wszystkie sesje zostały usunięte', 'success');
            console.log('✅ [SETTINGS] All sessions cleared successfully');
        } catch (error) {
            console.error('❌ [SETTINGS] Error clearing sessions:', error);
            window.ModalManager?.showToast?.('Błąd podczas usuwania sesji', 'error');
        }
    },
    
    /**
     * Update session count info display
     */
    updateSessionCountInfo() {
        const sessionCountInfo = document.getElementById('sessionCountInfo');
        if (sessionCountInfo) {
            const sessionCount = window.sessionHistory ? window.sessionHistory.length : 0;
            if (sessionCount === 0) {
                sessionCountInfo.textContent = 'Brak sesji';
                sessionCountInfo.className = 'session-count-info empty';
            } else {
                sessionCountInfo.textContent = `${sessionCount} ${sessionCount === 1 ? 'sesja' : sessionCount < 5 ? 'sesje' : 'sesji'}`;
                sessionCountInfo.className = 'session-count-info';
            }
        }
    },

    /**
     * Handle prompt switch change (show/hide custom prompt)
     */
    handlePromptSwitchChange() {
        const useDefaultPromptSwitch = document.getElementById('useDefaultPrompt');
        const customPromptGroup = document.getElementById('customPromptGroup');

        if (useDefaultPromptSwitch && customPromptGroup) {
            const useDefault = useDefaultPromptSwitch.checked;
            customPromptGroup.style.display = useDefault ? 'none' : 'block';

            if (!useDefault) {
                const customPromptText = document.getElementById('customPromptText');
                if (customPromptText && !customPromptText.value.trim()) {
                    this.loadDefaultPrompt();
                }
            }
        }

        this.handleInputChange();
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