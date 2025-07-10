let transcriptData = null;
let realtimeMode = false;
let realtimeInterval = null;
let currentSessionId = null;
let sessionHistory = [];
let recordingStartTime = null;
let durationTimer = null;
let expandedEntries = new Set(); // Track which entries are expanded
let sessionTotalDuration = 0; // Track total session duration across pauses
let recordingStopped = false; // Flag to ignore background updates after recording stops

document.addEventListener('DOMContentLoaded', function() {
    try {
        const realtimeBtn = document.getElementById('recordBtn');
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        const clearBtn = document.getElementById('clearBtn');
        const closeSessionBtn = document.getElementById('closeSessionBtn');
        const statusDiv = document.getElementById('recordingStatus');
        const previewDiv = document.getElementById('transcriptContent');
        const statsDiv = document.getElementById('transcriptStats');
        const exportBtn = document.getElementById('exportBtn');
        const exportModal = document.getElementById('exportModal');
        const themeToggle = document.getElementById('themeToggle');
        
        // Check for essential DOM elements
        if (!realtimeBtn) {
            console.error('Critical error: Record button not found');
            throw new Error('Record button not found');
        }
        
        if (!statusDiv) {
            console.error('Critical error: Status div not found');
            throw new Error('Status div not found');
        }
        
        if (!previewDiv) {
            console.error('Critical error: Preview div not found');
            throw new Error('Preview div not found');
        }
    
    // Initialize modal system
    initializeModalSystem();
    
    // Export button handling
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (!transcriptData || !transcriptData.messages || transcriptData.messages.length === 0) {
                updateStatus('Brak danych do eksportu', 'error');
                return;
            }
            showModal('exportModal');
        });
    } else {
        console.error('Export button not found');
    }
    
    // Modal close handlers
    const modalCloseButtons = document.querySelectorAll('.modal-close');
    
    modalCloseButtons.forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modalId = closeBtn.getAttribute('data-modal');
            hideModal(modalId);
        });
    });
    
    // Close modal when clicking outside
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('Modal backdrop clicked for modal:', modal.id);
                hideModal(modal.id);
            }
        });
    });

    // Theme toggle functionality
    initializeTheme();
    
    // Sidebar collapse functionality
    initializeSidebar();

    console.log('Popup loaded');

    // Function to restore state from storage
    async function restoreStateFromStorage() {
        try {
            console.log('🔄 [RESTORE] Restoring state from storage');
            
            const result = await chrome.storage.local.get([
                'realtimeMode', 
                'recordingStartTime', 
                'transcriptData',
                'currentSessionId',
                'sessionTotalDuration',
                'currentSessionDuration'
            ]);
            
            console.log('🔄 [RESTORE DEBUG] Storage contents:', {
                realtimeMode: result.realtimeMode,
                currentSessionId: result.currentSessionId,
                hasTranscriptData: !!result.transcriptData,
                sessionHistoryLength: sessionHistory.length
            });
            
            // Restore recording state
            if (result.realtimeMode) {
                console.log('🔄 [RESTORE] Restoring recording state');
                realtimeMode = true;
                
                // Restore recording start time and timer
                if (result.recordingStartTime) {
                    recordingStartTime = new Date(result.recordingStartTime);
                    console.log('🔄 [RESTORE] Restored recording start time:', recordingStartTime);
                    startDurationTimer();
                }
                
                // Restore session data
                if (result.currentSessionId) {
                    currentSessionId = result.currentSessionId;
                }
                
                if (result.sessionTotalDuration) {
                    sessionTotalDuration = result.sessionTotalDuration;
                }
                
                // Add any current session duration from before popup was closed
                if (result.currentSessionDuration) {
                    sessionTotalDuration += result.currentSessionDuration;
                    // Clear the saved current duration to prevent accumulation
                    chrome.storage.local.remove(['currentSessionDuration']);
                }
                
                // Update UI to show recording state
                const realtimeBtn = document.getElementById('recordBtn');
                if (realtimeBtn) {
                    realtimeBtn.classList.add('active');
                    document.querySelector('.record-text').textContent = 'Zatrzymaj nagrywanie';
                }
                
                updateStatus('Nagrywanie wznowione', 'success');
            }
            
            // Restore transcript data only for active recording or historical sessions
            if (result.transcriptData && result.currentSessionId) {
                const isActiveRecording = result.realtimeMode;
                const isHistoricalSession = sessionHistory.find(s => s.id === result.currentSessionId);
                
                console.log('🔄 [RESTORE DEBUG] Session analysis:', {
                    currentSessionId: result.currentSessionId,
                    isActiveRecording: isActiveRecording,
                    isHistoricalSession: !!isHistoricalSession,
                    historicalSessionId: isHistoricalSession ? isHistoricalSession.id : null
                });
                
                if (isActiveRecording || isHistoricalSession) {
                    console.log('🔄 [RESTORE] Restoring transcript data for', isActiveRecording ? 'active recording' : 'historical session');
                    transcriptData = result.transcriptData;
                    currentSessionId = result.currentSessionId;
                    displayTranscript(transcriptData);
                    updateStats(transcriptData);
                    
                    const exportTxtBtn = document.getElementById('exportTxtBtn');
                    if (exportTxtBtn && transcriptData.messages.length > 0) {
                        exportTxtBtn.disabled = false;
                    }
                    
                    // Update session highlighting for restored session
                    if (isHistoricalSession) {
                        renderSessionHistory();
                    }
                    
                    // Update clear button state
                    if (window.updateClearButtonState) {
                        window.updateClearButtonState();
                    }
                } else {
                    // Session ID exists but not in history and not recording - show empty session
                    console.log('🔄 [RESTORE] Session not in history and not recording - showing empty session');
                    showEmptySession();
                }
            } else {
                // No transcript data or session ID - show empty session
                console.log('🔄 [RESTORE] No session data - showing empty session');
                showEmptySession();
            }
            
            // Show/hide buttons based on session type
            const recordBtn = document.getElementById('recordBtn');
            const closeSessionBtn = document.getElementById('closeSessionBtn');
            
            if (recordBtn && closeSessionBtn) {
                if (result.realtimeMode) {
                    // Active recording session - show record button, hide close button
                    recordBtn.style.display = 'flex';
                    closeSessionBtn.style.display = 'none';
                } else if (result.currentSessionId && sessionHistory.find(s => s.id === result.currentSessionId)) {
                    // Session exists in history - it's historical, hide record button, show close button
                    recordBtn.style.display = 'none';
                    closeSessionBtn.style.display = 'block';
                } else {
                    // New/empty session - show record button, hide close button
                    recordBtn.style.display = 'flex';
                    closeSessionBtn.style.display = 'none';
                }
            }
            
            console.log('🔄 [RESTORE] State restoration completed');
            
        } catch (error) {
            console.error('🔄 [RESTORE] Error restoring state:', error);
        }
    }
    
    // Initialize session history first, then restore state
    initializeSessionHistory().then(() => {
        // Restore state from storage AFTER session history is loaded
        restoreStateFromStorage();
    });
    
    // Theme toggle is initialized in initializeTheme()
    
    // Initialize enhanced interactions
    initializeEnhancedInteractions();
    
    // Background scan update handler function
    function handleBackgroundScanUpdate(data) {
        const timestamp = new Date().toISOString();
        console.log('🟡 [BACKGROUND DEBUG] Handling background scan update at:', timestamp);
        console.log('🟡 [BACKGROUND DEBUG] Data messages length:', data ? data.messages?.length : 'undefined');
        
        if (!realtimeMode) {
            console.log('🟡 [BACKGROUND DEBUG] Ignoring - not in realtime mode');
            return;
        }
        
        if (recordingStopped) {
            console.log('🟡 [BACKGROUND DEBUG] Ignoring - recording stopped');
            return;
        }
        
        if (!data || !data.messages || data.messages.length === 0) {
            console.log('🟡 [BACKGROUND DEBUG] No messages in background scan update');
            return;
        }
        
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        
        // Detect changes using hash comparison
        const changes = detectChanges(transcriptData ? transcriptData.messages : [], data.messages);
        
        if (!transcriptData) {
            // Initialize with new data structure
            transcriptData = {
                messages: data.messages,
                scrapedAt: data.scrapedAt,
                meetingUrl: data.meetingUrl
            };
            console.log('✅ Initialized transcript data from background scan');
            
            // Update display
            displayTranscript(transcriptData);
            updateStats(transcriptData);
            
            if (exportTxtBtn) {
                exportTxtBtn.disabled = false;
            }
            
            // Auto-save session to history
            autoSaveCurrentSession();
            
            updateStatus(`Nagrywanie w tle... (${transcriptData.messages.length} wpisów)`, 'info');
        } else if (changes.added.length > 0 || changes.updated.length > 0) {
            // Update data with changes
            transcriptData.messages = data.messages;
            transcriptData.scrapedAt = data.scrapedAt;

            // Update display with all messages (simplified approach)
            displayTranscript(transcriptData);
            updateStats(transcriptData);
            
            if (exportTxtBtn) {
                exportTxtBtn.disabled = false;
            }
            
            // Scroll to bottom if new messages added
            if (changes.added.length > 0) {
                const preview = document.getElementById('transcriptContent');
                if (preview) {
                    preview.scrollTop = preview.scrollHeight;
                }
            }
            
            // Auto-save session to history on every update
            autoSaveCurrentSession();
            
            updateStatus(`Nagrywanie w tle... (${transcriptData.messages.length} wpisów)`, 'info');
        }
        
        // Save to storage
        chrome.storage.local.set({ transcriptData: transcriptData });        
    }
    
    // Listen for background scan updates
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {        
        if (request.action === 'backgroundScanUpdate') {
            console.log('🔄 Background scan update received');
            handleBackgroundScanUpdate(request.data);
        }
        
        return true;
    });
    
    
    // Load expanded state
    loadExpandedState();
    
    // Przywróć stan trybu rzeczywistego
    chrome.storage.local.get(['realtimeMode', 'transcriptData', 'currentSessionId', 'recordingStartTime'], (result) => {
        if (result.currentSessionId) {
            currentSessionId = result.currentSessionId;
        }
        if (result.recordingStartTime) {
            recordingStartTime = new Date(result.recordingStartTime);
        }
        if (result.realtimeMode) {
            // If resuming realtime mode, start the timer first
            if (recordingStartTime) {
                startDurationTimer();
            }
            activateRealtimeMode();
        }
        if (result.transcriptData) {
            transcriptData = result.transcriptData;
            displayTranscript(transcriptData);
            updateStats(transcriptData);
            if (exportTxtBtn) exportTxtBtn.disabled = false;
        }
    });

    // Tryb rzeczywisty
    realtimeBtn.addEventListener('click', () => {
        if (realtimeMode) {
            deactivateRealtimeMode();
        } else {
            // Check if there's existing transcript data
            if (transcriptData && transcriptData.messages.length > 0) {
                showResumeOptions();
            } else {
                activateRealtimeMode();
            }
        }
    });

    async function continueCurrentSession() {
        console.log('Continuing current session');
        console.log('Current state:', {
            realtimeMode,
            currentSessionId,
            transcriptData: transcriptData ? transcriptData.messages.length : 0,
            sessionTotalDuration
        });
        // Don't reset sessionTotalDuration or create new session
        await activateRealtimeMode(true); // true = isContinuation
    }

    async function activateRealtimeMode(isContinuation = false) {
        const activationTime = new Date().toISOString();
        console.log('🟢 [ACTIVATION DEBUG] Starting realtime mode at:', activationTime);
        console.log('🟢 [ACTIVATION DEBUG] Is continuation:', isContinuation);
        
        const realtimeBtn = document.getElementById('recordBtn');
        if (!realtimeBtn) {
            console.error('Record button not found!');
            return;
        }
        
        // Reset recording stopped flag
        recordingStopped = false;
        console.log('🟢 [ACTIVATION DEBUG] recordingStopped reset to:', recordingStopped);
        
        realtimeMode = true;
        realtimeBtn.classList.add('active');
        document.querySelector('.record-text').textContent = 'Zatrzymaj nagrywanie';
        updateStatus('Nagrywanie aktywne - skanowanie w tle', 'info');
        
        // Set recording start time only for new recordings
        recordingStartTime = new Date();
        
        // Start duration timer
        startDurationTimer();
        
        // Update clear button state (disable during recording)
        if (window.updateClearButtonState) {
            window.updateClearButtonState();
        }
        
        // Save recording start time to storage
        chrome.storage.local.set({ recordingStartTime: recordingStartTime.toISOString() });
        
        // Create new session ID if none exists (session will be added to history when first entry appears)
        if (!currentSessionId) {
            currentSessionId = generateSessionId();
            chrome.storage.local.set({ currentSessionId: currentSessionId });
        }
        
        // Zapisz stan
        chrome.storage.local.set({ 
            realtimeMode: true, 
            recordingStartTime: recordingStartTime.toISOString()
        });
        
        // Uruchom skanowanie w tle
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url.includes('meet.google.com')) {
                console.log('🟢 [ACTIVATION DEBUG] Starting background scanning for tab:', tab.id);
                
                // Rozpocznij skanowanie w tle
                chrome.runtime.sendMessage({
                    action: 'startBackgroundScanning',
                    tabId: tab.id
                }, (response) => {
                    const scanStartTime = new Date().toISOString();
                    if (response && response.success) {
                        console.log('🟢 [ACTIVATION DEBUG] Background scanning started at:', scanStartTime);
                        updateStatus('Nagrywanie aktywne - skanowanie w tle', 'success');
                    } else {
                        console.error('🟢 [ACTIVATION DEBUG] Failed to start background scanning at:', scanStartTime);
                        updateStatus('Błąd uruchomienia skanowania w tle', 'error');
                    }
                });
            }
        } catch (error) {
            console.error('Error starting realtime mode:', error);
            updateStatus('Błąd uruchomienia trybu rzeczywistego', 'error');
        }
    }


    // takeBaselineSnapshot function removed - no longer needed in simplified version

    // performRealtimeScrape function removed - no longer needed in simplified version

    // getCurrentTabId function removed - no longer needed

    // startPeriodicStorageCheck function removed - no longer needed in simplified version

    // Function moved above to be defined before use

    // State restoration is now handled after session history loading

    // Wyczyść transkrypcję
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            // If there's a current session, delete it from history (same as clicking delete button)
            if (currentSessionId) {
                showDeleteConfirmation(currentSessionId);
            } else {
                // If no current session, just clear the UI
                if (confirm('Czy na pewno chcesz wyczyścić całą transkrypcję?')) {
                    // Stop recording if active
                    if (realtimeMode) {
                        deactivateRealtimeMode();
                    }
                    
                    // Stop any active timer
                    stopDurationTimer();
                    
                    // Reset ALL transcript-related variables
                    transcriptData = null;
                    currentSessionId = null;
                    recordingStartTime = null;
                    sessionTotalDuration = 0;
                    recordingStopped = false;
                    
                    // Update UI
                    displayTranscript({ messages: [] });
                    updateStats({ messages: [] });
                    updateDurationDisplay();
                    if (exportTxtBtn) exportTxtBtn.disabled = true;
                    updateStatus('Transkrypcja wyczyszczona', 'info');
                    
                    // Show record button for new session
                    const recordBtn = document.getElementById('recordBtn');
                    if (recordBtn) {
                        recordBtn.style.display = 'flex';
                    }
                    
                    // Clear from storage
                    chrome.storage.local.remove(['transcriptData', 'currentSessionId', 'recordingStartTime']);
                }
            }
        });
        
        // Update clear button state based on recording status and data availability
        function updateClearButtonState() {
            const hasData = transcriptData && transcriptData.messages && transcriptData.messages.length > 0;
            const isRecording = realtimeMode;
            
            console.log('🔍 [CLEAR BTN DEBUG] updateClearButtonState called:', {
                transcriptData: transcriptData,
                hasMessages: transcriptData?.messages?.length,
                hasData: hasData,
                isRecording: isRecording
            });
            
            if (isRecording) {
                clearBtn.disabled = true;
                clearBtn.classList.add('disabled');
                clearBtn.title = 'Nie można wyczyścić podczas nagrywania';
                console.log('🔍 [CLEAR BTN] Disabled - recording active');
            } else if (!hasData) {
                clearBtn.disabled = true;
                clearBtn.classList.add('disabled');
                clearBtn.title = 'Brak danych do wyczyszczenia';
                console.log('🔍 [CLEAR BTN] Disabled - no data');
            } else {
                clearBtn.disabled = false;
                clearBtn.classList.remove('disabled');
                clearBtn.title = 'Wyczyść';
                console.log('🔍 [CLEAR BTN] Enabled - has data');
            }
        }
        
        // Initial state
        updateClearButtonState();
        
        // Store reference to update function for later use
        window.updateClearButtonState = updateClearButtonState;
    } else {
        console.error('Clear button not found');
    }
    
    // Close session button (for historical sessions)
    if (closeSessionBtn) {
        closeSessionBtn.addEventListener('click', () => {
            showEmptySession();
        });
    } else {
        console.error('Close session button not found');
    }

    // Export handlers will be set up by the modal system
    
    }
    
    } catch (error) {
        console.error('Error during popup initialization:', error);
        updateStatus('Błąd inicjalizacji interfejsu', 'error');
    }
    
    // Function to show empty session
    function showEmptySession() {
        console.log('🆕 [EMPTY SESSION] Showing empty session');
        
        // Clear session data
        transcriptData = null;
        currentSessionId = null;
        recordingStartTime = null;
        sessionTotalDuration = 0;
        recordingStopped = false;
        
        // Stop any existing timer
        stopDurationTimer();
        
        // Update UI to empty state
        displayTranscript({ messages: [] });
        updateStats({ messages: [] });
        
        // Reset duration display
        updateDurationDisplay();
        
        // Update clear button state
        if (window.updateClearButtonState) {
            window.updateClearButtonState();
        }
        
        // Disable export button
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        if (exportTxtBtn) {
            exportTxtBtn.disabled = true;
        }
        
        // Show record button for new session
        const recordBtn = document.getElementById('recordBtn');
        if (recordBtn) {
            recordBtn.style.display = 'flex';
            recordBtn.classList.remove('active');
            const recordText = document.querySelector('.record-text');
            if (recordText) {
                recordText.textContent = 'Rozpocznij nagrywanie';
            }
        }
        
        // Hide close session button (only for historical sessions)
        const closeSessionBtn = document.getElementById('closeSessionBtn');
        if (closeSessionBtn) {
            closeSessionBtn.style.display = 'none';
        }
        
        // Clear storage
        chrome.storage.local.remove(['transcriptData', 'currentSessionId', 'recordingStartTime', 'sessionTotalDuration', 'currentSessionDuration', 'realtimeMode']);
        
        // Remove session highlighting
        renderSessionHistory();
        
        
        updateStatus('Gotowy do nagrywania', 'info');
    }
});

