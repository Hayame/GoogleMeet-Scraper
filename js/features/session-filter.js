/**
 * Session Filter Module
 * Provides date range and participant filtering for session history
 */
window.SessionFilterManager = {
    _dateFrom: '',
    _dateTo: '',
    _selectedParticipants: new Set(),
    _allParticipants: [],

    initialize() {
        const filterBtn = document.getElementById('sessionFilterBtn');
        const filterDropdown = document.getElementById('sessionFilterDropdown');

        if (!filterBtn || !filterDropdown) {
            console.error('[SESSION-FILTER] Filter elements not found');
            return;
        }

        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggleDropdown();
        });

        document.addEventListener('click', (e) => {
            if (!filterDropdown.contains(e.target) && !filterBtn.contains(e.target)) {
                this._closeDropdown();
            }
        });

        const dateFrom = document.getElementById('sessionFilterDateFrom');
        const dateTo = document.getElementById('sessionFilterDateTo');
        if (dateFrom) dateFrom.addEventListener('change', (e) => this._handleDateChange());
        if (dateTo) dateTo.addEventListener('change', (e) => this._handleDateChange());

        const allCheckbox = document.getElementById('sessionFilterAllParticipants');
        if (allCheckbox) {
            allCheckbox.addEventListener('change', (e) => this._handleAllParticipantsChange(e));
        }

        const clearBtn = document.getElementById('sessionFilterClearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllFilters());
        }

        const participantTrigger = document.getElementById('sessionFilterParticipantTrigger');
        if (participantTrigger) {
            participantTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this._toggleParticipantList();
            });
        }

        this.refresh();
        console.log('🔍 [SESSION-FILTER] SessionFilterManager initialized');
    },

    _toggleDropdown() {
        const filterBtn = document.getElementById('sessionFilterBtn');
        const filterDropdown = document.getElementById('sessionFilterDropdown');
        if (!filterBtn || !filterDropdown) return;

        const isVisible = filterDropdown.style.display === 'block';

        if (isVisible) {
            filterDropdown.style.animation = 'sessionFilterSlideOut 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards';
            setTimeout(() => {
                filterDropdown.style.display = 'none';
                filterDropdown.style.animation = '';
            }, 200);
            filterBtn.classList.remove('active');
        } else {
            this.refresh();
            filterDropdown.style.display = 'block';
            filterDropdown.style.animation = 'sessionFilterSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
            filterBtn.classList.add('active');
        }
    },

    _closeDropdown() {
        const filterBtn = document.getElementById('sessionFilterBtn');
        const filterDropdown = document.getElementById('sessionFilterDropdown');
        if (filterDropdown && filterDropdown.style.display === 'block') {
            filterDropdown.style.animation = 'sessionFilterSlideOut 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards';
            setTimeout(() => {
                filterDropdown.style.display = 'none';
                filterDropdown.style.animation = '';
            }, 200);
        }
        if (filterBtn) filterBtn.classList.remove('active');
    },

    _toggleParticipantList() {
        const trigger = document.getElementById('sessionFilterParticipantTrigger');
        const collapsible = document.querySelector('.sf-participants-collapsible');
        if (!trigger || !collapsible) return;

        const isExpanded = trigger.classList.contains('expanded');
        if (isExpanded) {
            trigger.classList.remove('expanded');
            collapsible.classList.remove('expanded');
        } else {
            trigger.classList.add('expanded');
            collapsible.classList.add('expanded');
        }
    },

    _updateParticipantTriggerText() {
        const trigger = document.getElementById('sessionFilterParticipantTrigger');
        if (!trigger) return;

        const textEl = trigger.querySelector('.sf-participant-trigger-text');
        if (!textEl) return;

        const total = this._allParticipants.length;
        const selected = this._selectedParticipants.size;

        if (total === 0) {
            textEl.textContent = 'Brak uczestników';
        } else if (selected === 0) {
            textEl.textContent = 'Brak wybranych';
        } else if (selected === total) {
            textEl.textContent = 'Wszyscy uczestnicy';
        } else {
            textEl.textContent = `${selected} z ${total} wybranych`;
        }
    },

    _extractAllParticipants() {
        const sessions = window.sessionHistory || [];
        const participantsSet = new Set();

        for (const session of sessions) {
            if (session.participantNames && Array.isArray(session.participantNames)) {
                for (const name of session.participantNames) {
                    if (name && name !== 'Nieznany') {
                        participantsSet.add(name);
                    }
                }
            }
        }

        this._allParticipants = Array.from(participantsSet).sort();
    },

    _renderParticipantList() {
        const list = document.getElementById('sessionFilterParticipantsList');
        if (!list) return;

        list.innerHTML = '';

        if (this._allParticipants.length === 0) {
            list.innerHTML = '<div class="sf-no-participants">Brak uczestników</div>';
            this._updateParticipantTriggerText();
            return;
        }

        // Assign colors consistently
        const colorMap = new Map();
        this._allParticipants.forEach((name, i) => {
            colorMap.set(name, (i % 6) + 1);
        });

        // If no filters active, select all by default
        if (this._selectedParticipants.size === 0) {
            this._allParticipants.forEach(p => this._selectedParticipants.add(p));
        }

        for (const participant of this._allParticipants) {
            const filterItem = document.createElement('div');
            filterItem.className = 'filter-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `sf-filter-${participant.replace(/\s/g, '-')}`;
            checkbox.value = participant;
            checkbox.checked = this._selectedParticipants.has(participant);
            checkbox.addEventListener('change', (e) => this._handleParticipantChange(e));

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.className = 'filter-item-content';

            const avatar = document.createElement('div');
            avatar.className = `filter-participant-avatar color-${colorMap.get(participant) || 1}`;
            avatar.textContent = participant.charAt(0).toUpperCase();

            const name = document.createElement('span');
            name.className = 'filter-participant-name';
            name.textContent = participant;

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

            list.appendChild(filterItem);
        }

        this._updateAllCheckbox();
        this._updateParticipantTriggerText();
    },

    _handleDateChange() {
        const dateFrom = document.getElementById('sessionFilterDateFrom');
        const dateTo = document.getElementById('sessionFilterDateTo');
        this._dateFrom = dateFrom?.value || '';
        this._dateTo = dateTo?.value || '';

        // Cross-constrain: dateFrom cannot exceed dateTo and vice versa
        if (dateFrom && dateTo) {
            dateTo.min = this._dateFrom || '';
            dateFrom.max = this._dateTo || '';
        }

        // Update active indicator classes
        if (dateFrom) dateFrom.classList.toggle('sf-date-has-value', !!this._dateFrom);
        if (dateTo) dateTo.classList.toggle('sf-date-has-value', !!this._dateTo);

        this._applyAndRender();
    },

    _handleAllParticipantsChange(event) {
        const isChecked = event.target.checked;
        this._selectedParticipants.clear();

        if (isChecked) {
            this._allParticipants.forEach(p => this._selectedParticipants.add(p));
        }

        const checkboxes = document.querySelectorAll('#sessionFilterParticipantsList input[type="checkbox"]');
        checkboxes.forEach(cb => { cb.checked = isChecked; });

        this._updateParticipantTriggerText();
        this._applyAndRender();
    },

    _handleParticipantChange(event) {
        const participant = event.target.value;
        if (event.target.checked) {
            this._selectedParticipants.add(participant);
        } else {
            this._selectedParticipants.delete(participant);
        }
        this._updateAllCheckbox();
        this._updateParticipantTriggerText();
        this._applyAndRender();
    },

    _updateAllCheckbox() {
        const allCheckbox = document.getElementById('sessionFilterAllParticipants');
        if (allCheckbox && this._allParticipants.length > 0) {
            allCheckbox.checked = this._allParticipants.every(p => this._selectedParticipants.has(p));
        }
    },

    _applyAndRender() {
        this._updateFilterBadge();
        // Trigger session search re-render
        if (window.SessionSearchManager) {
            window.SessionSearchManager._performSearch();
        } else if (window.SessionUIManager?.renderSessionHistory) {
            window.SessionUIManager.renderSessionHistory();
        }
    },

    /**
     * Filter sessions by date range and participants (AND logic)
     */
    applyFilters(sessions) {
        let result = sessions;

        // Date from filter
        if (this._dateFrom) {
            const from = new Date(this._dateFrom);
            from.setHours(0, 0, 0, 0);
            result = result.filter(session => {
                const sessionDate = new Date(session.date);
                return sessionDate >= from;
            });
        }

        // Date to filter
        if (this._dateTo) {
            const to = new Date(this._dateTo);
            to.setHours(23, 59, 59, 999);
            result = result.filter(session => {
                const sessionDate = new Date(session.date);
                return sessionDate <= to;
            });
        }

        // Participant filter (only if not all selected)
        if (this._allParticipants.length > 0 &&
            this._selectedParticipants.size < this._allParticipants.length) {
            result = result.filter(session => {
                const sessionParticipants = session.participantNames || [];
                // Session must contain at least one selected participant
                return sessionParticipants.some(name => this._selectedParticipants.has(name));
            });
        }

        return result;
    },

    hasActiveFilters() {
        if (this._dateFrom || this._dateTo) return true;
        if (this._allParticipants.length > 0 &&
            this._selectedParticipants.size < this._allParticipants.length) return true;
        return false;
    },

    _updateFilterBadge() {
        const filterBtn = document.getElementById('sessionFilterBtn');
        if (!filterBtn) return;

        const existingBadge = filterBtn.querySelector('.sf-filter-badge');
        if (existingBadge) existingBadge.remove();

        filterBtn.classList.remove('sf-filter-active');

        let activeCount = 0;
        if (this._dateFrom) activeCount++;
        if (this._dateTo) activeCount++;
        if (this._allParticipants.length > 0 &&
            this._selectedParticipants.size < this._allParticipants.length) activeCount++;

        if (activeCount === 0) return;

        const badge = document.createElement('span');
        badge.className = 'sf-filter-badge';
        badge.textContent = activeCount;
        filterBtn.appendChild(badge);
        filterBtn.classList.add('sf-filter-active');
    },

    clearAllFilters() {
        this._dateFrom = '';
        this._dateTo = '';
        this._selectedParticipants.clear();
        this._allParticipants.forEach(p => this._selectedParticipants.add(p));

        const dateFrom = document.getElementById('sessionFilterDateFrom');
        const dateTo = document.getElementById('sessionFilterDateTo');
        if (dateFrom) { dateFrom.value = ''; dateFrom.max = ''; dateFrom.classList.remove('sf-date-has-value'); }
        if (dateTo) { dateTo.value = ''; dateTo.min = ''; dateTo.classList.remove('sf-date-has-value'); }

        const checkboxes = document.querySelectorAll('#sessionFilterParticipantsList input[type="checkbox"]');
        checkboxes.forEach(cb => { cb.checked = true; });

        const allCheckbox = document.getElementById('sessionFilterAllParticipants');
        if (allCheckbox) allCheckbox.checked = true;

        this._updateParticipantTriggerText();
        this._applyAndRender();
    },

    refresh() {
        this._extractAllParticipants();

        // Preserve selection: remove participants no longer present
        const validParticipants = new Set(this._allParticipants);
        for (const p of this._selectedParticipants) {
            if (!validParticipants.has(p)) {
                this._selectedParticipants.delete(p);
            }
        }

        // Add newly appeared participants
        for (const p of this._allParticipants) {
            if (!this._selectedParticipants.has(p) && !this.hasActiveFilters()) {
                this._selectedParticipants.add(p);
            }
        }

        this._renderParticipantList();
        this._updateFilterBadge();
    }
};
