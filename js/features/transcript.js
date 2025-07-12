/**
 * Transcript Display and Management Module
 * 
 * Extracted from popup.js lines 1051-1468
 * Handles transcript display, message creation, and transcript statistics
 */

window.TranscriptManager = {
    
    /**
     * Display transcript with optional incremental updates
     * Source: popup.js lines 1051-1178
     */
    displayTranscript(data, changes = null) {
        const previewDiv = document.getElementById('transcriptContent');
        if (!previewDiv) {
            console.error('Transcript content div not found');
            return;
        }
        
        // Determine if we should do incremental update
        const hasChanges = changes && (changes.added.length > 0 || changes.updated.length > 0 || changes.removed.length > 0);
        const hasEmptyMessage = previewDiv.querySelector('.empty-transcript');
        const shouldIncrementalUpdate = hasChanges && previewDiv.children.length > 0 && !hasEmptyMessage;
        
        console.log('🔍 [DEBUG] displayTranscript update decision:', {
            hasChanges,
            hasChildren: previewDiv.children.length > 0,
            hasEmptyMessage: !!hasEmptyMessage,
            shouldIncrementalUpdate
        });
        
        if (!shouldIncrementalUpdate) {
            previewDiv.innerHTML = '';
        }

        const dataToDisplay = data.messages || [];
        
        // Store original messages for search functionality
        if (window.SearchFilterManager) {
            window.SearchFilterManager.setOriginalMessages(dataToDisplay);
        }
        
        if (!data || dataToDisplay.length === 0) {
            previewDiv.innerHTML = `
                <div class="empty-transcript">
                    <svg class="empty-icon" width="48" height="48" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                    </svg>
                    <p>Brak transkrypcji</p>
                    <p class="empty-subtitle">Rozpocznij nagrywanie, aby zobaczyć transkrypcję</p>
                </div>`;
            return;
        }

        let messagesToDisplay = dataToDisplay;
        
        // Apply participant filters first (delegate to SearchFilterManager)
        if (window.SearchFilterManager) {
            messagesToDisplay = window.SearchFilterManager.applyFilters(messagesToDisplay);
        }

        // Check if no messages after filtering
        if (messagesToDisplay.length === 0) {
            this._showEmptyState(previewDiv);
            return;
        }

        // Use shared color mapping function
        const speakerColors = this.getSpeakerColorMap(messagesToDisplay);

        // Handle incremental updates if we have changes
        if (shouldIncrementalUpdate) {
            this.handleIncrementalUpdate(changes, messagesToDisplay, speakerColors, previewDiv);
            return;
        }

        // Full render - show all entries
        const entriesToShow = messagesToDisplay;
        entriesToShow.forEach((entry, index) => {
            const entryDiv = this.createMessageElement(entry, speakerColors);
            previewDiv.appendChild(entryDiv);
            
            // Animate entry appearance
            setTimeout(() => {
                entryDiv.style.transition = 'all 0.3s ease';
                entryDiv.style.opacity = '1';
                entryDiv.style.transform = 'translateY(0)';
            }, index * 50); // Stagger animation
        });

        // Reinitialize enhanced interactions for new elements
        this.reinitializeEnhancedInteractions();
    },

    /**
     * Handle incremental updates for better performance with long conversations
     * Source: popup.js lines 1181-1272
     */
    handleIncrementalUpdate(changes, messagesToDisplay, speakerColors, previewDiv) {
        console.log('🔄 Incremental update:', {
            added: changes.added.length,
            updated: changes.updated.length,
            removed: changes.removed.length
        });
        
        // Debug: log samples
        if (changes.updated.length > 0) {
            console.log('🔄 [DEBUG] Updated messages sample:', changes.updated.slice(0, 2).map(m => ({
                index: m.index,
                speaker: m.speaker,
                newText: m.text.substring(0, 30),
                prevText: m.previousText?.substring(0, 30)
            })));
        }
        
        // Remove deleted messages
        changes.removed.forEach(removedMessage => {
            const existingElement = previewDiv.querySelector(`[data-message-hash="${removedMessage.hash}"]`);
            if (existingElement) {
                existingElement.remove();
            }
        });
        
        // Update existing messages
        changes.updated.forEach((updatedMessage, updateIndex) => {
            // Find existing element by position (index) since hash may have changed
            const messageIndex = updatedMessage.index;
            const allMessageElements = previewDiv.querySelectorAll('.transcript-entry');
            
            console.log(`🔄 [DEBUG] Processing update ${updateIndex}:`, {
                messageIndex,
                totalElements: allMessageElements.length,
                hasIndex: messageIndex !== undefined,
                speaker: updatedMessage.speaker,
                newText: updatedMessage.text.substring(0, 30)
            });
            
            if (messageIndex !== undefined && messageIndex < allMessageElements.length) {
                const existingElement = allMessageElements[messageIndex];
                // Update the element with new content
                this.updateMessageElement(existingElement, updatedMessage, speakerColors);
                // Update hash for future lookups
                existingElement.setAttribute('data-message-hash', updatedMessage.hash);
                console.log(`🔄 ✅ Updated message element at position ${messageIndex}:`, updatedMessage.speaker, updatedMessage.text.substring(0, 30));
            } else {
                console.warn(`🔄 ❌ Could not find message element at position ${messageIndex} for update (total elements: ${allMessageElements.length})`);
            }
        });
        
        // Add new messages
        changes.added.forEach((newMessage, index) => {
            // Apply filters to check if message should be displayed
            let shouldShow = true;
            
            if (window.SearchFilterManager) {
                shouldShow = window.SearchFilterManager.shouldShowMessage(newMessage);
            }
            
            if (shouldShow) {
                const entryDiv = this.createMessageElement(newMessage, speakerColors);
                previewDiv.appendChild(entryDiv);
                
                // Animate new entry
                setTimeout(() => {
                    entryDiv.style.transition = 'all 0.3s ease';
                    entryDiv.style.opacity = '1';
                    entryDiv.style.transform = 'translateY(0)';
                }, index * 50);
            }
        });
        
        // Scroll to bottom if new messages were added
        if (changes.added.length > 0) {
            previewDiv.scrollTop = previewDiv.scrollHeight;
        }
        
        // Reinitialize enhanced interactions for new elements
        this.reinitializeEnhancedInteractions();
    },

    /**
     * Create a message element (extracted from displayTranscript for reuse)
     * Source: popup.js lines 1275-1393
     */
    createMessageElement(entry, speakerColors) {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'transcript-entry';
        entryDiv.setAttribute('data-message-hash', entry.hash);
        
        // Avatar
        const avatarDiv = document.createElement('div');
        avatarDiv.className = `avatar color-${speakerColors.get(entry.speaker)}`;
        avatarDiv.textContent = entry.speaker.charAt(0).toUpperCase();
        
        // Message content container
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-content';
        
        // Message header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        
        const speakerSpan = document.createElement('span');
        speakerSpan.className = 'speaker-name';
        speakerSpan.textContent = entry.speaker;
        
        headerDiv.appendChild(speakerSpan);
        
        if (entry.timestamp) {
            const timestampSpan = document.createElement('span');
            timestampSpan.className = 'timestamp';
            timestampSpan.textContent = entry.timestamp;
            headerDiv.appendChild(timestampSpan);
        }
        
        // Message bubble wrapper (this provides the chat bubble styling)
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        
        const textP = document.createElement('p');
        textP.className = 'transcript-text';
        
        // Check if text is long enough to need collapsing
        const isLongText = entry.text.length > 200;
        
        if (isLongText) {
            this._createExpandableText(textP, bubbleDiv, entry);
        } else {
            // Short text - just add it directly
            const searchQuery = window.SearchFilterManager ? window.SearchFilterManager.getCurrentSearchQuery() : '';
            textP.innerHTML = searchQuery ? this.highlightText(entry.text, searchQuery) : entry.text;
        }
        
        bubbleDiv.appendChild(textP);
        messageDiv.appendChild(headerDiv);
        messageDiv.appendChild(bubbleDiv);
        
        entryDiv.appendChild(avatarDiv);
        entryDiv.appendChild(messageDiv);
        
        // Add fade-in animation for new entries
        entryDiv.style.opacity = '0';
        entryDiv.style.transform = 'translateY(20px)';
        
        return entryDiv;
    },

    /**
     * Create expandable text with show more/less functionality
     * Source: popup.js lines 1317-1375
     */
    _createExpandableText(textP, bubbleDiv, entry) {
        // Generate unique entry ID
        const entryId = this.generateEntryId(entry);
        const isExpanded = this._isEntryExpanded(entryId);
        
        const shortText = entry.text.substring(0, 200);
        const fullText = entry.text;
        const searchQuery = window.SearchFilterManager ? window.SearchFilterManager.getCurrentSearchQuery() : '';
        
        // Create collapsed version
        const collapsedSpan = document.createElement('span');
        collapsedSpan.className = 'text-collapsed';
        collapsedSpan.innerHTML = searchQuery ? this.highlightText(shortText + '...', searchQuery) : shortText + '...';
        collapsedSpan.style.display = isExpanded ? 'none' : 'inline';
        
        // Create full version 
        const expandedSpan = document.createElement('span');
        expandedSpan.className = 'text-expanded';
        expandedSpan.innerHTML = searchQuery ? this.highlightText(fullText, searchQuery) : fullText;
        expandedSpan.style.display = isExpanded ? 'inline' : 'none';
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'expand-collapse-container';
        
        // Create expand button
        const expandBtn = document.createElement('button');
        expandBtn.className = 'expand-btn';
        expandBtn.textContent = 'Więcej';
        expandBtn.style.display = isExpanded ? 'none' : 'inline-block';
        expandBtn.onclick = () => {
            collapsedSpan.style.display = 'none';
            expandedSpan.style.display = 'inline';
            expandBtn.style.display = 'none';
            collapseBtn.style.display = 'inline-block';
            this._setEntryExpanded(entryId, true);
        };
        
        // Create collapse button
        const collapseBtn = document.createElement('button');
        collapseBtn.className = 'collapse-btn';
        collapseBtn.textContent = 'Mniej';
        collapseBtn.style.display = isExpanded ? 'inline-block' : 'none';
        collapseBtn.onclick = () => {
            collapsedSpan.style.display = 'inline';
            expandedSpan.style.display = 'none';
            expandBtn.style.display = 'inline-block';
            collapseBtn.style.display = 'none';
            this._setEntryExpanded(entryId, false);
        };
        
        // Add elements to text paragraph
        textP.appendChild(collapsedSpan);
        textP.appendChild(expandedSpan);
        
        // Add button container to bubble
        buttonContainer.appendChild(expandBtn);
        buttonContainer.appendChild(collapseBtn);
        bubbleDiv.appendChild(buttonContainer);
    },

    /**
     * Update existing message element
     * Source: popup.js lines 1396-1429
     */
    updateMessageElement(element, message, speakerColors) {
        const textP = element.querySelector('.transcript-text');
        const timestampSpan = element.querySelector('.timestamp');
        
        if (textP) {
            // Check if this is a long text message with expand/collapse
            const isLongText = message.text.length > 200;
            const searchQuery = window.SearchFilterManager ? window.SearchFilterManager.getCurrentSearchQuery() : '';
            
            if (isLongText) {
                // For long messages, we need to update the collapsed and expanded spans
                const collapsedSpan = textP.querySelector('.text-collapsed');
                const expandedSpan = textP.querySelector('.text-expanded');
                
                if (collapsedSpan && expandedSpan) {
                    const shortText = message.text.substring(0, 200);
                    const fullText = message.text;
                    
                    collapsedSpan.innerHTML = searchQuery ? this.highlightText(shortText + '...', searchQuery) : shortText + '...';
                    expandedSpan.innerHTML = searchQuery ? this.highlightText(fullText, searchQuery) : fullText;
                }
            } else {
                // For short messages, update directly
                if (searchQuery) {
                    textP.innerHTML = this.highlightText(message.text, searchQuery);
                } else {
                    textP.textContent = message.text;
                }
            }
        }
        
        if (timestampSpan) {
            timestampSpan.textContent = message.timestamp || '';
        }
    },

    /**
     * Update transcript statistics
     * Source: popup.js lines 1435-1468
     */
    updateStats(data) {
        const statsDiv = document.getElementById('transcriptStats');
        const entryCountSpan = document.getElementById('entryCount');
        const participantCountSpan = document.getElementById('participantCount');
        const durationSpan = document.getElementById('duration');

        if (!statsDiv || !entryCountSpan || !participantCountSpan || !durationSpan) {
            console.error('Stats elements not found');
            return;
        }

        if (!data || !data.messages) {
            console.error('Invalid data provided to updateStats');
            return;
        }

        // Simplified: just use all messages from data
        const uniqueParticipants = new Set(data.messages.map(m => m.speaker)).size;

        // Update stats with all data
        entryCountSpan.textContent = data.messages.length;
        participantCountSpan.textContent = uniqueParticipants;
        
        // Update participant count clickability based on count
        this.updateParticipantCountClickability(uniqueParticipants);
        
        // Duration is handled by the continuous timer for recording sessions
        // For historical sessions, duration is updated when loading session data
        
        statsDiv.style.display = 'block';
        
        // Update participant filters list
        if (window.SearchFilterManager) {
            window.SearchFilterManager.updateParticipantFiltersList();
        }
    },

    /**
     * Update participant count clickability
     * Source: popup.js lines 1470-1491
     */
    updateParticipantCountClickability(participantCount) {
        const participantCountSpan = document.getElementById('participantCount');
        if (!participantCountSpan) return;
        
        if (participantCount === 0) {
            // Remove clickable styling and disable click events
            participantCountSpan.classList.remove('stat-clickable');
            participantCountSpan.style.cursor = 'default';
            participantCountSpan.style.textDecoration = 'none';
            participantCountSpan.style.color = 'var(--text-heading)';
            participantCountSpan.title = 'Brak uczestników';
            participantCountSpan.onclick = null;
        } else {
            // Add clickable styling and enable click events
            participantCountSpan.classList.add('stat-clickable');
            participantCountSpan.style.cursor = 'pointer';
            participantCountSpan.style.textDecoration = 'underline';
            participantCountSpan.style.color = 'var(--btn-primary-bg)';
            participantCountSpan.title = 'Kliknij aby zobaczyć listę uczestników';
            // The click handler will be added by initializeMainParticipantsClick()
        }
    },

    /**
     * Show appropriate empty state message
     * Source: popup.js lines 1117-1148
     */
    _showEmptyState(previewDiv) {
        const isRealtimeMode = window.realtimeMode || false;
        const allParticipants = window.SearchFilterManager ? window.SearchFilterManager.getAllParticipants() : [];
        const activeFilters = window.SearchFilterManager ? window.SearchFilterManager.getActiveParticipantFilters() : new Set();
        const searchQuery = window.SearchFilterManager ? window.SearchFilterManager.getCurrentSearchQuery() : '';
        
        if (isRealtimeMode && allParticipants.length === 0) {
            // Active recording but no participants yet
            previewDiv.innerHTML = `
                <div class="empty-transcript">
                    <svg class="empty-icon" width="48" height="48" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <p>Nagrywanie w toku...</p>
                    <p class="empty-subtitle">Czekam na pierwsze wypowiedzi uczestników</p>
                </div>`;
        } else if (activeFilters.size === 0 && allParticipants.length > 0) {
            // No participants selected (but participants exist)
            previewDiv.innerHTML = `
                <div class="empty-transcript">
                    <svg class="empty-icon" width="48" height="48" viewBox="0 0 24 24">
                        <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-1c0-1.38 2.91-2.5 6.5-2.5s6.5 1.12 6.5 2.5v1H4zm6.5-6.5c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5S8 7.62 8 9s1.12 2.5 2.5 2.5z"/>
                    </svg>
                    <p>Nie wybrano żadnego uczestnika</p>
                    <p class="empty-subtitle">Zaznacz przynajmniej jednego uczestnika w filtrach, aby zobaczyć transkrypcję</p>
                </div>`;
        } else if (searchQuery) {
            // No messages found for search
            previewDiv.innerHTML = `
                <div class="empty-transcript">
                    <svg class="empty-icon" width="48" height="48" viewBox="0 0 24 24">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                    <p>Brak wyników wyszukiwania</p>
                    <p class="empty-subtitle">Nie znaleziono wiadomości zawierających "${searchQuery}"</p>
                </div>`;
        }
    },

    /**
     * Get speaker color mapping for consistent avatar colors
     * Source: popup.js lines 1037-1049
     */
    getSpeakerColorMap(messages) {
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
     * Generate unique entry ID for expand/collapse state tracking
     * Source: popup.js lines 1651-1661
     */
    generateEntryId(entry) {
        // Generate a simple hash based on speaker and first 100 chars of text
        const text = entry.speaker + entry.text.substring(0, 100);
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    },

    /**
     * Highlight text for search functionality
     * Source: popup.js lines 3425-3430
     */
    highlightText(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
        return text.replace(regex, "<mark class=\"highlight-search\">$1</mark>");
    },

    /**
     * Reinitialize enhanced interactions for new elements
     * Source: popup.js lines 3343-3361
     */
    reinitializeEnhancedInteractions() {
        // Re-add ripple effects to newly created buttons
        document.querySelectorAll('.btn:not([data-ripple]), .record-button:not([data-ripple])').forEach(button => {
            button.setAttribute('data-ripple', 'true');
            if (window.addRippleEffect) {
                window.addRippleEffect(button);
            }
        });
        
        // Re-add hover effects to newly created avatars
        document.querySelectorAll('.avatar:not([data-hover])').forEach(avatar => {
            avatar.setAttribute('data-hover', 'true');
            avatar.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.05)';
            });
            
            avatar.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });
        });
    },

    /**
     * Manage expanded entries state for long messages
     * Uses global expandedEntries set and chrome.storage
     */
    _isEntryExpanded(entryId) {
        return window.expandedEntries ? window.expandedEntries.has(entryId) : false;
    },

    _setEntryExpanded(entryId, expanded) {
        if (!window.expandedEntries) {
            window.expandedEntries = new Set();
        }
        
        if (expanded) {
            window.expandedEntries.add(entryId);
        } else {
            window.expandedEntries.delete(entryId);
        }
        
        // Save to chrome.storage
        this._saveExpandedState();
    },

    /**
     * Save expanded state to chrome.storage
     * Source: popup.js lines 1663-1666
     */
    _saveExpandedState() {
        if (window.expandedEntries && typeof chrome !== 'undefined' && chrome.storage) {
            const expandedArray = Array.from(window.expandedEntries);
            chrome.storage.local.set({ expandedEntries: expandedArray });
        }
    },

    /**
     * Initialize TranscriptManager module
     */
    initialize() {
        console.log('📄 [TRANSCRIPT] TranscriptManager initialized');
        // TranscriptManager doesn't need special initialization
        // Transcript functionality is managed through data updates and rendering calls
        
        // Set up global aliases for backward compatibility
        this.setupGlobalAliases();
    },

    /**
     * Set up global function aliases for backward compatibility
     * This fixes the critical bug where other modules expect global functions
     */
    setupGlobalAliases() {
        // Critical fix: Expose transcript functions globally as expected by other modules
        window.displayTranscript = this.displayTranscript.bind(this);
        window.updateStats = this.updateStats.bind(this);
        
        console.log('🔗 [TRANSCRIPT] Global transcript function aliases created for backward compatibility');
    }
};