function updateStatus(message, type = '') {
    const statusDiv = document.getElementById('recordingStatus');
    if (!statusDiv) {
        console.error('Status div not found');
        return;
    }
    
    const statusText = statusDiv.querySelector('.status-text');
    const statusDot = statusDiv.querySelector('.status-dot');
    
    if (!statusText || !statusDot) {
        console.error('Status elements not found');
        return;
    }
    
    statusText.textContent = message;
    statusDiv.className = 'recording-status';
    
    if (type === 'info') {
        statusDiv.classList.add('recording');
        statusDot.className = 'status-dot recording';
    } else if (type === 'success') {
        statusDiv.classList.add('success');
        statusDot.className = 'status-dot success';
    } else if (type === 'error') {
        statusDiv.classList.add('error');
        statusDot.className = 'status-dot error';
    } else {
        statusDot.className = 'status-dot';
    }
}

function displayTranscript(data) {
    const previewDiv = document.getElementById('transcriptContent');
    if (!previewDiv) {
        console.error('Transcript content div not found');
        return;
    }
    
    previewDiv.innerHTML = '';

    const dataToDisplay = data.messages || [];
    
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

    // Mapa kolorów dla różnych użytkowników
    const speakerColors = new Map();
    let colorIndex = 1;

    // Pokaż wszystkie wpisy
    const entriesToShow = dataToDisplay;
    entriesToShow.forEach((entry, index) => {
        // Przypisz kolor dla użytkownika
        if (!speakerColors.has(entry.speaker)) {
            speakerColors.set(entry.speaker, colorIndex);
            colorIndex = (colorIndex % 6) + 1;
        }

        const entryDiv = document.createElement('div');
        entryDiv.className = 'transcript-entry';
        
        // Avatar
        const avatarDiv = document.createElement('div');
        avatarDiv.className = `avatar color-${speakerColors.get(entry.speaker)}`;
        avatarDiv.textContent = entry.speaker.charAt(0).toUpperCase();
        
        // Kontener wiadomości
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-content';
        
        // Nagłówek wiadomości
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
        
        // Bąbelek wiadomości
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        
        const textP = document.createElement('p');
        textP.className = 'transcript-text';
        
        // Check if text is long enough to need collapsing
        const isLongText = entry.text.length > 200;
        
        if (isLongText) {
            // Generate unique entry ID
            const entryId = generateEntryId(entry);
            const isExpanded = expandedEntries.has(entryId);
            
            const shortText = entry.text.substring(0, 200);
            const fullText = entry.text;
            
            // Create collapsed version
            const collapsedSpan = document.createElement('span');
            collapsedSpan.className = 'text-collapsed';
            collapsedSpan.textContent = shortText + '...';
            collapsedSpan.style.display = isExpanded ? 'none' : 'inline';
            
            // Create full version 
            const expandedSpan = document.createElement('span');
            expandedSpan.className = 'text-expanded';
            expandedSpan.textContent = fullText;
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
                expandedEntries.add(entryId);
                saveExpandedState();
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
                expandedEntries.delete(entryId);
                saveExpandedState();
            };
            
            // Add elements to text paragraph
            textP.appendChild(collapsedSpan);
            textP.appendChild(expandedSpan);
            
            // Add button container to bubble
            buttonContainer.appendChild(expandBtn);
            buttonContainer.appendChild(collapseBtn);
            bubbleDiv.appendChild(buttonContainer);
        } else {
            textP.textContent = entry.text;
        }
        
        bubbleDiv.appendChild(textP);
        messageDiv.appendChild(headerDiv);
        messageDiv.appendChild(bubbleDiv);
        
        entryDiv.appendChild(avatarDiv);
        entryDiv.appendChild(messageDiv);
        
        // Add fade-in animation for new entries
        entryDiv.style.opacity = '0';
        entryDiv.style.transform = 'translateY(20px)';
        previewDiv.appendChild(entryDiv);
        
        // Animate entry appearance
        setTimeout(() => {
            entryDiv.style.transition = 'all 0.3s ease';
            entryDiv.style.opacity = '1';
            entryDiv.style.transform = 'translateY(0)';
        }, index * 50); // Stagger animation
    });

    // Removed message limit - all messages are now displayed
    
    // Reinitialize enhanced interactions for new elements
    reinitializeEnhancedInteractions();
}

