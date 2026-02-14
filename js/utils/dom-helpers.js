/**
 * DOM Helpers Module
 * Utility functions for DOM manipulation, element creation, and UI interactions
 */

const MESSAGE_TRUNCATE_LENGTH = 200;

window.DOMHelpers = {
    /**
     * Add loading state to button
     * @param {HTMLElement} button - Button element
     */
    addButtonLoadingState(button) {
        if (!button) return;

        button.classList.add('loading');
        button.disabled = true;

        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
        }

        button.textContent = 'Ładowanie...';
    },

    /**
     * Remove loading state from button
     * @param {HTMLElement} button - Button element
     */
    removeButtonLoadingState(button) {
        if (!button) return;

        button.classList.remove('loading');
        button.disabled = false;

        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    },

    /**
     * Add ripple effect to button
     * @param {HTMLElement} button - Button element
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
            setTimeout(() => ripple.remove(), 600);
        });

        if (!document.getElementById('ripple-style')) {
            const style = document.createElement('style');
            style.id = 'ripple-style';
            style.textContent = `
                @keyframes ripple {
                    from { transform: scale(0); opacity: 1; }
                    to { transform: scale(2); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    },

    /**
     * Initialize enhanced interactions for UI elements
     */
    initializeEnhancedInteractions() {
        document.querySelectorAll('.btn, .record-button').forEach(button => {
            this.addRippleEffect(button);
        });

        document.querySelectorAll('.avatar').forEach(avatar => {
            this.addAvatarHoverEffect(avatar);
        });

        const transcriptContainer = document.getElementById('transcriptContent');
        if (transcriptContainer) {
            transcriptContainer.style.scrollBehavior = 'smooth';
        }
    },

    /**
     * Reinitialize enhanced interactions for newly created elements
     */
    reinitializeEnhancedInteractions() {
        document.querySelectorAll('.btn:not([data-ripple]), .record-button:not([data-ripple])').forEach(button => {
            this.addRippleEffect(button);
        });

        document.querySelectorAll('.avatar:not([data-hover])').forEach(avatar => {
            this.addAvatarHoverEffect(avatar);
        });
    },

    /**
     * Add hover effect to avatar element
     * @param {HTMLElement} avatar - Avatar element
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
     * Render expandable/collapsible text content into a container and attach toggle handler
     * @param {HTMLElement} textDiv - Container element for the text
     * @param {string} hash - Message hash for tracking expansion state
     * @param {string} fullText - Full message text
     * @param {boolean} isExpanded - Whether the text should be rendered expanded
     */
    _renderExpandableText(textDiv, hash, fullText, isExpanded) {
        if (isExpanded) {
            textDiv.innerHTML = `
                <div class="full-text">${fullText}</div>
                <button class="toggle-text" data-hash="${hash}">Zwiń</button>
            `;
        } else {
            const truncated = fullText.substring(0, MESSAGE_TRUNCATE_LENGTH) + '...';
            textDiv.innerHTML = `
                <div class="truncated-text">${truncated}</div>
                <button class="toggle-text" data-hash="${hash}">Rozwiń</button>
            `;
        }

        const toggleBtn = textDiv.querySelector('.toggle-text');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMessageExpansion(hash, textDiv, fullText);
            });
        }
    },

    /**
     * Create message element for transcript display
     * @param {Object} entry - Message entry data
     * @param {Object} speakerColors - Speaker color mapping
     * @returns {HTMLElement} Created message element
     */
    createMessageElement(entry, speakerColors) {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'transcript-entry';
        entryDiv.setAttribute('data-message-hash', entry.hash);

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        avatarDiv.style.backgroundColor = speakerColors[entry.speaker] || '#6366f1';
        avatarDiv.textContent = this.getInitials(entry.speaker);
        avatarDiv.setAttribute('title', entry.speaker);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'transcript-content';

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

        const textDiv = document.createElement('div');
        textDiv.className = 'transcript-text';

        const isLong = entry.text.length > MESSAGE_TRUNCATE_LENGTH;

        if (isLong) {
            const isExpanded = window.expandedEntries?.has(entry.hash) || false;
            this._renderExpandableText(textDiv, entry.hash, entry.text, isExpanded);
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
     * @param {HTMLElement} element - Message element to update
     * @param {Object} message - Updated message data
     * @param {Object} speakerColors - Speaker color mapping
     */
    updateMessageElement(element, message, speakerColors) {
        if (!element || !message) return;

        const avatar = element.querySelector('.avatar');
        if (avatar) {
            avatar.style.backgroundColor = speakerColors[message.speaker] || '#6366f1';
            avatar.textContent = this.getInitials(message.speaker);
            avatar.setAttribute('title', message.speaker);
        }

        const speakerName = element.querySelector('.speaker-name');
        if (speakerName) {
            speakerName.textContent = message.speaker;
            speakerName.style.color = speakerColors[message.speaker] || '#6366f1';
        }

        const timestamp = element.querySelector('.timestamp');
        if (timestamp) {
            timestamp.textContent = message.timestamp;
        }

        const textDiv = element.querySelector('.transcript-text');
        if (textDiv) {
            const isLong = message.text.length > MESSAGE_TRUNCATE_LENGTH;

            if (isLong) {
                const isExpanded = window.expandedEntries?.has(message.hash) || false;
                this._renderExpandableText(textDiv, message.hash, message.text, isExpanded);
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

        if (isExpanded) {
            window.expandedEntries.delete(hash);
        } else {
            window.expandedEntries.add(hash);
        }

        this._renderExpandableText(textDiv, hash, fullText, !isExpanded);

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
        }
        return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
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
};
