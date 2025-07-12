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

    /**
     * Initialize search functionality
     * Source: popup.js lines 3364-3385
     */
    initializeSearch() {
        const searchToggle = document.getElementById("searchToggle");
        const searchInput = document.getElementById("searchInput");
        const clearSearchBtn = document.getElementById("clearSearchBtn");
        
        if (searchToggle) {
            searchToggle.addEventListener("click", () => this.toggleSearchPanel());
        }
        
        if (searchInput) {
            searchInput.addEventListener("input", (e) => this.handleSearchInput(e));
            searchInput.addEventListener("keydown", (e) => {
                if (e.key === "Escape") {
                    this.clearSearch();
                }
            });
        }
        
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener("click", () => this.clearSearch());
        }
    },

    /**
     * Toggle search panel visibility
     * Source: popup.js lines 3387-3403
     */
    toggleSearchPanel() {
        const searchPanel = document.getElementById("searchPanel");
        const searchInput = document.getElementById("searchInput");
        
        if (searchPanel) {
            const isVisible = searchPanel.style.display === "block";
            searchPanel.style.display = isVisible ? "none" : "block";
            
            if (!isVisible && searchInput) {
                searchInput.focus();
            }
            
            if (isVisible) {
                this.clearSearch();
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
        
        if (window.transcriptData && window.transcriptData.messages) {
            if (window.TranscriptManager) {
                window.TranscriptManager.displayTranscript(window.transcriptData);
            }
        }
    },

    /**
     * Clear search and hide search panel
     * Source: popup.js lines 3432-3454
     */
    clearSearch() {
        const searchInput = document.getElementById("searchInput");
        const searchPanel = document.getElementById("searchPanel");
        
        if (searchInput) {
            searchInput.value = "";
        }
        
        if (searchPanel) {
            searchPanel.style.display = "none";
        }
        
        if (this._searchDebounceTimer) {
            clearTimeout(this._searchDebounceTimer);
            this._searchDebounceTimer = null;
        }
        
        this._currentSearchQuery = "";
        
        if (window.transcriptData && window.transcriptData.messages) {
            if (window.TranscriptManager) {
                window.TranscriptManager.displayTranscript(window.transcriptData);
            }
        }
    },

    /**
     * Reset search state
     * Source: popup.js lines 3456-3475
     */
    resetSearch() {
        const searchInput = document.getElementById("searchInput");
        const searchPanel = document.getElementById("searchPanel");
        
        if (searchInput) {
            searchInput.value = "";
        }
        
        if (searchPanel) {
            searchPanel.style.display = "none";
        }
        
        if (this._searchDebounceTimer) {
            clearTimeout(this._searchDebounceTimer);
            this._searchDebounceTimer = null;
        }
        
        this._currentSearchQuery = "";
        this._originalMessages = [];
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
        
        // If no filters are set, initialize with all participants
        if (this._activeParticipantFilters.size === 0) {
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
     * Initialize SearchFilterManager module
     */
    initialize() {
        console.log('🔍 [SEARCH] SearchFilterManager initialized');
        this.initializeSearch();
        this.initializeFilters();
    }
};