// getFilteredEntries function removed - no longer needed in simplified version

// getFilteredStatsData function removed - no longer needed in simplified version

function updateStats(data) {
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
    
    // Duration is now handled by the continuous timer
    // Only update duration if we're not in realtime mode
    if (!realtimeMode) {
        updateDurationDisplay();
    }
    
    statsDiv.style.display = 'block';
    
}

function startDurationTimer() {    
    // Clear any existing timer
    if (durationTimer) {
        clearInterval(durationTimer);
    }
    
    // Update duration display immediately
    updateDurationDisplay();
    
    // Set up timer to update every second
    durationTimer = setInterval(updateDurationDisplay, 1000);
}

function stopDurationTimer() {    
    if (durationTimer) {
        clearInterval(durationTimer);
        durationTimer = null;
    }
}

function updateDurationDisplay() {
    const durationSpan = document.getElementById('duration');
    if (!durationSpan) return;
    
    if (recordingStartTime) {
        const now = new Date();
        const currentSessionDuration = Math.floor((now - recordingStartTime) / 1000);
        const totalDuration = sessionTotalDuration + currentSessionDuration;
        durationSpan.textContent = formatDuration(totalDuration);
        
        // Save current total duration to storage periodically (every 10 seconds)
        if (totalDuration % 10 === 0) {
            chrome.storage.local.set({ 
                sessionTotalDuration: sessionTotalDuration,
                currentSessionDuration: currentSessionDuration 
            });
        }
    } else {
        durationSpan.textContent = formatDuration(sessionTotalDuration);
    }
}

