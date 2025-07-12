/**
 * DOM Helpers Module
 * Utility functions for DOM manipulation, element creation, and UI interactions
 * Extracted from popup.js lines: 2136-2238, 1275-1434, 2193-2238
 */

window.DOMHelpers = {
    /**
     * Add loading state to button
     * Extracted from popup.js lines 2136-2147
     * @param {HTMLElement} button - Button element to add loading state to
     */
    addButtonLoadingState(button) {
        if (!button) return;
        
        button.classList.add('loading');
        button.disabled = true;
        
        // Store original text
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
        }
        
        button.textContent = 'Ładowanie...';
    },

    /**
     * Remove loading state from button
     * @param {HTMLElement} button - Button element to remove loading state from
     */
    removeButtonLoadingState(button) {
        if (!button) return;
        
        button.classList.remove('loading');
        button.disabled = false;
        
        // Restore original text
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    },

    /**
     * Add ripple effect to button
     * Extracted from popup.js lines 2148-2190
     * @param {HTMLElement} button - Button element to add ripple effect to
     */
    addRippleEffect(button) {
        if (!button || button.dataset.ripple === 'true') return;
        
        button.dataset.ripple = 'true';
        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                background-color: rgba(255, 255, 255, 0.6);
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                pointer-events: none;
            `;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
        
        // Add CSS animation if not already added
        if (!document.getElementById('ripple-style')) {
            const style = document.createElement('style');
            style.id = 'ripple-style';
            style.textContent = `
                @keyframes ripple {
                    from {
                        transform: scale(0);
                        opacity: 1;
                    }
                    to {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    },

    /**
     * Initialize enhanced interactions for UI elements
     * Extracted from popup.js lines 2193-2215
     */
    initializeEnhancedInteractions() {
        // Add ripple effects to buttons
        document.querySelectorAll('.btn, .record-button').forEach(button => {
            this.addRippleEffect(button);
        });
        
        // Add hover effects to avatars
        document.querySelectorAll('.avatar').forEach(avatar => {
            this.addAvatarHoverEffect(avatar);
        });
        
        // Add smooth scrolling to transcript container
        const transcriptContainer = document.getElementById('transcriptContent');
        if (transcriptContainer) {
            transcriptContainer.style.scrollBehavior = 'smooth';
        }
    },

    /**
     * Reinitialize enhanced interactions for newly created elements
     * Extracted from popup.js lines 2218-2237
     */
    reinitializeEnhancedInteractions() {
        // Re-add ripple effects to newly created buttons
        document.querySelectorAll('.btn:not([data-ripple]), .record-button:not([data-ripple])').forEach(button => {
            this.addRippleEffect(button);
        });
        
        // Re-add hover effects to newly created avatars
        document.querySelectorAll('.avatar:not([data-hover])').forEach(avatar => {
            this.addAvatarHoverEffect(avatar);
        });
    },

    /**
     * Add hover effect to avatar element
     * @param {HTMLElement} avatar - Avatar element to add hover effect to
     */
    addAvatarHoverEffect(avatar) {
        if (!avatar || avatar.dataset.hover === 'true') return;
        
        avatar.dataset.hover = 'true';
        avatar.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
        });
        
        avatar.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    },

    /**
     * Create message element for transcript display
     * Extracted from popup.js lines 1275-1395
     * @param {Object} entry - Message entry data
     * @param {Object} speakerColors - Speaker color mapping
     * @returns {HTMLElement} Created message element
     */
    createMessageElement(entry, speakerColors) {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'transcript-entry';
        entryDiv.setAttribute('data-message-hash', entry.hash);
        
        // Avatar
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        avatarDiv.style.backgroundColor = speakerColors[entry.speaker] || '#6366f1';
        avatarDiv.textContent = this.getInitials(entry.speaker);
        avatarDiv.setAttribute('title', entry.speaker);
        
        // Content container
        const contentDiv = document.createElement('div');
        contentDiv.className = 'transcript-content';
        
        // Header with speaker and timestamp
        const headerDiv = document.createElement('div');
        headerDiv.className = 'transcript-header';
        
        const speakerSpan = document.createElement('span');
        speakerSpan.className = 'speaker-name';
        speakerSpan.textContent = entry.speaker;
        speakerSpan.style.color = speakerColors[entry.speaker] || '#6366f1';
        
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'timestamp';
        timestampSpan.textContent = entry.timestamp;
        
        headerDiv.appendChild(speakerSpan);
        headerDiv.appendChild(timestampSpan);
        
        // Message text
        const textDiv = document.createElement('div');
        textDiv.className = 'transcript-text';
        
        // Handle long messages with expand/collapse
        const maxLength = 200;
        const isLong = entry.text.length > maxLength;
        
        if (isLong) {
            const isExpanded = window.expandedEntries?.has(entry.hash) || false;
            
            if (isExpanded) {
                textDiv.innerHTML = `
                    <div class="full-text">${entry.text}</div>
                    <button class="toggle-text" data-hash="${entry.hash}">Zwiń</button>
                `;
            } else {
                const truncated = entry.text.substring(0, maxLength) + '...';
                textDiv.innerHTML = `
                    <div class="truncated-text">${truncated}</div>
                    <button class="toggle-text" data-hash="${entry.hash}">Rozwiń</button>
                `;
            }
            
            // Add click handler for toggle button
            const toggleBtn = textDiv.querySelector('.toggle-text');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleMessageExpansion(entry.hash, textDiv, entry.text);
                });
            }
        } else {
            textDiv.textContent = entry.text;
        }
        
        contentDiv.appendChild(headerDiv);
        contentDiv.appendChild(textDiv);
        
        entryDiv.appendChild(avatarDiv);
        entryDiv.appendChild(contentDiv);
        
        return entryDiv;
    },

    /**
     * Update existing message element
     * Extracted from popup.js lines 1396-1434
     * @param {HTMLElement} element - Message element to update
     * @param {Object} message - Updated message data
     * @param {Object} speakerColors - Speaker color mapping
     */
    updateMessageElement(element, message, speakerColors) {
        if (!element || !message) return;
        
        // Update avatar
        const avatar = element.querySelector('.avatar');
        if (avatar) {
            avatar.style.backgroundColor = speakerColors[message.speaker] || '#6366f1';
            avatar.textContent = this.getInitials(message.speaker);
            avatar.setAttribute('title', message.speaker);
        }
        
        // Update speaker name and color
        const speakerName = element.querySelector('.speaker-name');
        if (speakerName) {
            speakerName.textContent = message.speaker;
            speakerName.style.color = speakerColors[message.speaker] || '#6366f1';
        }
        
        // Update timestamp
        const timestamp = element.querySelector('.timestamp');
        if (timestamp) {
            timestamp.textContent = message.timestamp;
        }
        
        // Update text content
        const textDiv = element.querySelector('.transcript-text');
        if (textDiv) {
            const maxLength = 200;
            const isLong = message.text.length > maxLength;
            
            if (isLong) {
                const isExpanded = window.expandedEntries?.has(message.hash) || false;
                
                if (isExpanded) {
                    textDiv.innerHTML = `
                        <div class="full-text">${message.text}</div>
                        <button class="toggle-text" data-hash="${message.hash}">Zwiń</button>
                    `;
                } else {
                    const truncated = message.text.substring(0, maxLength) + '...';
                    textDiv.innerHTML = `
                        <div class="truncated-text">${truncated}</div>
                        <button class="toggle-text" data-hash="${message.hash}">Rozwiń</button>
                    `;
                }
                
                // Re-add click handler
                const toggleBtn = textDiv.querySelector('.toggle-text');
                if (toggleBtn) {
                    toggleBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.toggleMessageExpansion(message.hash, textDiv, message.text);
                    });
                }
            } else {
                textDiv.textContent = message.text;
            }
        }
    },

    /**
     * Toggle message expansion state
     * @param {string} hash - Message hash
     * @param {HTMLElement} textDiv - Text container element
     * @param {string} fullText - Full message text
     */
    toggleMessageExpansion(hash, textDiv, fullText) {
        if (!window.expandedEntries) {
            window.expandedEntries = new Set();
        }
        
        const isExpanded = window.expandedEntries.has(hash);
        const maxLength = 200;
        
        if (isExpanded) {
            // Collapse
            window.expandedEntries.delete(hash);
            const truncated = fullText.substring(0, maxLength) + '...';
            textDiv.innerHTML = `
                <div class="truncated-text">${truncated}</div>
                <button class="toggle-text" data-hash="${hash}">Rozwiń</button>
            `;
        } else {
            // Expand
            window.expandedEntries.add(hash);
            textDiv.innerHTML = `
                <div class="full-text">${fullText}</div>
                <button class="toggle-text" data-hash="${hash}">Zwiń</button>
            `;
        }
        
        // Re-add click handler
        const toggleBtn = textDiv.querySelector('.toggle-text');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMessageExpansion(hash, textDiv, fullText);
            });
        }
        
        // Save expanded state to storage
        if (window.saveExpandedState) {
            window.saveExpandedState();
        }
    },

    /**
     * Get initials from speaker name
     * @param {string} name - Speaker name
     * @returns {string} Initials (max 2 characters)
     */
    getInitials(name) {
        if (!name) return '?';
        
        const words = name.trim().split(/\s+/);
        if (words.length === 1) {
            return words[0].substring(0, 2).toUpperCase();
        } else {
            return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
        }
    },

    /**
     * Scroll element into view with smooth animation
     * @param {HTMLElement} element - Element to scroll into view
     * @param {Object} options - Scroll options
     */
    smoothScrollIntoView(element, options = {}) {
        if (!element) return;
        
        element.scrollIntoView({
            behavior: 'smooth',
            block: options.block || 'nearest',
            inline: options.inline || 'nearest'
        });
    },

    /**
     * Add CSS class with transition effect
     * @param {HTMLElement} element - Target element
     * @param {string} className - CSS class to add
     * @param {number} delay - Delay before adding class (ms)
     */
    addClassWithTransition(element, className, delay = 0) {
        if (!element) return;
        
        setTimeout(() => {
            element.classList.add(className);
        }, delay);
    },

    /**
     * Remove CSS class with transition effect
     * @param {HTMLElement} element - Target element
     * @param {string} className - CSS class to remove
     * @param {number} delay - Delay before removing class (ms)
     */
    removeClassWithTransition(element, className, delay = 0) {
        if (!element) return;
        
        setTimeout(() => {
            element.classList.remove(className);
        }, delay);
    },

    /**
     * Set element visibility with fade effect
     * @param {HTMLElement} element - Target element
     * @param {boolean} visible - Whether to show or hide
     * @param {number} duration - Animation duration (ms)
     */
    setVisibilityWithFade(element, visible, duration = 300) {
        if (!element) return;
        
        if (visible) {
            element.style.display = 'block';
            element.style.opacity = '0';
            element.style.transition = `opacity ${duration}ms ease`;
            
            setTimeout(() => {
                element.style.opacity = '1';
            }, 10);
        } else {
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = '0';
            
            setTimeout(() => {
                element.style.display = 'none';
            }, duration);
        }
    }
};