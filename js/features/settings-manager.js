/**
 * Settings Manager - Manages user preferences and settings
 * Handles custom user display name and multiple prompt management
 */

window.SettingsManager = {
    // Current settings
    userDisplayName: '',
    googleUserName: null,

    // Multi-prompt system
    prompts: [],
    _builtinPromptCache: null,
    _editingPromptId: null,

    // Track original values for change detection (profile tab only)
    originalUserDisplayName: '',

    /**
     * Initialize Settings Manager
     */
    async initialize() {
        console.log('⚙️ [SETTINGS] Initializing SettingsManager...');

        await this.loadSettings();
        await this.loadPrompts();
        await this.fetchGoogleUserName();

        this.setupEventListeners();
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

    // ─── Multi-Prompt System ───

    /**
     * Load prompts from storage with migration from old single-prompt format
     */
    async loadPrompts() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['promptsList', 'useDefaultPrompt', 'customPrompt'], (result) => {
                if (result.promptsList && result.promptsList.length > 0) {
                    this.prompts = result.promptsList;
                    console.log('⚙️ [SETTINGS] Loaded prompts list:', this.prompts.length, 'prompts');
                } else {
                    // Migration from old format
                    this.prompts = [this._createBuiltinPrompt()];

                    const hadCustomPrompt = result.useDefaultPrompt === false && result.customPrompt;
                    if (hadCustomPrompt) {
                        this.prompts.push({
                            id: 'prompt_' + Date.now(),
                            title: 'Mój prompt',
                            prompt: result.customPrompt,
                            isBuiltin: false,
                            isDefault: true
                        });
                        // Old custom was active, so builtin is not default
                        this.prompts[0].isDefault = false;
                    }

                    this.savePrompts();
                    console.log('⚙️ [SETTINGS] Migrated to multi-prompt system');
                }
                resolve();
            });
        });
    },

    /**
     * Create the built-in prompt entry
     */
    _createBuiltinPrompt() {
        return {
            id: 'builtin',
            title: 'Podsumowanie (systemowy)',
            prompt: null,
            isBuiltin: true,
            isDefault: true
        };
    },

    /**
     * Save prompts list to chrome.storage.sync
     */
    async savePrompts() {
        return new Promise((resolve) => {
            chrome.storage.sync.set({ promptsList: this.prompts }, () => {
                console.log('⚙️ [SETTINGS] Prompts saved:', this.prompts.length);
                resolve();
            });
        });
    },

    /**
     * Get the prompt marked as default
     */
    getDefaultPrompt() {
        return this.prompts.find(p => p.isDefault) || this.prompts[0] || this._createBuiltinPrompt();
    },

    /**
     * Fetch and cache the built-in prompt.md text
     */
    async getBuiltinPromptText() {
        if (this._builtinPromptCache) return this._builtinPromptCache;
        try {
            const response = await fetch(chrome.runtime.getURL('prompt.md'));
            this._builtinPromptCache = await response.text();
            return this._builtinPromptCache;
        } catch (error) {
            console.error('❌ [SETTINGS] Error loading built-in prompt:', error);
            return null;
        }
    },

    /**
     * Get the resolved text for a given prompt object
     */
    async getPromptText(promptObj) {
        if (!promptObj) promptObj = this.getDefaultPrompt();
        if (promptObj.isBuiltin || promptObj.prompt === null) {
            return await this.getBuiltinPromptText();
        }
        return promptObj.prompt;
    },

    /**
     * Find a prompt by ID
     */
    getPromptById(id) {
        return this.prompts.find(p => p.id === id);
    },

    /**
     * Check if a title is unique (excluding a specific prompt ID)
     */
    isTitleUnique(title, excludeId) {
        const normalized = title.trim().toLowerCase();
        return !this.prompts.some(p => p.id !== excludeId && p.title.trim().toLowerCase() === normalized);
    },

    /**
     * Add a new prompt
     */
    async addPrompt(title, promptText) {
        const newPrompt = {
            id: 'prompt_' + Date.now(),
            title: title.trim(),
            prompt: promptText,
            isBuiltin: false,
            isDefault: false
        };
        this.prompts.push(newPrompt);
        await this.savePrompts();
        return newPrompt;
    },

    /**
     * Update an existing prompt (blocks builtin edit)
     */
    async updatePrompt(id, title, promptText) {
        const prompt = this.getPromptById(id);
        if (!prompt || prompt.isBuiltin) return false;
        prompt.title = title.trim();
        prompt.prompt = promptText;
        await this.savePrompts();
        return true;
    },

    /**
     * Delete a prompt (blocks builtin delete)
     */
    async deletePrompt(id) {
        const prompt = this.getPromptById(id);
        if (!prompt || prompt.isBuiltin) return false;

        const wasDefault = prompt.isDefault;
        this.prompts = this.prompts.filter(p => p.id !== id);

        if (wasDefault) {
            const builtin = this.prompts.find(p => p.isBuiltin);
            if (builtin) builtin.isDefault = true;
        }

        await this.savePrompts();
        return true;
    },

    /**
     * Set a prompt as the default (only one at a time)
     */
    async setDefaultPrompt(id) {
        this.prompts.forEach(p => { p.isDefault = (p.id === id); });
        await this.savePrompts();
    },

    // ─── Prompt UI Rendering ───

    /**
     * Render the prompt list table in the prompt tab
     */
    renderPromptList() {
        const tableBody = document.getElementById('promptTableBody');
        if (!tableBody) return;

        // Ensure prompt form is hidden and list is shown
        const listContainer = document.getElementById('promptListContainer');
        const formContainer = document.getElementById('promptFormContainer');
        if (listContainer) listContainer.style.display = '';
        if (formContainer) formContainer.style.display = 'none';
        this._setPromptFormActionsVisible(false);

        tableBody.innerHTML = '';

        this.prompts.forEach(prompt => {
            const row = document.createElement('div');
            row.className = 'prompt-row' + (prompt.isDefault ? ' prompt-row-default' : '');
            row.dataset.promptId = prompt.id;

            const defaultStar = prompt.isDefault
                ? '<span class="prompt-default-badge" title="Domyślny prompt">&#9733;</span>'
                : `<button class="prompt-action-btn prompt-set-default" title="Ustaw jako domyślny" data-id="${prompt.id}">&#9734;</button>`;

            const title = this._escapeHtml(prompt.title);

            let actions = '';
            if (prompt.isBuiltin) {
                actions = `<button class="prompt-action-btn" title="Kopiuj" data-action="copy" data-id="${prompt.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>`;
            } else {
                actions = `
                    <button class="prompt-action-btn" title="Edytuj" data-action="edit" data-id="${prompt.id}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="prompt-action-btn" title="Kopiuj" data-action="copy" data-id="${prompt.id}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button class="prompt-action-btn prompt-action-delete" title="Usuń" data-action="delete" data-id="${prompt.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>`;
            }

            row.innerHTML = `
                <div class="prompt-row-default-col">${defaultStar}</div>
                <div class="prompt-row-title">${title}</div>
                <div class="prompt-row-actions">${actions}</div>
            `;

            tableBody.appendChild(row);
        });

        // Attach event listeners via delegation
        this._setupPromptListListeners(tableBody);
    },

    /**
     * Setup event delegation for prompt list actions
     */
    _setupPromptListListeners(tableBody) {
        // Remove old listener
        if (this._promptTableClickHandler) {
            tableBody.removeEventListener('click', this._promptTableClickHandler);
        }

        this._promptTableClickHandler = (e) => {
            const btn = e.target.closest('[data-action], .prompt-set-default');
            if (!btn) return;

            const id = btn.dataset.id;
            if (btn.classList.contains('prompt-set-default')) {
                this.setDefaultPrompt(id).then(() => this.renderPromptList());
                return;
            }

            const action = btn.dataset.action;
            if (action === 'edit') this.showPromptForm('edit', this.getPromptById(id));
            else if (action === 'copy') this.showPromptForm('copy', this.getPromptById(id));
            else if (action === 'delete') this._handleDeletePrompt(id);
        };

        tableBody.addEventListener('click', this._promptTableClickHandler);
    },

    /**
     * Handle prompt deletion with confirmation
     */
    async _handleDeletePrompt(id) {
        const prompt = this.getPromptById(id);
        if (!prompt) return;

        const confirmed = confirm(`Usunąć prompt "${prompt.title}"?`);
        if (!confirmed) return;

        await this.deletePrompt(id);
        this.renderPromptList();
        window.ExportManager?.showToast?.('Prompt usunięty', 'success');
    },

    /**
     * Show the add/edit prompt form
     */
    async showPromptForm(mode, promptData) {
        const listContainer = document.getElementById('promptListContainer');
        const formContainer = document.getElementById('promptFormContainer');
        const titleInput = document.getElementById('promptTitleInput');
        const textInput = document.getElementById('promptTextInput');
        const formTitle = document.getElementById('promptFormTitle');
        const titleError = document.getElementById('promptTitleError');

        if (!listContainer || !formContainer || !titleInput || !textInput) return;

        listContainer.style.display = 'none';
        formContainer.style.display = '';
        this._setPromptFormActionsVisible(true);
        if (titleError) { titleError.style.display = 'none'; titleError.textContent = ''; }

        // Hide settings footer while in prompt form
        this.updateSettingsFooterVisibility(false);

        if (mode === 'edit') {
            this._editingPromptId = promptData.id;
            formTitle.textContent = 'Edytuj prompt';
            titleInput.value = promptData.title;
            textInput.value = promptData.prompt || '';
        } else if (mode === 'copy') {
            this._editingPromptId = null;
            formTitle.textContent = 'Kopiuj prompt';
            titleInput.value = '';
            // For builtin prompt, fetch the actual text
            if (promptData.isBuiltin || promptData.prompt === null) {
                textInput.value = await this.getBuiltinPromptText() || '';
            } else {
                textInput.value = promptData.prompt || '';
            }
        } else {
            // 'add'
            this._editingPromptId = null;
            formTitle.textContent = 'Nowy prompt';
            titleInput.value = '';
            textInput.value = '';
        }

        titleInput.focus();
    },

    /**
     * Handle prompt form save
     */
    async _handlePromptFormSave() {
        const titleInput = document.getElementById('promptTitleInput');
        const textInput = document.getElementById('promptTextInput');
        const titleError = document.getElementById('promptTitleError');

        if (!titleInput || !textInput) return;

        const title = titleInput.value.trim();
        const promptText = textInput.value.trim();

        // Validation
        if (!title) {
            if (titleError) { titleError.textContent = 'Nazwa jest wymagana'; titleError.style.display = 'block'; }
            titleInput.focus();
            return;
        }

        if (!this.isTitleUnique(title, this._editingPromptId)) {
            if (titleError) { titleError.textContent = 'Prompt o takiej nazwie już istnieje'; titleError.style.display = 'block'; }
            titleInput.focus();
            return;
        }

        if (this._editingPromptId) {
            await this.updatePrompt(this._editingPromptId, title, promptText);
            window.ExportManager?.showToast?.('Prompt zaktualizowany', 'success');
        } else {
            await this.addPrompt(title, promptText);
            window.ExportManager?.showToast?.('Prompt dodany', 'success');
        }

        this._editingPromptId = null;
        this.renderPromptList();
    },

    /**
     * Handle prompt form cancel
     */
    _handlePromptFormCancel() {
        this._editingPromptId = null;
        this.renderPromptList();
    },

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Set the visibility of the prompt form action buttons
     */
    _setPromptFormActionsVisible(visible) {
        const formActions = document.querySelector('#prompt-tab > .prompt-form-actions');
        if (formActions) formActions.style.display = visible ? '' : 'none';
    },

    // ─── General Settings (Profile) ───

    /**
     * Try to fetch Google user name from various sources
     */
    async fetchGoogleUserName() {
        if (this.googleUserName) {
            console.log('⚙️ [SETTINGS] Using stored Google name:', this.googleUserName);
        }
    },

    /**
     * Get the display name to use for the user.
     */
    getUserDisplayName() {
        const trimmed = this.userDisplayName?.trim();
        if (trimmed) return trimmed;
        return this.getPlaceholderText();
    },

    getPlaceholderText() {
        return this.googleUserName ? `Ty (${this.googleUserName})` : 'Ty';
    },

    /**
     * Save settings to chrome storage (profile settings only)
     */
    async saveSettings(settings) {
        const dataToSave = {
            userDisplayName: settings.userDisplayName || ''
        };

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

    cleanGoogleUserName(name) {
        if (!name) return name;

        let cleaned = name.trim();
        cleaned = cleaned.replace(/\s*\([^()]*@[^()]*\)\s*$/, '');
        cleaned = cleaned.replace(/\s*\([^()]*\([^()]*@[^()]*\)[^()]*\)\s*$/, '');
        cleaned = cleaned.replace(/\s*<[^>]*@[^>]*>\s*$/, '');
        cleaned = cleaned.replace(/\s+[^\s]+@[^\s]+\s*$/, '');

        if (name.includes('@') && cleaned === name) {
            cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/, '');
        }

        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        cleaned = cleaned.replace(/[,;:\-\.\s]+$/, '').trim();

        return cleaned || name;
    },

    async updateGoogleUserName(name) {
        if (name && name !== this.googleUserName) {
            const cleanedName = this.cleanGoogleUserName(name);
            this.googleUserName = cleanedName;

            chrome.storage.sync.set({ googleUserName: cleanedName }, () => {
                console.log('⚙️ [SETTINGS] Updated Google user name:', cleanedName);
            });

            this.updateSettingsModalPlaceholder();
        }
    },

    notifyContentScript() {
        chrome.tabs.query({ url: 'https://meet.google.com/*' }, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'updateUserDisplayName',
                    displayName: this.getUserDisplayName()
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.log('⚙️ [SETTINGS] Could not notify content script (tab may be inactive)');
                    }
                });
            });
        });
    },

    // ─── Settings Modal ───

    showSettingsModal() {
        console.log('⚙️ [SETTINGS] Showing settings modal');

        const userNameInput = document.getElementById('userDisplayName');
        if (userNameInput) {
            userNameInput.value = this.userDisplayName;
            userNameInput.placeholder = this.getPlaceholderText();
            this.originalUserDisplayName = this.userDisplayName;
            this.setupInputChangeListener();
        }

        // Render prompt list when opening modal
        this.renderPromptList();

        this.updateSessionCountInfo();
        this.updateSettingsFooterVisibility(false);

        if (window.ModalManager) {
            window.ModalManager.showModal('settingsModal');
        }
    },

    setupInputChangeListener() {
        if (!this._boundHandleInputChange) {
            this._boundHandleInputChange = this.handleInputChange.bind(this);
        }

        const userNameInput = document.getElementById('userDisplayName');
        if (userNameInput) {
            userNameInput.removeEventListener('input', this._boundHandleInputChange);
            userNameInput.addEventListener('input', this._boundHandleInputChange);
        }
    },

    handleInputChange() {
        const hasChanges = this.hasUnsavedChanges();
        this.updateSettingsFooterVisibility(hasChanges);
    },

    /**
     * Check if there are unsaved changes (profile tab only; prompts save independently)
     */
    hasUnsavedChanges() {
        const userNameInput = document.getElementById('userDisplayName');
        return userNameInput?.value.trim() !== this.originalUserDisplayName;
    },

    updateSettingsFooterVisibility(visible) {
        const settingsFooter = document.querySelector('.settings-footer');
        if (settingsFooter) {
            settingsFooter.classList.toggle('visible', visible);
        }
    },

    updateSettingsModalPlaceholder() {
        const userNameInput = document.getElementById('userDisplayName');
        if (userNameInput) {
            userNameInput.placeholder = this.getPlaceholderText();
        }
    },

    // ─── Event Listeners ───

    setupEventListeners() {
        function bindClick(id, handler) {
            document.getElementById(id)?.addEventListener('click', handler);
        }

        bindClick('settingsBtn', () => this.showSettingsModal());
        bindClick('saveAllSettingsBtn', () => this.handleSaveAllSettings());
        bindClick('cancelAllSettingsBtn', () => this.handleCancelAllSettings());
        bindClick('detectGoogleNameBtn', () => this.handleManualDetection());
        bindClick('clearAllSessionsBtn', () => this.handleClearAllSessions());
        bindClick('addPromptBtn', () => this.showPromptForm('add'));
        bindClick('promptFormSave', () => this._handlePromptFormSave());
        bindClick('promptFormCancel', () => this._handlePromptFormCancel());

        this.setupTabSwitching();
    },

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

    switchTab(targetTab) {
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-tab="${targetTab}"]`)?.classList.add('active');

        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        document.getElementById(`${targetTab}-tab`)?.classList.add('active');

        if (targetTab === 'prompt') {
            this.renderPromptList();
        }

        console.log(`⚙️ [SETTINGS] Switched to tab: ${targetTab}`);
    },

    async handleManualDetection() {
        const statusEl = document.getElementById('googleDetectionStatus');
        const detectBtn = document.getElementById('detectGoogleNameBtn');

        if (statusEl) {
            statusEl.textContent = 'Wykrywanie...';
            statusEl.className = 'detection-status info';
        }
        if (detectBtn) detectBtn.disabled = true;

        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const meetTabs = tabs.filter(tab => tab.url && tab.url.includes('meet.google.com'));

            if (meetTabs.length === 0) {
                const allMeetTabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });
                if (allMeetTabs.length === 0) {
                    if (statusEl) {
                        statusEl.textContent = 'Brak otwartej karty Google Meet';
                        statusEl.className = 'detection-status error';
                    }
                    return;
                }
                meetTabs.push(allMeetTabs[0]);
            }

            const targetTab = meetTabs[0];

            const response = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout'));
                }, 10000);

                chrome.tabs.sendMessage(targetTab.id, {
                    action: 'manualDetectGoogleName'
                }, (response) => {
                    clearTimeout(timeout);
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });

            if (response && response.success && response.userName) {
                const cleanedName = this.cleanGoogleUserName(response.userName);
                await this.updateGoogleUserName(cleanedName);
                if (statusEl) {
                    statusEl.textContent = `Wykryto: ${cleanedName}`;
                    statusEl.className = 'detection-status success';
                }
            } else {
                const errorMsg = response?.error || 'Nieznany błąd';
                if (statusEl) {
                    statusEl.textContent = `Nie udało się wykryć nazwy: ${errorMsg}`;
                    statusEl.className = 'detection-status error';
                }
            }
        } catch (error) {
            console.error('❌ [SETTINGS] Manual detection error:', error);
            let errorMessage = 'Błąd podczas wykrywania';
            if (error.message.includes('Timeout')) errorMessage = 'Przekroczono czas oczekiwania';
            else if (error.message.includes('Could not establish connection')) errorMessage = 'Brak połączenia z kartą Meet';

            if (statusEl) {
                statusEl.textContent = errorMessage;
                statusEl.className = 'detection-status error';
            }
        } finally {
            if (detectBtn) detectBtn.disabled = false;
            setTimeout(() => {
                if (statusEl) {
                    statusEl.textContent = '';
                    statusEl.className = 'detection-status';
                }
            }, 8000);
        }
    },

    _collectFormValues() {
        const settings = {};
        const userNameInput = document.getElementById('userDisplayName');
        if (userNameInput) settings.userDisplayName = userNameInput.value.trim();
        return settings;
    },

    _closeSettingsModal() {
        this.updateSettingsFooterVisibility(false);
        if (window.ModalManager) {
            window.ModalManager.hideModal('settingsModal');
        }
    },

    async handleSaveAllSettings() {
        await this.saveSettings(this._collectFormValues());
        this.originalUserDisplayName = this.userDisplayName;
        this._closeSettingsModal();
    },

    handleCancelAllSettings() {
        const userNameInput = document.getElementById('userDisplayName');
        if (userNameInput) userNameInput.value = this.originalUserDisplayName;
        this._closeSettingsModal();
    },

    async handleClearAllSessions() {
        const sessionCount = window.sessionHistory?.length || 0;
        if (sessionCount === 0) {
            window.ModalManager?.showToast?.('Brak sesji do usunięcia', 'info');
            return;
        }
        this.showClearAllSessionsConfirmation(sessionCount);
    },

    showClearAllSessionsConfirmation(sessionCount) {
        const confirmModal = document.getElementById('confirmModal');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmOk = document.getElementById('confirmOk');
        const confirmCancel = document.getElementById('confirmCancel');

        if (!confirmModal || !confirmMessage || !confirmOk || !confirmCancel) {
            console.error('❌ [SETTINGS] Required modal elements not found');
            return;
        }

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

        confirmOk.textContent = 'Usuń wszystkie';
        confirmOk.className = 'btn btn-danger';
        confirmCancel.textContent = 'Anuluj';

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

    async executeClearAllSessions() {
        try {
            if (!window.SessionHistoryManager?.clearAllSessionsFromHistory) {
                window.ModalManager?.showToast?.('Błąd podczas usuwania sesji', 'error');
                return;
            }
            await window.SessionHistoryManager.clearAllSessionsFromHistory();
            this.updateSessionCountInfo();
            window.ModalManager?.showToast?.('Wszystkie sesje zostały usunięte', 'success');
        } catch (error) {
            console.error('❌ [SETTINGS] Error clearing sessions:', error);
            window.ModalManager?.showToast?.('Błąd podczas usuwania sesji', 'error');
        }
    },

    updateSessionCountInfo() {
        const el = document.getElementById('sessionCountInfo');
        if (!el) return;

        const count = window.sessionHistory?.length || 0;
        if (count === 0) {
            el.textContent = 'Brak sesji';
            el.className = 'session-count-info empty';
        } else {
            const label = count === 1 ? 'sesja' : count < 5 ? 'sesje' : 'sesji';
            el.textContent = `${count} ${label}`;
            el.className = 'session-count-info';
        }
    },

    setupGlobalAliases() {
        window.showSettingsModal = this.showSettingsModal.bind(this);
        window.getUserDisplayName = this.getUserDisplayName.bind(this);
    }
};