function deactivateRealtimeMode() {        
    const realtimeBtn = document.getElementById('recordBtn');
    if (!realtimeBtn) {
        console.error('Record button not found!');
        return;
    }
    
    realtimeMode = false;
    realtimeBtn.classList.remove('active');
    document.querySelector('.record-text').textContent = 'Rozpocznij nagrywanie';
    updateStatus('Nagrywanie zatrzymane', 'success');
    
    // Add current session duration to total
    if (recordingStartTime) {
        const now = new Date();
        const currentSessionDuration = Math.floor((now - recordingStartTime) / 1000);
        sessionTotalDuration += currentSessionDuration;
    }
    
    // Stop duration timer
    stopDurationTimer();
    
    // Update clear button state (enable after recording)
    if (window.updateClearButtonState) {
        window.updateClearButtonState();
    }
    
    // Set flag to ignore background updates
    recordingStopped = true;
    
    // Zatrzymaj skanowanie w tle PRZED zapisem sesji
    chrome.runtime.sendMessage({
        action: 'stopBackgroundScanning'
    }, (response) => {
        if (response && response.success) {
            console.log('✅ Background scanning stopped');
        } else {
            console.error('❌ Failed to stop background scanning');
        }
    });
    
    // Always save session when stopping recording
    if (transcriptData && transcriptData.messages.length > 0) {
        saveCurrentSessionToHistory();
    }
    
    // Clear transcript data from storage
    transcriptData = null;
    
    // Zapisz stan
    chrome.storage.local.set({ 
        realtimeMode: false, 
        recordingStartTime: null,
        transcriptData: null,
        sessionTotalDuration: sessionTotalDuration
    });
    
    // No manual scraping interval to clear in simplified version
}

function generateEntryId(entry) {
    // Generate a simple hash based on speaker and first 100 chars of text
    const text = entry.speaker + entry.text.substring(0, 100);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
}

function saveExpandedState() {
    const expandedArray = Array.from(expandedEntries);
    chrome.storage.local.set({ expandedEntries: expandedArray });
}

function loadExpandedState() {
    chrome.storage.local.get(['expandedEntries'], (result) => {
        if (result.expandedEntries) {
            expandedEntries = new Set(result.expandedEntries);
        }
    });
}

