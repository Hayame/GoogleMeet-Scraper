/**
 * Search and Filter Functionality Module
 * 
 * Extracted from popup.js lines 3364-3758
 * Handles search functionality and participant filtering
 */

window.SearchFilterManager = {
    
    // Internal state
    _currentSearchQuery: '',
    _searchDebounceTimer: null,
    _originalMessages: [],
    _activeParticipantFilters: new Set(),
    _allParticipants: [],
    _pendingRestoreState: null,
    _hasBeenInitialized: false,

    /**
     * Initialize search functionality
     * Source: popup.js lines 3364-3385
     */
    initializeSearch() {
        const searchBtn = document.getElementById("searchBtn");
        const searchInput = document.getElementById("searchInput");
        const clearSearchBtn = document.getElementById("searchClearBtn");
        
        if (searchBtn) {
            searchBtn.addEventListener("click", () => this.toggleSearchPanel());
        }
        
        if (searchInput) {
            searchInput.addEventListener("input", (e) => this.handleSearchInput(e));
            searchInput.addEventListener("keydown", (e) => {
                if (e.key === "Escape") {
                    this.hideSearchPanel();
                }
            });
        }
        
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener("click", () => this.clearSearch());
        }
        
        // Close search panel when clicking outside
        document.addEventListener('click', (e) => {
            const searchPanel = document.getElementById("searchPanel");
            const searchBtn = document.getElementById("searchBtn");
            
            if (searchPanel && searchBtn && 
                !searchPanel.contains(e.target) && 
                !searchBtn.contains(e.target) &&
                searchPanel.classList.contains("show")) {
                this.hideSearchPanel();
            }
        });
    },

    /**
     * Hide search panel without clearing search query
     */
    hideSearchPanel() {
        const searchPanel = document.getElementById("searchPanel");
        const searchBtn = document.getElementById("searchBtn");
        
        if (searchPanel) {
            searchPanel.classList.remove("show");
            setTimeout(() => {
                searchPanel.style.display = "none";
            }, 300); // Match animation duration
        }
        
        // Remove active state from search button
        if (searchBtn) {
            searchBtn.classList.remove("active");
        }
    },

    /**
     * Toggle search panel visibility
     * Source: popup.js lines 3387-3403
     */
    toggleSearchPanel() {
        const searchPanel = document.getElementById("searchPanel");
        const searchInput = document.getElementById("searchInput");
        const searchBtn = document.getElementById("searchBtn");
        
        if (searchPanel) {
            const isVisible = searchPanel.classList.contains("show");
            
            if (isVisible) {
                this.hideSearchPanel();
            } else {
                // Show panel
                searchPanel.style.display = "block";
                // Force reflow to ensure animation plays
                searchPanel.offsetHeight;
                searchPanel.classList.add("show");
                
                // Update button state
                if (searchBtn) {
                    searchBtn.classList.add("active");
                }
                
                if (searchInput) {
                    searchInput.focus();
                }
            }
        }
    },

    /**
     * Handle search input with debouncing
     * Source: popup.js lines 3405-3415
     */
    handleSearchInput(e) {
        const query = e.target.value.trim();
        
        if (this._searchDebounceTimer) {
            clearTimeout(this._searchDebounceTimer);
        }
        
        this._searchDebounceTimer = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    },

    /**
     * Perform search and update display
     * Source: popup.js lines 3417-3423
     */
    performSearch(query) {
        this._currentSearchQuery = query;
        
        // Update search button state
        this.updateSearchButtonState();
        
        if (window.transcriptData && window.transcriptData.messages) {
            if (window.TranscriptManager) {
                window.TranscriptManager.displayTranscript(window.transcriptData);
                this.updateSearchResults();
            }
        }
        
        // Save filter state
        this.saveFilterState();
    },

    /**
     * Clear search and hide search panel
     * Source: popup.js lines 3432-3454
     */
    clearSearch() {
        const searchInput = document.getElementById("searchInput");
        const searchPanel = document.getElementById("searchPanel");
        const searchBtn = document.getElementById("searchBtn");
        
        if (searchInput) {
            searchInput.value = "";
        }
        
        if (searchPanel) {
            searchPanel.classList.remove("show");
            searchPanel.style.display = "none";
        }
        
        // Remove active state from search button
        if (searchBtn) {
            searchBtn.classList.remove("active");
        }
        
        if (this._searchDebounceTimer) {
            clearTimeout(this._searchDebounceTimer);
            this._searchDebounceTimer = null;
        }
        
        this._currentSearchQuery = "";
        
        // Update search button state
        this.updateSearchButtonState();
        
        if (window.transcriptData && window.transcriptData.messages) {
            if (window.TranscriptManager) {
                window.TranscriptManager.displayTranscript(window.transcriptData);
                this.updateSearchResults();
            }
        }
        
        // Save filter state
        this.saveFilterState();
    },

    /**
     * Reset search state
     * Source: popup.js lines 3456-3475
     */
    resetSearch() {
        const searchInput = document.getElementById("searchInput");
        const searchPanel = document.getElementById("searchPanel");
        const searchBtn = document.getElementById("searchBtn");
        
        if (searchInput) {
            searchInput.value = "";
        }
        
        if (searchPanel) {
            searchPanel.classList.remove("show");
            searchPanel.style.display = "none";
        }
        
        // Remove active state from search button
        if (searchBtn) {
            searchBtn.classList.remove("active");
        }
        
        if (this._searchDebounceTimer) {
            clearTimeout(this._searchDebounceTimer);
            this._searchDebounceTimer = null;
        }
        
        this._currentSearchQuery = "";
        this._originalMessages = [];
        
        // Update search button state
        this.updateSearchButtonState();
    },

    /**
     * Initialize participant filters
     * Source: popup.js lines 3478-3508
     */
    initializeFilters() {
        const filterBtn = document.getElementById('filterBtn');
        const filterDropdown = document.getElementById('filterDropdown');
        
        if (!filterBtn || !filterDropdown) {
            console.error('Filter elements not found');
            return;
        }
        
        // Toggle filter dropdown
        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFilterDropdown();
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!filterDropdown.contains(e.target) && !filterBtn.contains(e.target)) {
                filterDropdown.style.display = 'none';
                filterBtn.classList.remove('active');
            }
        });
        
        // Setup "All participants" checkbox
        const allParticipantsCheckbox = document.getElementById('allParticipantsCheckbox');
        if (allParticipantsCheckbox) {
            allParticipantsCheckbox.addEventListener('change', (e) => this.handleAllParticipantsChange(e));
        }
        
        console.log('Filters initialized');
    },

    /**
     * Toggle filter dropdown visibility
     * Source: popup.js lines 3510-3536
     */
    toggleFilterDropdown() {
        const filterBtn = document.getElementById('filterBtn');
        const filterDropdown = document.getElementById('filterDropdown');
        
        if (!filterBtn || !filterDropdown) return;
        
        const isVisible = filterDropdown.style.display === 'block';
        
        if (isVisible) {
            // Add fade out animation
            filterDropdown.style.animation = 'filterDropdownSlideOut 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards';
            setTimeout(() => {
                filterDropdown.style.display = 'none';
                filterDropdown.style.animation = '';
            }, 200);
            filterBtn.classList.remove('active');
        } else {
            // Update participants list before showing
            this.updateParticipantFiltersList();
            filterDropdown.style.display = 'block';
            filterDropdown.style.animation = 'filterDropdownSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
            // Only add active class if there are participants to filter
            if (this._allParticipants.length > 0) {
                filterBtn.classList.add('active');
            }
        }
    },

    /**
     * Update participant filters list
     * Source: popup.js lines 3538-3638
     */
    updateParticipantFiltersList() {
        const filterParticipantsList = document.getElementById('filterParticipantsList');
        const allParticipantsCheckbox = document.getElementById('allParticipantsCheckbox');
        
        if (!filterParticipantsList || !window.transcriptData || !window.transcriptData.messages) {
            return;
        }
        
        // Get unique participants
        const participantsSet = new Set();
        window.transcriptData.messages.forEach(message => {
            if (message.speaker && message.speaker !== 'Nieznany') {
                participantsSet.add(message.speaker);
            }
        });
        
        const previousParticipants = new Set(this._allParticipants);
        this._allParticipants = Array.from(participantsSet).sort();
        
        // Auto-select new participants during recording
        const isRealtimeMode = window.realtimeMode || false;
        if (isRealtimeMode) {
            this._allParticipants.forEach(participant => {
                if (!previousParticipants.has(participant)) {
                    // New participant - auto-select during recording
                    this._activeParticipantFilters.add(participant);
                }
            });
        }
        
        // Clear existing list
        filterParticipantsList.innerHTML = '';
        
        if (this._allParticipants.length === 0) {
            filterParticipantsList.innerHTML = '<div class="no-participants">Brak uczestników</div>';
            this.updateFilterBadge(); // Ensure filter button visual state is updated for empty sessions
            return;
        }
        
        // Get speaker colors for consistency
        const speakerColors = window.TranscriptManager ? 
            window.TranscriptManager.getSpeakerColorMap(window.transcriptData.messages) : 
            this._getSpeakerColorMap(window.transcriptData.messages);
        
        // If no filters are set, initialize with all participants (only on first load, not restoration)
        if (this._activeParticipantFilters.size === 0 && !this._hasBeenInitialized) {
            this._allParticipants.forEach(participant => {
                this._activeParticipantFilters.add(participant);
            });
            if (allParticipantsCheckbox) {
                allParticipantsCheckbox.checked = true;
            }
        }
        
        // Create participant filter items matching participants modal style
        this._allParticipants.forEach(participant => {
            const filterItem = document.createElement('div');
            filterItem.className = 'filter-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `filter-${participant.replace(/\s/g, '-')}`;
            checkbox.value = participant;
            checkbox.checked = this._activeParticipantFilters.has(participant);
            checkbox.addEventListener('change', (e) => this.handleParticipantFilterChange(e));
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.className = 'filter-item-content';
            
            // Create avatar
            const avatar = document.createElement('div');
            avatar.className = 'filter-participant-avatar';
            const colorIndex = speakerColors.get(participant) || 1;
            avatar.classList.add(`color-${colorIndex}`);
            avatar.textContent = participant.charAt(0).toUpperCase();
            
            // Create name
            const name = document.createElement('span');
            name.className = 'filter-participant-name';
            name.textContent = participant;
            
            // Create checkbox wrapper
            const checkboxWrapper = document.createElement('div');
            checkboxWrapper.className = 'filter-checkbox-wrapper';
            
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'filter-checkbox';
            
            checkboxWrapper.appendChild(checkboxDiv);
            
            label.appendChild(avatar);
            label.appendChild(name);
            label.appendChild(checkboxWrapper);
            
            filterItem.appendChild(checkbox);
            filterItem.appendChild(label);
            
            filterParticipantsList.appendChild(filterItem);
        });
        
        // Update "All participants" checkbox based on actual state
        if (allParticipantsCheckbox) {
            const allSelected = this._allParticipants.length > 0 && 
                               this._allParticipants.every(p => this._activeParticipantFilters.has(p));
            allParticipantsCheckbox.checked = allSelected;
        }
        
        // Update filter badge
        this.updateFilterBadge();
    },

    /**
     * Handle "All participants" checkbox change
     * Source: popup.js lines 3640-3663
     */
    handleAllParticipantsChange(event) {
        const isChecked = event.target.checked;
        const participantCheckboxes = document.querySelectorAll('#filterParticipantsList input[type="checkbox"]');
        
        this._activeParticipantFilters.clear();
        
        if (isChecked) {
            // Select all participants
            this._allParticipants.forEach(participant => {
                this._activeParticipantFilters.add(participant);
            });
            participantCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
        } else {
            // Deselect all participants
            participantCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        }
        
        this.updateFilterBadge();
        this.applyParticipantFilters();
        
        // Save filter state
        this.saveFilterState();
    },

    /**
     * Handle individual participant filter change
     * Source: popup.js lines 3665-3685
     */
    handleParticipantFilterChange(event) {
        const participant = event.target.value;
        const isChecked = event.target.checked;
        const allParticipantsCheckbox = document.getElementById('allParticipantsCheckbox');
        
        if (isChecked) {
            this._activeParticipantFilters.add(participant);
        } else {
            this._activeParticipantFilters.delete(participant);
        }
        
        // Update "All participants" checkbox
        if (allParticipantsCheckbox) {
            const allSelected = this._allParticipants.length > 0 && 
                               this._allParticipants.every(p => this._activeParticipantFilters.has(p));
            allParticipantsCheckbox.checked = allSelected;
        }
        
        this.updateFilterBadge();
        this.applyParticipantFilters();
        
        // Save filter state
        this.saveFilterState();
    },

    /**
     * Update filter badge display
     * Source: popup.js lines 3687-3724
     */
    updateFilterBadge() {
        const filterBtn = document.getElementById('filterBtn');
        if (!filterBtn) return;
        
        // Remove existing badge
        const existingBadge = filterBtn.querySelector('.filter-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Remove active classes
        filterBtn.classList.remove('has-filters', 'filter-active');
        
        // Add badge based on filter state
        if (this._allParticipants.length > 0) {
            if (this._allParticipants.length > 0 && this._activeParticipantFilters.size === 0) {
                // No participants selected - show "0"
                const badge = document.createElement('span');
                badge.className = 'filter-badge';
                badge.textContent = '0';
                filterBtn.appendChild(badge);
                filterBtn.classList.add('filter-active');
            } else if (this._activeParticipantFilters.size < this._allParticipants.length) {
                // Some participants selected - show count of selected
                const badge = document.createElement('span');
                badge.className = 'filter-badge';
                badge.textContent = this._activeParticipantFilters.size;
                filterBtn.appendChild(badge);
                filterBtn.classList.add('filter-active');
            } else {
                // All participants selected (no filtering) - neutral appearance
                filterBtn.classList.remove('filter-active');
            }
        } else {
            // Empty session - remove active state for neutral appearance
            filterBtn.classList.remove('active', 'filter-active');
        }
    },

    /**
     * Apply participant filters to transcript display
     * Source: popup.js lines 3726-3730
     */
    applyParticipantFilters() {
        if (window.transcriptData && window.transcriptData.messages) {
            if (window.TranscriptManager) {
                window.TranscriptManager.displayTranscript(window.transcriptData);
            }
        }
    },

    /**
     * Reset participant filters
     * Source: popup.js lines 3732-3758
     */
    resetParticipantFilters() {
        this._activeParticipantFilters.clear();
        this._allParticipants = [];
        this._hasBeenInitialized = false; // Reset initialization flag for new sessions
        
        const filterBtn = document.getElementById('filterBtn');
        const filterDropdown = document.getElementById('filterDropdown');
        const allParticipantsCheckbox = document.getElementById('allParticipantsCheckbox');
        
        if (filterBtn) {
            filterBtn.classList.remove('active', 'has-filters', 'filter-active');
            const badge = filterBtn.querySelector('.filter-badge');
            if (badge) badge.remove();
        }
        
        if (filterDropdown) {
            filterDropdown.style.display = 'none';
        }
        
        if (allParticipantsCheckbox) {
            allParticipantsCheckbox.checked = true;
        }
        
        const filterParticipantsList = document.getElementById('filterParticipantsList');
        if (filterParticipantsList) {
            filterParticipantsList.innerHTML = '';
        }
    },

    /**
     * Apply all filters (participant and search) to messages
     * Used by TranscriptManager.displayTranscript()
     */
    applyFilters(messages) {
        let filteredMessages = messages;
        
        // Apply participant filters first
        const isRealtimeMode = window.realtimeMode || false;
        if (isRealtimeMode && this._allParticipants.length === 0) {
            // Active recording with no participants yet - show all messages
            // (no filtering needed, let new messages appear)
        } else if (this._activeParticipantFilters.size === 0 && this._allParticipants.length > 0) {
            // No participants selected (but participants exist) - show no messages
            filteredMessages = [];
        } else if (this._activeParticipantFilters.size < this._allParticipants.length) {
            // Some participants selected - show only their messages
            filteredMessages = filteredMessages.filter(entry => 
                this._activeParticipantFilters.has(entry.speaker)
            );
        }
        // If activeParticipantFilters.size === allParticipants.length, show all messages (no filtering needed)
        
        // Then apply search filter
        if (this._currentSearchQuery) {
            filteredMessages = filteredMessages.filter(entry => 
                entry.text.toLowerCase().includes(this._currentSearchQuery.toLowerCase()) ||
                entry.speaker.toLowerCase().includes(this._currentSearchQuery.toLowerCase())
            );
        }

        return filteredMessages;
    },

    /**
     * Check if a message should be shown based on current filters
     * Used by TranscriptManager for incremental updates
     */
    shouldShowMessage(message) {
        // Apply participant filter
        const isRealtimeMode = window.realtimeMode || false;
        let shouldShow = true;
        
        if (isRealtimeMode && this._allParticipants.length === 0) {
            // Active recording with no participants yet - show all messages
        } else if (this._activeParticipantFilters.size === 0 && this._allParticipants.length > 0) {
            shouldShow = false;
        } else if (this._activeParticipantFilters.size < this._allParticipants.length) {
            shouldShow = this._activeParticipantFilters.has(message.speaker);
        }
        
        // Apply search filter
        if (shouldShow && this._currentSearchQuery) {
            shouldShow = message.text.toLowerCase().includes(this._currentSearchQuery.toLowerCase()) ||
                        message.speaker.toLowerCase().includes(this._currentSearchQuery.toLowerCase());
        }
        
        return shouldShow;
    },

    /**
     * Getter methods for accessing internal state
     */
    getCurrentSearchQuery() {
        return this._currentSearchQuery;
    },

    getActiveParticipantFilters() {
        return this._activeParticipantFilters;
    },

    getAllParticipants() {
        return this._allParticipants;
    },

    setOriginalMessages(messages) {
        this._originalMessages = messages;
    },

    getOriginalMessages() {
        return this._originalMessages;
    },

    /**
     * Fallback speaker color mapping if TranscriptManager not available
     */
    _getSpeakerColorMap(messages) {
        const speakerColors = new Map();
        let colorIndex = 1;
        
        // Get unique speakers and assign colors consistently
        const speakers = [...new Set(messages.map(msg => msg.speaker))].sort();
        speakers.forEach(speaker => {
            speakerColors.set(speaker, colorIndex);
            colorIndex = (colorIndex % 6) + 1;
        });
        
        return speakerColors;
    },

    /**
     * Update search results counter and display
     */
    updateSearchResults() {
        const searchResultsInfo = document.getElementById("searchResultsInfo");
        const searchResultsCount = document.getElementById("searchResultsCount");
        
        if (!searchResultsInfo || !searchResultsCount) return;
        
        if (this._currentSearchQuery) {
            // Count filtered messages
            const filteredMessages = this.applyFilters(window.transcriptData.messages || []);
            const resultCount = filteredMessages.length;
            
            searchResultsCount.textContent = resultCount;
            searchResultsInfo.style.display = "block";
            
            // Show clear button if there's a search query
            const clearButton = document.getElementById("searchClearBtn");
            if (clearButton) {
                clearButton.classList.add("show");
            }
        } else {
            searchResultsInfo.style.display = "none";
            
            // Hide clear button when no search
            const clearButton = document.getElementById("searchClearBtn");
            if (clearButton) {
                clearButton.classList.remove("show");
            }
        }
    },

    /**
     * Update search button visual state
     */
    updateSearchButtonState() {
        const searchBtn = document.getElementById("searchBtn");
        if (!searchBtn) return;
        
        // Remove existing badge
        const existingBadge = searchBtn.querySelector('.search-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        if (this._currentSearchQuery) {
            searchBtn.classList.add("search-active");
            
            // Add badge to indicate active search
            const badge = document.createElement('span');
            badge.className = 'search-badge';
            searchBtn.appendChild(badge);
        } else {
            searchBtn.classList.remove("search-active");
        }
    },

    /**
     * Save current filter state to storage
     */
    async saveFilterState() {
        try {
            if (this._saveTimeout) {
                clearTimeout(this._saveTimeout);
            }
            
            // Debounce saves to avoid too frequent storage writes
            this._saveTimeout = setTimeout(async () => {
                const filterState = {
                    searchQuery: this._currentSearchQuery,
                    activeParticipantFilters: Array.from(this._activeParticipantFilters)
                };
                
                if (window.StateManager && window.StateManager.saveUIState) {
                    await window.StateManager.saveUIState(filterState);
                    console.log('💾 [SEARCH] Filter state saved:', filterState);
                }
            }, 500); // 500ms debounce
        } catch (error) {
            console.error('💾 [SEARCH ERROR] Failed to save filter state:', error);
        }
    },

    /**
     * Restore filter state from storage
     */
    async restoreFilterState(uiState) {
        try {
            if (!uiState) return;
            
            console.log('🔄 [SEARCH] Restoring filter state:', uiState);
            
            // Restore search query immediately
            if (uiState.searchQuery) {
                this._currentSearchQuery = uiState.searchQuery;
                const searchInput = document.getElementById("searchInput");
                if (searchInput) {
                    searchInput.value = uiState.searchQuery;
                }
                this.updateSearchButtonState();
                
                // Only update search results if transcript data is available
                if (window.transcriptData && window.transcriptData.messages) {
                    this.updateSearchResults();
                }
            }
            
            // Restore participant filters
            if (uiState.activeParticipantFilters && Array.isArray(uiState.activeParticipantFilters)) {
                this._activeParticipantFilters = new Set(uiState.activeParticipantFilters);
                this._hasBeenInitialized = true; // Mark as initialized from storage to prevent auto-selection
                
                // Update participant list UI if transcript data is available
                if (window.transcriptData && window.transcriptData.messages) {
                    this.updateParticipantFiltersList();
                    this.updateFilterBadge();
                } else {
                    // Store state for later restoration when transcript data becomes available
                    this._pendingRestoreState = uiState;
                    console.log('⏳ [SEARCH] Participant filters stored for later restoration - waiting for transcript data');
                }
            }
            
            console.log('✅ [SEARCH] Filter state restored successfully');
        } catch (error) {
            console.error('🔄 [SEARCH ERROR] Failed to restore filter state:', error);
        }
    },

    /**
     * Complete pending filter restoration when transcript data becomes available
     */
    completePendingRestoration() {
        if (this._pendingRestoreState && window.transcriptData && window.transcriptData.messages) {
            console.log('🔄 [SEARCH] Completing pending filter restoration with transcript data');
            
            // Ensure we're marked as initialized to preserve restored filters
            this._hasBeenInitialized = true;
            
            // Update participant filters UI now that we have transcript data
            this.updateParticipantFiltersList();
            this.updateFilterBadge();
            
            // Apply filters to transcript display
            if (window.TranscriptManager) {
                window.TranscriptManager.displayTranscript(window.transcriptData);
            }
            
            // Clear pending state
            this._pendingRestoreState = null;
            console.log('✅ [SEARCH] Pending filter restoration completed');
        }
    },

    /**
     * Initialize SearchFilterManager module
     */
    initialize() {
        console.log('🔍 [SEARCH] SearchFilterManager initialized');
        this.initializeSearch();
        this.initializeFilters();
        
        // Set up global aliases for backward compatibility
        this.setupGlobalAliases();
    },

    /**
     * Set up global function aliases for backward compatibility
     * This fixes the critical bug where other modules expect global functions
     */
    setupGlobalAliases() {
        // Critical fix: Expose search/filter functions globally as expected by other modules
        window.resetSearch = this.resetSearch.bind(this);
        window.resetParticipantFilters = this.resetParticipantFilters.bind(this);
        
        console.log('🔗 [SEARCH] Global search function aliases created for backward compatibility');
    }
};