function downloadFile(content, filename, mimeType) {    
    try {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        chrome.downloads.download({
            url: url,
            filename: filename,
            saveAs: true
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error('Download error:', chrome.runtime.lastError);
                updateStatus('Błąd podczas pobierania pliku', 'error');
            } else {
                updateStatus('Plik został pomyślnie pobrany!', 'success');
            }
            
            // Zwolnij URL po pobraniu
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
    } catch (error) {
        console.error('Error creating download:', error);
        updateStatus('Błąd podczas tworzenia pliku', 'error');
    }
}

// Session History Management Functions
function generateSessionId() {
    return Date.now().toString();
}

function generateSessionTitle() {
    const now = new Date();
    const time = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    return `Spotkanie o ${time}`;
}

function initializeSessionHistory() {    
    return new Promise((resolve) => {
        // Load session history from storage
        chrome.storage.local.get(['sessionHistory'], (result) => {
            try {
                sessionHistory = result.sessionHistory || [];
                console.log('📁 [HISTORY] Loaded session history:', sessionHistory.length, 'sessions');
                renderSessionHistory();
                
                // Add event listeners for history UI INSIDE the Promise
                const newSessionBtn = document.getElementById('newSessionBtn');
                if (newSessionBtn) {
                    // Remove existing event listeners to prevent duplicates
                    newSessionBtn.removeEventListener('click', createNewSession);
                    newSessionBtn.addEventListener('click', createNewSession);
                    console.log('📁 [HISTORY] New session button event listener added');
                } else {
                    console.error('New session button not found');
                }
                
                resolve();
            } catch (error) {
                console.error('Error loading session history:', error);
                sessionHistory = [];
                renderSessionHistory();
                resolve();
            }
        });
    });
}

function createNewSession() {    
    console.log('🆕 [NEW SESSION] createNewSession() called');
    
    // Stop recording if active (auto-save will handle the session)
    if (realtimeMode) {
        console.log('🆕 [NEW SESSION] Stopping active recording first');
        deactivateRealtimeMode();
    }
    
    // Create new session (no need to ask about saving - auto-save handles it)
    console.log('🆕 [NEW SESSION] Calling performNewSessionCreation()');
    performNewSessionCreation();
}


function performNewSessionCreation() {    
    // Clear current data
    transcriptData = null;
    currentSessionId = generateSessionId(); // Generate ID but don't save to storage yet
    recordingStartTime = null;
    sessionTotalDuration = 0; // Reset total duration for new session
    recordingStopped = false; // Reset recording stopped flag
    
    console.log('🆕 [NEW SESSION] Created new session ID:', currentSessionId, '(not saved to storage yet)');
    console.log('🆕 [NEW SESSION] transcriptData set to:', transcriptData);
    console.log('🆕 [NEW SESSION] realtimeMode:', realtimeMode);
    
    // Stop any existing timer
    stopDurationTimer();
    
    console.log('🆕 [NEW SESSION] About to call displayTranscript with:', { messages: [] });
    displayTranscript({ messages: [] });
    updateStats({ messages: [] });
    console.log('🆕 [NEW SESSION] After displayTranscript, transcriptData:', transcriptData);
    
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    if (exportTxtBtn) {
        exportTxtBtn.disabled = true;
    }
    
    // Clear storage for new session (don't save currentSessionId until recording starts)
    chrome.storage.local.remove([
        'currentSessionId',
        'transcriptData', 
        'recordingStartTime',
        'realtimeMode',
        'sessionTotalDuration',
        'currentSessionDuration'
    ], () => {
        // Update clear button state AFTER storage is cleared to prevent race condition
        console.log('🆕 [NEW SESSION] Storage cleared, transcriptData:', transcriptData);
        console.log('🆕 [NEW SESSION] realtimeMode:', realtimeMode);
        console.log('🆕 [NEW SESSION] About to call updateClearButtonState');
        if (window.updateClearButtonState) {
            window.updateClearButtonState();
        } else {
            console.error('🆕 [NEW SESSION] updateClearButtonState not found on window!');
        }
    });
    
    updateStatus('Utworzono nową sesję', 'success');
    
    // Show record button for new sessions (they can be recorded)
    const recordBtn = document.getElementById('recordBtn');
    if (recordBtn) {
        recordBtn.style.display = 'flex';
    }
    
    // Remove session highlighting (no session selected)
    renderSessionHistory();
}

function autoSaveCurrentSession(data = null) {
    if (!transcriptData || transcriptData.messages.length === 0) {
        return;
    }
    
    // Simplified: just use all messages from transcriptData
    const validMessages = transcriptData.messages;
    
    const sessionId = currentSessionId || generateSessionId();
    const uniqueParticipants = new Set(validMessages.map(m => m.speaker)).size;
    
    // Check if session already exists and preserve its original date
    const existingIndex = sessionHistory.findIndex(s => s.id === sessionId);
    const originalDate = existingIndex >= 0 ? sessionHistory[existingIndex].date : new Date().toISOString();
    
    // Calculate current total duration
    let currentTotalDuration = sessionTotalDuration;
    if (recordingStartTime) {
        const now = new Date();
        const currentSessionDuration = Math.floor((now - recordingStartTime) / 1000);
        currentTotalDuration += currentSessionDuration;
    }
    
    const filteredTranscriptData = {
        messages: validMessages,
        scrapedAt: transcriptData.scrapedAt,
        meetingUrl: transcriptData.meetingUrl
    };
    
    const session = {
        id: sessionId,
        title: generateSessionTitle(),
        date: originalDate, // Preserve original date or set new one
        participantCount: uniqueParticipants,
        entryCount: validMessages.length,
        transcript: filteredTranscriptData,
        totalDuration: currentTotalDuration
    };
    
    console.log('🔄 [AUTOSAVE DEBUG] Creating session with:', {
        id: sessionId,
        entryCount: validMessages.length,
        participantCount: uniqueParticipants
    });
    
    if (existingIndex >= 0) {
        sessionHistory[existingIndex] = session;
        console.log('🔄 [AUTOSAVE DEBUG] Updated existing session in history');
    } else {
        sessionHistory.unshift(session);
        console.log('🔄 [AUTOSAVE DEBUG] Added new session to history');
    }
    
    // Limit history to 50 sessions
    if (sessionHistory.length > 50) {
        sessionHistory = sessionHistory.slice(0, 50);
    }
    
    // Save to storage silently (no status message)
    chrome.storage.local.set({ sessionHistory: sessionHistory }, () => {
        renderSessionHistory();
        console.log('🔄 [AUTOSAVE DEBUG] Session saved to storage and history rendered');
        
        // Highlight the new/updated session if it's the current one
        if (sessionId === currentSessionId && existingIndex < 0) {
            // New session was added, it will be highlighted automatically by renderSessionHistory
            console.log('🔄 [AUTOSAVE DEBUG] New session highlighted in list');
        }
    });
}

function saveCurrentSessionToHistory() {
    console.log('💾 [SAVE DEBUG] saveCurrentSessionToHistory called');
    
    if (!transcriptData || transcriptData.messages.length === 0) {
        console.log('💾 [SAVE DEBUG] No transcript data to save');
        return;
    }
    
    console.log('💾 [SAVE DEBUG] Saving session:');
    console.log('   - Original entries count:', transcriptData.messages.length);
    // Baseline system removed in simplified version
    
    // Simplified: just use all messages
    let validMessages = transcriptData.messages;
    
    if (validMessages.length === 0) {
        console.log('💾 [SAVE DEBUG] No valid messages - not saving');
        return;
    }
    
    const sessionId = currentSessionId || generateSessionId();
    const uniqueParticipants = new Set(validMessages.map(m => m.speaker)).size;
    
    // Calculate current total duration
    let currentTotalDuration = sessionTotalDuration;
    if (recordingStartTime) {
        const now = new Date();
        const currentSessionDuration = Math.floor((now - recordingStartTime) / 1000);
        currentTotalDuration += currentSessionDuration;
    }
    
    const session = {
        id: sessionId,
        title: generateSessionTitle(),
        date: new Date().toISOString(),
        participantCount: uniqueParticipants,
        entryCount: validMessages.length,
        transcript: {
            messages: validMessages,
            scrapedAt: transcriptData.scrapedAt,
            meetingUrl: transcriptData.meetingUrl
        },
        totalDuration: currentTotalDuration
    };
        
    // Check if session already exists and update it
    const existingIndex = sessionHistory.findIndex(s => s.id === sessionId);
    if (existingIndex >= 0) {
        sessionHistory[existingIndex] = session;
    } else {
        // Add new session at the beginning
        sessionHistory.unshift(session);
    }
    
    // Limit history to 50 sessions
    if (sessionHistory.length > 50) {
        sessionHistory = sessionHistory.slice(0, 50);
    }
    
    // Save to storage
    chrome.storage.local.set({ sessionHistory: sessionHistory }, () => {
        renderSessionHistory();
        updateStatus('Sesja zapisana w historii', 'success');
    });
}

function loadSessionFromHistory(sessionId) {    
    const session = sessionHistory.find(s => s.id === sessionId);
    if (!session) {
        console.error('Session not found:', sessionId);
        updateStatus('Nie znaleziono sesji', 'error');
        return;
    }
    
    // Stop recording if active (auto-save will handle the session)
    if (realtimeMode) {
        deactivateRealtimeMode();
    }
    
    // Load the session
    transcriptData = session.transcript;
    currentSessionId = session.id;
    recordingStartTime = null; // Historic sessions don't have active recording
    sessionTotalDuration = session.totalDuration || 0; // Load total duration
    
    // Stop any existing timer and ensure recording is stopped
    stopDurationTimer();
    
    displayTranscript(transcriptData);
    updateStats(transcriptData);
    updateDurationDisplay();
    
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    if (exportTxtBtn) {
        exportTxtBtn.disabled = false;
    }
    
    // Update storage (historic sessions are never recording)
    chrome.storage.local.set({ 
        transcriptData: transcriptData,
        currentSessionId: currentSessionId,
        recordingStartTime: null,
        realtimeMode: false
    });
    
    updateStatus(`Wczytano sesję: ${session.title}`, 'success');
    
    // Hide record button for historical sessions (they are read-only)
    const recordBtn = document.getElementById('recordBtn');
    if (recordBtn) {
        recordBtn.style.display = 'none';
    }
    
    // Show close session button for historical sessions
    const closeSessionBtn = document.getElementById('closeSessionBtn');
    if (closeSessionBtn) {
        closeSessionBtn.style.display = 'block';
    }
    
    // Update clear button state
    if (window.updateClearButtonState) {
        window.updateClearButtonState();
    }
    
    // Refresh session list to update highlighting
    renderSessionHistory();
}

function deleteSessionFromHistory(sessionId, event) {
    event.stopPropagation(); // Prevent triggering the load action
    
    showDeleteConfirmation(sessionId);
}

function renderSessionHistory() {    
    const historyContainer = document.getElementById('sessionList');
    if (!historyContainer) {
        console.error('Session list container not found');
        return;
    }
    
    historyContainer.innerHTML = '';
    
    if (sessionHistory.length === 0) {
        historyContainer.innerHTML = '<div class="empty-sessions"><p>Brak zapisanych sesji</p></div>';
        return;
    }
    
    sessionHistory.forEach(session => {
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'session-item';
        if (session.id === currentSessionId) {
            sessionDiv.classList.add('active');
        }
        
        const sessionInfo = document.createElement('div');
        sessionInfo.className = 'session-info';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'session-title';
        titleDiv.textContent = session.title;
        
        const metaDiv = document.createElement('div');
        metaDiv.className = 'session-meta';
        const date = new Date(session.date);
        const dateStr = date.toLocaleDateString('pl-PL');
        const timeStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        metaDiv.textContent = `${dateStr} ${timeStr} • ${session.participantCount} uczestników • ${session.entryCount} wpisów`;
        
        sessionInfo.appendChild(titleDiv);
        sessionInfo.appendChild(metaDiv);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '🗑';
        deleteBtn.title = 'Usuń sesję';
        deleteBtn.onclick = (e) => deleteSessionFromHistory(session.id, e);
        
        sessionDiv.appendChild(sessionInfo);
        sessionDiv.appendChild(deleteBtn);
        
        sessionDiv.onclick = () => loadSessionFromHistory(session.id);
        
        historyContainer.appendChild(sessionDiv);
    });
        
    // Reinitialize enhanced interactions for session items
    reinitializeEnhancedInteractions();
    
    // Update tooltips for collapsed sidebar (with delay for DOM to settle)
    if (typeof updateSessionTooltips === 'function') {
        setTimeout(() => {
            updateSessionTooltips();
        }, 50); // Small delay to ensure DOM is fully rendered
    }
}

// Auto-save functionality
setInterval(() => {
    if (transcriptData && transcriptData.messages.length > 0 && currentSessionId) {
        // Auto-save current session
        const existingIndex = sessionHistory.findIndex(s => s.id === currentSessionId);
        if (existingIndex >= 0) {
            // Update existing session silently
            const uniqueParticipants = new Set(transcriptData.messages.map(e => e.speaker)).size;
            sessionHistory[existingIndex].transcript = transcriptData;
            sessionHistory[existingIndex].participantCount = uniqueParticipants;
            sessionHistory[existingIndex].entryCount = transcriptData.messages.length;
            sessionHistory[existingIndex].date = new Date().toISOString();
            
            chrome.storage.local.set({ sessionHistory: sessionHistory });
        }
    }
}, 30000); // Auto-save every 30 seconds


// Enhanced Button Interactions
function addButtonLoadingState(button) {
    button.classList.add('loading');
    button.disabled = true;
    
    // Remove loading state after 1 second (adjust as needed)
    setTimeout(() => {
        button.classList.remove('loading');
        button.disabled = false;
    }, 1000);
}

// Add ripple effect to buttons
function addRippleEffect(button) {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
}

// Add CSS for ripple animation
if (!document.querySelector('#ripple-styles')) {
    const style = document.createElement('style');
    style.id = 'ripple-styles';
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(2);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialize enhanced interactions
function initializeEnhancedInteractions() {
    // Add ripple effects to buttons
    document.querySelectorAll('.btn, .record-button').forEach(button => {
        addRippleEffect(button);
    });
    
    // Add hover effects to avatars
    document.querySelectorAll('.avatar').forEach(avatar => {
        avatar.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
        });
        
        avatar.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
    
    // Add smooth scrolling to transcript container
    const transcriptContainer = document.getElementById('transcriptContent');
    if (transcriptContainer) {
        transcriptContainer.style.scrollBehavior = 'smooth';
    }
}

// Initialize enhanced interactions when elements are added
function reinitializeEnhancedInteractions() {
    // Re-add ripple effects to newly created buttons
    document.querySelectorAll('.btn:not([data-ripple]), .record-button:not([data-ripple])').forEach(button => {
        button.setAttribute('data-ripple', 'true');
        addRippleEffect(button);
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
}

// Detect changes between old and new messages using hash comparison
function detectChanges(oldMessages, newMessages) {
    const changes = {
        added: [],
        updated: [],
        removed: []
    };
    
    // Create hash maps for fast lookup
    const oldHashes = new Map();
    const newHashes = new Map();
    
    // Map old messages by hash
    if (oldMessages) {
        oldMessages.forEach((msg, index) => {
            oldHashes.set(msg.hash, { ...msg, originalIndex: index });
        });
    }
    
    // Map new messages by hash
    if (newMessages) {
        newMessages.forEach((msg, index) => {
            newHashes.set(msg.hash, { ...msg, originalIndex: index });
        });
    }
    
    // Find added messages (in new but not in old)
    newHashes.forEach((msg, hash) => {
        if (!oldHashes.has(hash)) {
            changes.added.push(msg);
        }
    });
    
    // Find updated messages (same hash but different content - shouldn't happen with hash-based comparison)
    // For now, we'll consider any message with same hash as unchanged
    
    // Find removed messages (in old but not in new)
    oldHashes.forEach((msg, hash) => {
        if (!newHashes.has(hash)) {
            changes.removed.push(msg);
        }
    });
    
    return changes;
}

// Duration Timer Functions - persistent timer that works even when popup is closed
function startDurationTimer() {
    // Timer is based on recordingStartTime timestamp, not local setInterval
    // This way it works even when popup is closed
    
    if (!recordingStartTime) {
        console.error('Cannot start timer: recordingStartTime not set');
        return;
    }
    
    // Start UI update interval only when popup is open
    if (!durationTimer) {
        durationTimer = setInterval(updateDurationDisplay, 1000);
        console.log('🕐 Duration timer UI started');
    }
    
    // Initial display update
    updateDurationDisplay();
}

function stopDurationTimer() {
    if (durationTimer) {
        clearInterval(durationTimer);
        durationTimer = null;
        console.log('🕐 Duration timer UI stopped');
    }
}


function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

// Theme toggle functionality
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    
    // Load saved theme
    chrome.storage.local.get(['theme'], (result) => {
        try {
            const theme = result.theme || 'light';
            document.documentElement.setAttribute('data-theme', theme);
            updateThemeToggleIcon(theme);
            updateThemeToggleTitle(theme);
        } catch (error) {
            console.error('Error initializing theme:', error);
            // Fallback to light theme
            document.documentElement.setAttribute('data-theme', 'light');
            updateThemeToggleIcon('light');
            updateThemeToggleTitle('light');
        }
    });
    
    // Theme toggle click handler
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    } else {
        console.warn('Theme toggle button not found');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Add a brief visual feedback
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.style.transform = 'scale(0.9)';
        setTimeout(() => {
            themeToggle.style.transform = '';
        }, 150);
    }
    
    document.documentElement.setAttribute('data-theme', newTheme);
    updateThemeToggleIcon(newTheme);
    updateThemeToggleTitle(newTheme);
    chrome.storage.local.set({ theme: newTheme });
    
    // Brief status update to show theme change
    updateStatus(`Przełączono na ${newTheme === 'dark' ? 'ciemny' : 'jasny'} motyw`, 'info');
    setTimeout(() => {
        if (!realtimeMode) {
            updateStatus('Gotowy do nagrywania', '');
        }
    }, 1500);
}

function updateThemeToggleIcon(theme) {
    const lightIcon = document.querySelector('.theme-icon-light');
    const darkIcon = document.querySelector('.theme-icon-dark');
    
    if (lightIcon && darkIcon) {
        if (theme === 'dark') {
            lightIcon.style.display = 'none';
            darkIcon.style.display = 'block';
        } else {
            lightIcon.style.display = 'block';
            darkIcon.style.display = 'none';
        }
    }
}

function updateThemeToggleTitle(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.setAttribute('title', theme === 'dark' ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw');
    }
}

// Sidebar collapse functionality
function initializeSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (!sidebarToggle || !sidebar) {
        console.error('Sidebar toggle or sidebar element not found');
        return;
    }
    
    // Load saved sidebar state
    chrome.storage.local.get(['sidebarCollapsed'], (result) => {
        if (result.sidebarCollapsed) {
            sidebar.classList.add('collapsed');
        }
    });
    
    // Add click event listener
    sidebarToggle.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.contains('collapsed');
        
        if (isCollapsed) {
            sidebar.classList.remove('collapsed');
            chrome.storage.local.set({ sidebarCollapsed: false });
        } else {
            sidebar.classList.add('collapsed');
            chrome.storage.local.set({ sidebarCollapsed: true });
        }
        
        // Update session tooltips after collapse state changes
        setTimeout(() => {
            updateSessionTooltips();
        }, 350); // Wait for transition to complete + DOM rendering
    });
    
    // Initialize tooltips
    updateSessionTooltips();
}

function updateSessionTooltips() {
    const sidebar = document.querySelector('.sidebar');
    const sessionItems = document.querySelectorAll('.session-item');
    
    console.log('🔍 [TOOLTIPS] updateSessionTooltips called, collapsed:', sidebar?.classList.contains('collapsed'), 'items found:', sessionItems.length);
    
    if (sidebar && sidebar.classList.contains('collapsed')) {
        sessionItems.forEach((item, index) => {
            const sessionInfo = item.querySelector('.session-info');
            if (sessionInfo) {
                const title = sessionInfo.querySelector('.session-title')?.textContent || 'Sesja';
                const meta = sessionInfo.querySelector('.session-meta')?.textContent || '';
                
                // Create more readable tooltip
                let tooltip = title;
                if (meta) {
                    // Extract date and participants from meta (format: "14.01.2024 15:30 • 3 uczestników • 5 wpisów")
                    const parts = meta.split(' • ');
                    if (parts.length >= 2) {
                        const dateTime = parts[0];
                        const participants = parts[1];
                        tooltip = `${title}\n${dateTime}\n${participants}`;
                    } else {
                        tooltip = `${title}\n${meta}`;
                    }
                }
                
                item.setAttribute('data-tooltip', tooltip);
                console.log('🔍 [TOOLTIPS] Set tooltip for item', index, ':', tooltip);
                console.log('🔍 [TOOLTIPS] Item classes:', item.className);
                console.log('🔍 [TOOLTIPS] data-tooltip attr:', item.getAttribute('data-tooltip'));
            }
        });
    } else {
        sessionItems.forEach(item => {
            item.removeAttribute('data-tooltip');
        });
        console.log('🔍 [TOOLTIPS] Removed all tooltips');
    }
}

// Modal System Functions
function initializeModalSystem() {    
    // ESC key handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                hideModal(openModal.id);
            }
        }
    });
    
    // Initialize confirm modal
    initializeConfirmModal();
    
    // Initialize export modal with proper event handlers
    initializeExportModal();
}

function showModal(modalId, data = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('Modal not found:', modalId);
        return;
    }
    
    // Populate modal with data if provided
    if (data.title) {
        const titleElement = modal.querySelector('.modal-title');
        if (titleElement) titleElement.textContent = data.title;
    }
    
    if (data.message) {
        const messageElement = modal.querySelector('#confirmMessage');
        if (messageElement) messageElement.textContent = data.message;
    }
    
    // Show modal with animation
    modal.style.display = 'flex';
    // Force reflow
    modal.offsetHeight;
    modal.classList.add('show');
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('Modal not found:', modalId);
        return;
    }
    
    // Hide modal with animation
    modal.classList.remove('show');
    
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

function showDeleteConfirmation(sessionId) {
    const session = sessionHistory.find(s => s.id === sessionId);
    if (!session) return;
    
    const confirmModal = document.getElementById('confirmModal');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmOk = document.getElementById('confirmOk');
    const confirmCancel = document.getElementById('confirmCancel');
    
    // Update modal content
    confirmMessage.innerHTML = `
        <p>Czy na pewno chcesz usunąć tę sesję?</p>
        <div class="delete-session-info">
            <div class="delete-session-title">${session.title}</div>
            <div class="delete-session-meta">
                ${new Date(session.date).toLocaleDateString('pl-PL')} • 
                ${session.participantCount} uczestników • 
                ${session.entryCount} wpisów
            </div>
        </div>
        <div class="delete-warning">Ta akcja jest nieodwracalna!</div>
    `;
    
    // Clear previous event listeners
    const newConfirmOk = confirmOk.cloneNode(true);
    const newConfirmCancel = confirmCancel.cloneNode(true);
    confirmOk.parentNode.replaceChild(newConfirmOk, confirmOk);
    confirmCancel.parentNode.replaceChild(newConfirmCancel, confirmCancel);
    
    // Set up event handlers
    newConfirmOk.addEventListener('click', () => {
        performDeleteSession(sessionId);
        hideModal('confirmModal');
    });
    
    newConfirmCancel.addEventListener('click', () => {
        hideModal('confirmModal');
    });
    
    // Change button styling
    newConfirmOk.className = 'btn btn-danger';
    newConfirmOk.textContent = 'Usuń';
    
    showModal('confirmModal', { title: 'Usuń sesję' });
}

function performDeleteSession(sessionId) {    
    sessionHistory = sessionHistory.filter(s => s.id !== sessionId);
    
    // If deleting current session, clear it and show empty session
    if (currentSessionId === sessionId) {
        transcriptData = null;
        currentSessionId = null;
        displayTranscript({ messages: [] });
        updateStats({ messages: [] });
        
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        if (exportTxtBtn) {
            exportTxtBtn.disabled = true;
        }
        
        // Reset timer and duration
        recordingStartTime = null;
        sessionTotalDuration = 0;
        stopDurationTimer();
        
        // Update duration display to show 00:00
        const durationElement = document.getElementById('duration');
        if (durationElement) {
            durationElement.textContent = '00:00';
        }
        
        // Show record button for new session
        const recordBtn = document.getElementById('recordBtn');
        if (recordBtn) {
            recordBtn.style.display = 'flex';
            recordBtn.classList.remove('active');
            const recordText = document.querySelector('.record-text');
            if (recordText) {
                recordText.textContent = 'Rozpocznij nagrywanie';
            }
        }
        
        chrome.storage.local.remove(['transcriptData', 'currentSessionId', 'recordingStartTime', 'sessionTotalDuration', 'currentSessionDuration']);
    }
    
    // Save updated history
    chrome.storage.local.set({ sessionHistory: sessionHistory }, () => {
        renderSessionHistory();
        
        // Update clear button state after deletion
        if (window.updateClearButtonState) {
            window.updateClearButtonState();
        }
        
        updateStatus('Sesja usunięta', 'success');
    });
}

function showResumeOptions() {    
    const resumeModal = document.getElementById('resumeRecordingModal');
    const resumeCancel = document.getElementById('resumeCancel');
    
    if (!resumeModal) {
        console.error('Resume modal not found');
        return;
    }
    
    showModal('resumeRecordingModal');
    
    // Initialize event listeners when showing modal
    initializeResumeModalEventListeners();
    
    // Set up cancel handler
    if (resumeCancel) {
        // Remove existing listeners to prevent duplicates
        resumeCancel.removeEventListener('click', hideResumeModal);
        resumeCancel.addEventListener('click', hideResumeModal);
    } else {
        console.error('Resume cancel button not found');
    }
}

function hideResumeModal() {
    hideModal('resumeRecordingModal');
}

function initializeResumeModalEventListeners() {    
    const resumeOptions = document.querySelectorAll('.resume-option');
    
    if (resumeOptions.length === 0) {
        console.error('No resume options found');
        return;
    }
    
    // Remove existing listeners to prevent duplicates
    resumeOptions.forEach(option => {
        const newOption = option.cloneNode(true);
        option.parentNode.replaceChild(newOption, option);
    });
    
    // Get fresh references after cloning
    const freshOptions = document.querySelectorAll('.resume-option');
    
    freshOptions.forEach((option, index) => {
        option.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            
            // Remove selection from all options
            freshOptions.forEach(opt => opt.classList.remove('selected'));
            // Add selection to clicked option
            this.classList.add('selected');
            
            setTimeout(() => {
                hideModal('resumeRecordingModal');
                
                if (action === 'continue') {
                    // Continue current session
                    continueCurrentSession();
                } else if (action === 'new') {
                    // Start new session
                    saveCurrentSessionToHistory();
                    transcriptData = null;
                    currentSessionId = generateSessionId();
                    recordingStartTime = null;
                    sessionTotalDuration = 0;
                    recordingStopped = false; // Reset recording stopped flag
                    displayTranscript({ messages: [] });
                    updateStats({ messages: [] });
                    chrome.storage.local.set({ 
                        currentSessionId: currentSessionId,
                        recordingStartTime: null,
                        realtimeMode: false
                    });
                    activateRealtimeMode();
                }
            }, 300);
        });
    });
}

function initializeConfirmModal() {    
    const confirmCancel = document.getElementById('confirmCancel');
    const confirmOk = document.getElementById('confirmOk');
    
    if (confirmCancel) {
        confirmCancel.addEventListener('click', () => {
            hideModal('confirmModal');
        });
    } else {
        console.error('Confirm cancel button not found');
    }
}

function initializeExportModal() {    
    // Set up export button handlers directly on existing buttons
    setupExportButtonHandlers();
}

function setupExportButtonHandlers() {    
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    
    if (exportTxtBtn) {
        // Remove existing event listeners to prevent duplication
        exportTxtBtn.replaceWith(exportTxtBtn.cloneNode(true));
        const newExportTxtBtn = document.getElementById('exportTxtBtn');
        
        newExportTxtBtn.addEventListener('click', () => {
            if (!transcriptData) {
                updateStatus('Brak danych do eksportu', 'error');
                return;
            }
            
            const txtContent = generateTxtContent();
            downloadFile(txtContent, 'transkrypcja-google-meet.txt', 'text/plain');
            updateStatus('Wyeksportowano do pliku TXT!', 'success');
            hideModal('exportModal');
        });
    } else {
        console.error('Export TXT button not found');
    }
    
    if (exportJsonBtn) {
        // Remove existing event listeners to prevent duplication
        exportJsonBtn.replaceWith(exportJsonBtn.cloneNode(true));
        const newExportJsonBtn = document.getElementById('exportJsonBtn');
        
        newExportJsonBtn.addEventListener('click', () => {
            if (!transcriptData) {
                updateStatus('Brak danych do eksportu', 'error');
                return;
            }
            
            const jsonContent = generateJsonContent();
            downloadFile(jsonContent, 'transkrypcja-google-meet.json', 'application/json');
            updateStatus('Wyeksportowano do pliku JSON!', 'success');
            hideModal('exportModal');
        });
    } else {
        console.error('Export JSON button not found');
    }
}

function generateTxtContent() {    
    if (!transcriptData || !transcriptData.messages) {
        console.error('No transcript data available');
        return '';
    }
    
    let txtContent = `Transkrypcja Google Meet\n`;
    txtContent += `Data eksportu: ${new Date().toLocaleString('pl-PL')}\n`;
    txtContent += `URL spotkania: ${transcriptData.meetingUrl || 'Nieznany'}\n`;
    txtContent += `=====================================\n\n`;

    transcriptData.messages.forEach(entry => {
        txtContent += `${entry.speaker}`;
        if (entry.timestamp) {
            txtContent += ` [${entry.timestamp}]`;
        }
        txtContent += `:\n${entry.text}\n\n`;
    });

    return txtContent;
}

function generateJsonContent() {    
    if (!transcriptData || !transcriptData.messages) {
        console.error('No transcript data available');
        return '{}';
    }
    
    const jsonData = {
        exportDate: new Date().toISOString(),
        meetingUrl: transcriptData.meetingUrl || 'Nieznany',
        scrapedAt: transcriptData.scrapedAt,
        messages: transcriptData.messages,
        stats: {
            totalEntries: transcriptData.messages.length,
            uniqueParticipants: new Set(transcriptData.messages.map(e => e.speaker)).size
        }
    };

    const jsonContent = JSON.stringify(jsonData, null, 2);
    return jsonContent;
}



// Initialize enhanced interactions
function initializeEnhancedInteractions() {
    // Add ripple effects to buttons
    document.querySelectorAll('.btn, .record-button').forEach(button => {
        addRippleEffect(button);
    });
    
    // Add hover effects to avatars
    document.querySelectorAll('.avatar').forEach(avatar => {
        avatar.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
        });
        
        avatar.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
    
    // Add smooth scrolling to transcript container
    const transcriptContainer = document.getElementById('transcriptContent');
    if (transcriptContainer) {
        transcriptContainer.style.scrollBehavior = 'smooth';
    }
}

// Initialize enhanced interactions when elements are added
function reinitializeEnhancedInteractions() {
    // Re-add ripple effects to newly created buttons
    document.querySelectorAll('.btn:not([data-ripple]), .record-button:not([data-ripple])').forEach(button => {
        button.setAttribute('data-ripple', 'true');
        addRippleEffect(button);
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
}

// Detect changes between old and new messages using hash comparison
function detectChanges(oldMessages, newMessages) {
    const changes = {
        added: [],
        updated: [],
        removed: []
    };
    
    // Create hash maps for fast lookup
    const oldHashes = new Map();
    const newHashes = new Map();
    
    // Map old messages by hash
    if (oldMessages) {
        oldMessages.forEach((msg, index) => {
            oldHashes.set(msg.hash, { ...msg, originalIndex: index });
        });
    }
    
    // Map new messages by hash
    if (newMessages) {
        newMessages.forEach((msg, index) => {
            newHashes.set(msg.hash, { ...msg, originalIndex: index });
        });
    }
    
    // Find added messages (in new but not in old)
    newHashes.forEach((msg, hash) => {
        if (!oldHashes.has(hash)) {
            changes.added.push(msg);
        }
    });
    
    // Find updated messages (same hash but different content - shouldn't happen with hash-based comparison)
    // For now, we'll consider any message with same hash as unchanged
    
    // Find removed messages (in old but not in new)
    oldHashes.forEach((msg, hash) => {
        if (!newHashes.has(hash)) {
            changes.removed.push(msg);
        }
    });
    
    return changes;
}