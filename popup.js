let transcriptData = null;
let realtimeMode = false;
let realtimeInterval = null;
let currentSessionId = null;
let sessionHistory = [];
let recordingStartTime = null;
let durationTimer = null;
let expandedEntries = new Set(); // Track which entries are expanded
let sessionTotalDuration = 0; // Track total session duration across pauses
let baselineEntryCount = 0; // Number of entries before recording starts
let lastSeenEntry = null; // Last entry before recording starts

document.addEventListener('DOMContentLoaded', function() {
    // Debug: Sprawdź rzeczywiste wymiary
    console.log('🔍 Popup dimensions:', {
        width: window.innerWidth,
        height: window.innerHeight,
        bodyWidth: document.body.offsetWidth,
        bodyHeight: document.body.offsetHeight
    });
    
    try {
        const realtimeBtn = document.getElementById('recordBtn');
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        const clearBtn = document.getElementById('clearBtn');
        const statusDiv = document.getElementById('recordingStatus');
        const previewDiv = document.getElementById('transcriptContent');
        const statsDiv = document.getElementById('transcriptStats');
        const exportBtn = document.getElementById('exportBtn');
        const exportModal = document.getElementById('exportModal');
        const themeToggle = document.getElementById('themeToggle');
        
        // Check for essential DOM elements
        if (!realtimeBtn) {
            console.error('Critical error: Record button not found');
            return;
        }
        
        if (!statusDiv) {
            console.error('Critical error: Status div not found');
            return;
        }
        
        if (!previewDiv) {
            console.error('Critical error: Preview div not found');
            return;
        }
    
    // Initialize modal system
    initializeModalSystem();
    
    // Export button handling
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            console.log('Export button clicked');
            if (!transcriptData || !transcriptData.entries || transcriptData.entries.length === 0) {
                updateStatus('Brak danych do eksportu', 'error');
                return;
            }
            showModal('exportModal');
        });
        console.log('Export button handler added');
    } else {
        console.error('Export button not found');
    }
    
    // Modal close handlers
    const modalCloseButtons = document.querySelectorAll('.modal-close');
    console.log('Found', modalCloseButtons.length, 'modal close buttons');
    
    modalCloseButtons.forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modalId = closeBtn.getAttribute('data-modal');
            console.log('Modal close button clicked for modal:', modalId);
            hideModal(modalId);
        });
    });
    
    // Close modal when clicking outside
    const modals = document.querySelectorAll('.modal');
    console.log('Found', modals.length, 'modals');
    
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

    console.log('Popup loaded');

    // Initialize session history
    initializeSessionHistory();
    
    // Theme toggle is initialized in initializeTheme()
    
    // Initialize enhanced interactions
    initializeEnhancedInteractions();
    
    // Listen for background scan updates
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('📨 Popup received message:', request);
        
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
            if (transcriptData && transcriptData.entries.length > 0) {
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
            transcriptData: transcriptData ? transcriptData.entries.length : 0,
            sessionTotalDuration
        });
        // Don't reset sessionTotalDuration or create new session
        await activateRealtimeMode(true); // true = isContinuation
    }

    async function activateRealtimeMode(isContinuation = false) {
        console.log('Activating realtime mode', isContinuation ? '(continuation)' : '(new)');
        
        const realtimeBtn = document.getElementById('recordBtn');
        if (!realtimeBtn) {
            console.error('Record button not found!');
            return;
        }
        
        // Take baseline snapshot for new recordings
        if (!isContinuation) {
            console.log('Taking baseline snapshot before recording');
            await takeBaselineSnapshot();
        }
        
        realtimeMode = true;
        realtimeBtn.classList.add('active');
        document.querySelector('.record-text').textContent = 'Zatrzymaj nagrywanie';
        updateStatus('Nagrywanie aktywne - skanowanie w tle', 'info');
        
        // Set recording start time only for new recordings
        recordingStartTime = new Date();
        
        // Start duration timer
        startDurationTimer();
        
        // Create new session if none exists (only for new recordings)
        if (!currentSessionId) {
            currentSessionId = generateSessionId();
            chrome.storage.local.set({ currentSessionId: currentSessionId });
            
            // Create initial session entry in history only for new sessions
            if (!isContinuation) {
                const initialSession = {
                    id: currentSessionId,
                    title: generateSessionTitle(),
                    date: new Date().toISOString(),
                    participantCount: 0,
                    entryCount: 0,
                    transcript: { entries: [] },
                    totalDuration: 0
                };
                
                sessionHistory.unshift(initialSession);
                chrome.storage.local.set({ sessionHistory: sessionHistory }, () => {
                    renderSessionHistory();
                });
            }
        }
        
        // Zapisz stan
        chrome.storage.local.set({ realtimeMode: true, recordingStartTime: recordingStartTime.toISOString() });
        
        // Uruchom skanowanie w tle
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url.includes('meet.google.com')) {
                // Rozpocznij skanowanie w tle
                chrome.runtime.sendMessage({
                    action: 'startBackgroundScanning',
                    tabId: tab.id
                }, (response) => {
                    if (response && response.success) {
                        console.log('✅ Background scanning started');
                        updateStatus('Nagrywanie aktywne - skanowanie w tle', 'success');
                    } else {
                        console.error('❌ Failed to start background scanning');
                        updateStatus('Błąd uruchomienia skanowania w tle', 'error');
                    }
                });
                
                // Natychmiastowe pierwsze pobranie
                performRealtimeScrape();
                
                // Ustaw interwał pobierania co 2 sekundy (jako backup)
                realtimeInterval = setInterval(performRealtimeScrape, 2000);
            }
        } catch (error) {
            console.error('Error starting realtime mode:', error);
            updateStatus('Błąd uruchomienia trybu rzeczywistego', 'error');
        }
    }

    function deactivateRealtimeMode() {
        console.log('Deactivating realtime mode');
        
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
        
        // Always save session when stopping recording
        if (transcriptData && transcriptData.entries.length > 0) {
            saveCurrentSessionToHistory();
        }
        
        // Zapisz stan
        chrome.storage.local.set({ realtimeMode: false, recordingStartTime: null });
        
        // Zatrzymaj skanowanie w tle
        chrome.runtime.sendMessage({
            action: 'stopBackgroundScanning'
        }, (response) => {
            if (response && response.success) {
                console.log('✅ Background scanning stopped');
            } else {
                console.error('❌ Failed to stop background scanning');
            }
        });
        
        // Wyczyść interwał
        if (realtimeInterval) {
            clearInterval(realtimeInterval);
            realtimeInterval = null;
        }
    }

    async function takeBaselineSnapshot() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url.includes('meet.google.com')) {
                console.log('Not on Google Meet, skipping baseline');
                baselineEntryCount = 0;
                lastSeenEntry = null;
                return;
            }
            
            return new Promise((resolve) => {
                chrome.tabs.sendMessage(tab.id, { action: 'scrapeTranscript', realtime: false }, (response) => {
                    if (chrome.runtime.lastError || !response || !response.success) {
                        console.log('Could not get baseline, starting fresh');
                        baselineEntryCount = 0;
                        lastSeenEntry = null;
                        resolve();
                        return;
                    }
                    
                    if (response.data && response.data.entries) {
                        baselineEntryCount = response.data.entries.length;
                        if (baselineEntryCount > 0) {
                            lastSeenEntry = response.data.entries[baselineEntryCount - 1];
                            console.log(`Baseline: ${baselineEntryCount} entries, last: "${lastSeenEntry.speaker}: ${lastSeenEntry.text.substring(0, 50)}..."`);
                        } else {
                            console.log('Baseline: No existing entries');
                        }
                    }
                    resolve();
                });
            });
        } catch (error) {
            console.error('Error taking baseline:', error);
            baselineEntryCount = 0;
            lastSeenEntry = null;
        }
    }

    async function performRealtimeScrape() {
        console.log('🔄 performRealtimeScrape called');
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('📍 Current tab:', tab.url);
            
            if (!tab.url.includes('meet.google.com')) {
                deactivateRealtimeMode();
                updateStatus('Opuściłeś Google Meet - nagrywanie zatrzymane', 'error');
                return;
            }

            console.log('📤 Sending scrapeTranscript message to tab:', tab.id);
            chrome.tabs.sendMessage(tab.id, { action: 'scrapeTranscript', realtime: true }, (response) => {
                console.log('📥 Response received:', response);
                
                if (chrome.runtime.lastError) {
                    console.error('Realtime error:', chrome.runtime.lastError);
                    updateStatus('Nie można połączyć się ze stroną. Odśwież Google Meet.', 'error');
                    deactivateRealtimeMode();
                    return;
                }

                if (response && response.success) {
                    console.log('✅ Data received:', response.data);
                    
                    if (response.data.entries.length > 0) {
                        // Filter out baseline entries for new recordings
                        let entriesToProcess = response.data.entries;
                        
                        if (baselineEntryCount > 0 && !transcriptData) {
                            // First scrape after recording started - skip baseline entries
                            console.log(`Filtering out first ${baselineEntryCount} baseline entries`);
                            entriesToProcess = response.data.entries.slice(baselineEntryCount);
                            
                            if (entriesToProcess.length === 0) {
                                console.log('No new entries after baseline');
                                return;
                            }
                        }
                        
                        // Merge new data with existing
                        if (!transcriptData) {
                            transcriptData = {
                                entries: entriesToProcess,
                                scrapedAt: response.data.scrapedAt,
                                meetingUrl: response.data.meetingUrl
                            };
                        } else {
                            // Inteligentne scalanie - sprawdź czy ostatni wpis należy do tej samej osoby
                            const newEntries = entriesToProcess;
                            let hasChanges = false;
                            
                            console.log(`🔄 Przetwarzam ${newEntries.length} nowych wpisów`);
                            
                            for (const newEntry of newEntries) {
                                console.log(`🔍 Sprawdzam wpis: "${newEntry.speaker}": "${newEntry.text.substring(0, 50)}..."`);
                                
                                const existingIndex = transcriptData.entries.findIndex(e => 
                                    (e.speaker === newEntry.speaker && e.timestamp === newEntry.timestamp) ||
                                    (e.speaker === newEntry.speaker && e.text === newEntry.text)
                                );
                                
                                if (existingIndex >= 0) {
                                    // Aktualizuj istniejący wpis jeśli tekst się zmienił
                                    if (transcriptData.entries[existingIndex].text !== newEntry.text) {
                                        console.log(`🔄 Aktualizuję istniejący wpis #${existingIndex}`);
                                        transcriptData.entries[existingIndex].text = newEntry.text;
                                        transcriptData.entries[existingIndex].timestamp = newEntry.timestamp;
                                        hasChanges = true;
                                    } else {
                                        console.log(`⚫ Wpis #${existingIndex} bez zmian`);
                                    }
                                } else {
                                    // Sprawdź czy to kontynuacja ostatniego wpisu tej samej osoby
                                    const lastEntry = transcriptData.entries[transcriptData.entries.length - 1];
                                    if (lastEntry && lastEntry.speaker === newEntry.speaker && 
                                        !lastEntry.timestamp && !newEntry.timestamp) {
                                        // Aktualizuj ostatni wpis zamiast dodawać nowy
                                        console.log(`🔄 Aktualizuję kontynuację ostatniego wpisu: "${lastEntry.speaker}"`);
                                        lastEntry.text = newEntry.text;
                                        lastEntry.timestamp = newEntry.timestamp;
                                        hasChanges = true;
                                    } else {
                                        // Dodaj nowy wpis
                                        console.log(`➕ Dodaję nowy wpis: "${newEntry.speaker}"`);
                                        transcriptData.entries.push(newEntry);
                                        hasChanges = true;
                                    }
                                }
                            }
                            
                            if (hasChanges) {
                                transcriptData.scrapedAt = response.data.scrapedAt;
                                
                                // Animacja dla nowych wpisów
                                displayTranscript(transcriptData);
                                
                                // Przewiń do nowych wpisów
                                const preview = document.getElementById('transcriptContent');
                                preview.scrollTop = preview.scrollHeight;
                                
                                // Auto-save session to history on every update
                                autoSaveCurrentSession();
                                
                                updateStatus(`Nagrywanie... (${transcriptData.entries.length} wpisów)`, 'info');
                                                }
                        }
                        
                        updateStats(transcriptData);
                        exportTxtBtn.disabled = false;
                        
                        // Zapisz dane
                        chrome.storage.local.set({ transcriptData: transcriptData });
                    } else {
                        console.log('⚠️ No entries found in transcript');
                        updateStatus('Czekam na napisy... Upewnij się, że są włączone', 'info');
                    }
                } else {
                    console.log('❌ Response not successful:', response);
                    updateStatus('Nie znaleziono napisów. Włącz napisy (CC) w Google Meet', 'error');
                }
            });
        } catch (error) {
            console.error('Realtime scrape error:', error);
            updateStatus('Błąd: ' + error.message, 'error');
        }
    }

    function handleBackgroundScanUpdate(data) {
        console.log('🔄 Handling background scan update:', data);
        
        if (!data || !data.entries || data.entries.length === 0) {
            console.log('⚠️ No entries in background scan update');
            return;
        }
        
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        
        if (!transcriptData) {
            transcriptData = data;
            console.log('✅ Initialized transcript data from background scan');
        } else {
            // Merge new entries with existing ones
            const newEntries = data.entries;
            let hasChanges = false;
            
            console.log(`🔄 Processing ${newEntries.length} entries from background scan`);
            
            for (const newEntry of newEntries) {
                const existingIndex = transcriptData.entries.findIndex(e => 
                    (e.speaker === newEntry.speaker && e.timestamp === newEntry.timestamp) ||
                    (e.speaker === newEntry.speaker && e.text === newEntry.text)
                );
                
                if (existingIndex >= 0) {
                    // Update existing entry if text changed
                    if (transcriptData.entries[existingIndex].text !== newEntry.text) {
                        console.log(`🔄 Updating existing entry #${existingIndex}`);
                        transcriptData.entries[existingIndex].text = newEntry.text;
                        transcriptData.entries[existingIndex].timestamp = newEntry.timestamp;
                        hasChanges = true;
                    }
                } else {
                    // Add new entry
                    console.log(`➕ Adding new entry: "${newEntry.speaker}"`);
                    transcriptData.entries.push(newEntry);
                    hasChanges = true;
                }
            }
            
            if (hasChanges) {
                transcriptData.scrapedAt = data.scrapedAt;
                console.log('✅ Background scan brought new changes');
                
                // Only update display if there are actual changes
                displayTranscript(transcriptData);
                updateStats(transcriptData);
                
                if (exportTxtBtn) {
                    exportTxtBtn.disabled = false;
                }
                
                // Scroll to bottom
                const preview = document.getElementById('transcriptContent');
                if (preview) {
                    preview.scrollTop = preview.scrollHeight;
                }
                
                // Auto-save session to history on every update
                autoSaveCurrentSession();
                
                updateStatus(`Nagrywanie w tle... (${transcriptData.entries.length} wpisów)`, 'info');
            }
        }
        
        // Save to storage
        chrome.storage.local.set({ transcriptData: transcriptData });
        
        console.log('🔄 Background scan update processed successfully');
    }

    // Wyczyść transkrypcję
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            console.log('Clear button clicked');
            
            if (confirm('Czy na pewno chcesz wyczyścić całą transkrypcję?')) {
                // Stop recording if active (auto-save will handle the session)
                if (realtimeMode) {
                    deactivateRealtimeMode();
                }
                
                transcriptData = null;
                currentSessionId = null;
                displayTranscript({ entries: [] });
                updateStats({ entries: [] });
                if (exportTxtBtn) exportTxtBtn.disabled = true;
                updateStatus('Transkrypcja wyczyszczona', 'info');
                
                // Wyczyść z pamięci
                chrome.storage.local.remove(['transcriptData', 'currentSessionId']);
            }
        });
        console.log('Clear button handler added');
    } else {
        console.error('Clear button not found');
    }

    // Export handlers will be set up by the modal system
    } catch (error) {
        console.error('Error during popup initialization:', error);
        updateStatus('Błąd inicjalizacji interfejsu', 'error');
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

    if (!data || !data.entries || data.entries.length === 0) {
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

    // Pokaż pierwsze 10 wpisów
    const entriesToShow = data.entries.slice(0, 10);
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

    if (data.entries.length > 10) {
        const moreDiv = document.createElement('div');
        moreDiv.style.textAlign = 'center';
        moreDiv.style.color = '#666';
        moreDiv.style.margin = '20px 0 10px 0';
        moreDiv.style.fontSize = '13px';
        moreDiv.textContent = `... i ${data.entries.length - 10} więcej wiadomości`;
        previewDiv.appendChild(moreDiv);
    }
    
    // Reinitialize enhanced interactions for new elements
    reinitializeEnhancedInteractions();
}

function updateStats(data) {
    const statsDiv = document.getElementById('transcriptStats');
    const entryCountSpan = document.getElementById('entryCount');
    const participantCountSpan = document.getElementById('participantCount');
    const durationSpan = document.getElementById('duration');

    if (!statsDiv || !entryCountSpan || !participantCountSpan || !durationSpan) {
        console.error('Stats elements not found');
        return;
    }

    if (!data || !data.entries) {
        console.error('Invalid data provided to updateStats');
        return;
    }

    const uniqueParticipants = new Set(data.entries.map(e => e.speaker)).size;

    // Update stats
    entryCountSpan.textContent = data.entries.length;
    participantCountSpan.textContent = uniqueParticipants;
    
    // Duration is now handled by the continuous timer
    // Only update duration if we're not in realtime mode
    if (!realtimeMode) {
        updateDurationDisplay();
    }
    
    statsDiv.style.display = 'block';
    
}

function startDurationTimer() {
    console.log('Starting duration timer');
    
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
    console.log('Stopping duration timer');
    
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
        const minutes = Math.floor(totalDuration / 60);
        const seconds = totalDuration % 60;
        durationSpan.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        const minutes = Math.floor(sessionTotalDuration / 60);
        const seconds = sessionTotalDuration % 60;
        durationSpan.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
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
    console.log('Downloading file:', filename, 'Type:', mimeType);
    
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
                console.log('Download started with ID:', downloadId);
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
    console.log('Initializing session history');
    
    // Load session history from storage
    chrome.storage.local.get(['sessionHistory'], (result) => {
        try {
            sessionHistory = result.sessionHistory || [];
            console.log('Loaded session history:', sessionHistory.length, 'sessions');
            renderSessionHistory();
        } catch (error) {
            console.error('Error loading session history:', error);
            sessionHistory = [];
            renderSessionHistory();
        }
    });
    
    // Add event listeners for history UI
    const newSessionBtn = document.getElementById('newSessionBtn');
    if (newSessionBtn) {
        // Remove existing event listeners to prevent duplicates
        newSessionBtn.removeEventListener('click', createNewSession);
        newSessionBtn.addEventListener('click', createNewSession);
        console.log('New session button event listener added');
    } else {
        console.error('New session button not found');
    }
}

function createNewSession() {
    console.log('Creating new session');
    
    // Stop recording if active (auto-save will handle the session)
    if (realtimeMode) {
        deactivateRealtimeMode();
    }
    
    // Create new session (no need to ask about saving - auto-save handles it)
    performNewSessionCreation();
}


function performNewSessionCreation() {
    console.log('Performing new session creation');
    
    // Clear current data
    transcriptData = null;
    currentSessionId = generateSessionId();
    recordingStartTime = null;
    sessionTotalDuration = 0; // Reset total duration for new session
    baselineEntryCount = 0; // Reset baseline for new session
    lastSeenEntry = null;
    
    // Stop any existing timer
    stopDurationTimer();
    
    displayTranscript({ entries: [] });
    updateStats({ entries: [] });
    
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    if (exportTxtBtn) {
        exportTxtBtn.disabled = true;
    }
    
    // Save new session ID (recording is always inactive for new sessions)
    chrome.storage.local.set({ 
        currentSessionId: currentSessionId, 
        recordingStartTime: null,
        realtimeMode: false
    });
    
    updateStatus('Utworzono nową sesję', 'success');
    
    console.log('New session created with ID:', currentSessionId);
}

function autoSaveCurrentSession() {
    if (!transcriptData || transcriptData.entries.length === 0) {
        return;
    }
    
    const sessionId = currentSessionId || generateSessionId();
    const uniqueParticipants = new Set(transcriptData.entries.map(e => e.speaker)).size;
    
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
    
    const session = {
        id: sessionId,
        title: generateSessionTitle(),
        date: originalDate, // Preserve original date or set new one
        participantCount: uniqueParticipants,
        entryCount: transcriptData.entries.length,
        transcript: transcriptData,
        totalDuration: currentTotalDuration
    };
    
    if (existingIndex >= 0) {
        sessionHistory[existingIndex] = session;
    } else {
        sessionHistory.unshift(session);
    }
    
    // Limit history to 50 sessions
    if (sessionHistory.length > 50) {
        sessionHistory = sessionHistory.slice(0, 50);
    }
    
    // Save to storage silently (no status message)
    chrome.storage.local.set({ sessionHistory: sessionHistory }, () => {
        renderSessionHistory();
    });
}

function saveCurrentSessionToHistory() {
    if (!transcriptData || transcriptData.entries.length === 0) {
        console.log('No transcript data to save');
        return;
    }
    
    const sessionId = currentSessionId || generateSessionId();
    const uniqueParticipants = new Set(transcriptData.entries.map(e => e.speaker)).size;
    
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
        entryCount: transcriptData.entries.length,
        transcript: transcriptData,
        totalDuration: currentTotalDuration
    };
    
    console.log('Saving session to history:', session.title);
    
    // Check if session already exists and update it
    const existingIndex = sessionHistory.findIndex(s => s.id === sessionId);
    if (existingIndex >= 0) {
        sessionHistory[existingIndex] = session;
        console.log('Updated existing session at index:', existingIndex);
    } else {
        // Add new session at the beginning
        sessionHistory.unshift(session);
        console.log('Added new session to history');
    }
    
    // Limit history to 50 sessions
    if (sessionHistory.length > 50) {
        sessionHistory = sessionHistory.slice(0, 50);
        console.log('Trimmed history to 50 sessions');
    }
    
    // Save to storage
    chrome.storage.local.set({ sessionHistory: sessionHistory }, () => {
        renderSessionHistory();
        updateStatus('Sesja zapisana w historii', 'success');
        console.log('Session saved to storage');
    });
}

function loadSessionFromHistory(sessionId) {
    console.log('Loading session from history:', sessionId);
    
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
    console.log('Session loaded successfully:', session.title);
}

function deleteSessionFromHistory(sessionId, event) {
    event.stopPropagation(); // Prevent triggering the load action
    
    showDeleteConfirmation(sessionId);
}

function renderSessionHistory() {
    console.log('Rendering session history:', sessionHistory.length, 'sessions');
    
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
    
    console.log('Session history rendered successfully');
    
    // Reinitialize enhanced interactions for session items
    reinitializeEnhancedInteractions();
}

// Auto-save functionality
setInterval(() => {
    if (transcriptData && transcriptData.entries.length > 0 && currentSessionId) {
        // Auto-save current session
        const existingIndex = sessionHistory.findIndex(s => s.id === currentSessionId);
        if (existingIndex >= 0) {
            // Update existing session silently
            const uniqueParticipants = new Set(transcriptData.entries.map(e => e.speaker)).size;
            sessionHistory[existingIndex].transcript = transcriptData;
            sessionHistory[existingIndex].participantCount = uniqueParticipants;
            sessionHistory[existingIndex].entryCount = transcriptData.entries.length;
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
        console.log('Theme toggle handler added');
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

// Modal System Functions
function initializeModalSystem() {
    console.log('Initializing modal system');
    
    // ESC key handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                console.log('ESC key pressed, closing modal:', openModal.id);
                hideModal(openModal.id);
            }
        }
    });
    
    // Initialize resume recording modal
    initializeResumeRecordingModal();
    
    // Initialize confirm modal
    initializeConfirmModal();
    
    // Initialize export modal with proper event handlers
    initializeExportModal();
}

function showModal(modalId, data = {}) {
    console.log('Showing modal:', modalId);
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
    console.log('Hiding modal:', modalId);
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
    console.log('Deleting session:', sessionId);
    
    sessionHistory = sessionHistory.filter(s => s.id !== sessionId);
    
    // If deleting current session, clear it
    if (currentSessionId === sessionId) {
        transcriptData = null;
        currentSessionId = null;
        displayTranscript({ entries: [] });
        updateStats({ entries: [] });
        
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        if (exportTxtBtn) {
            exportTxtBtn.disabled = true;
        }
        
        chrome.storage.local.remove(['transcriptData', 'currentSessionId']);
        console.log('Cleared current session data');
    }
    
    // Save updated history
    chrome.storage.local.set({ sessionHistory: sessionHistory }, () => {
        renderSessionHistory();
        updateStatus('Sesja usunięta', 'success');
        console.log('Session deleted successfully');
    });
}

function showResumeOptions() {
    console.log('Showing resume options');
    
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
        console.log('Resume cancel handler added');
    } else {
        console.error('Resume cancel button not found');
    }
}

function hideResumeModal() {
    console.log('Hiding resume modal');
    hideModal('resumeRecordingModal');
}

function initializeResumeModalEventListeners() {
    console.log('Initializing resume modal event listeners');
    
    const resumeOptions = document.querySelectorAll('.resume-option');
    console.log('Found resume options:', resumeOptions.length);
    
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
        console.log(`Adding click listener to option ${index}:`, option.getAttribute('data-action'));
        option.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            console.log('Resume option clicked:', action);
            
            // Remove selection from all options
            freshOptions.forEach(opt => opt.classList.remove('selected'));
            // Add selection to clicked option
            this.classList.add('selected');
            
            setTimeout(() => {
                hideModal('resumeRecordingModal');
                
                if (action === 'continue') {
                    // Continue current session
                    console.log('Continuing current session from modal');
                    continueCurrentSession();
                } else if (action === 'new') {
                    // Start new session
                    console.log('Starting new session from modal');
                    saveCurrentSessionToHistory();
                    transcriptData = null;
                    currentSessionId = generateSessionId();
                    recordingStartTime = null;
                    sessionTotalDuration = 0;
                    baselineEntryCount = 0; // Reset baseline
                    lastSeenEntry = null;
                    displayTranscript({ entries: [] });
                    updateStats({ entries: [] });
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

function initializeResumeRecordingModal() {
    // Event listeners are now initialized when modal is shown
    // This function is kept for backward compatibility
    console.log('Resume recording modal initialization (deferred to show)');
}

function initializeConfirmModal() {
    console.log('Initializing confirm modal');
    
    const confirmCancel = document.getElementById('confirmCancel');
    const confirmOk = document.getElementById('confirmOk');
    
    if (confirmCancel) {
        confirmCancel.addEventListener('click', () => {
            console.log('Confirm cancel clicked');
            hideModal('confirmModal');
        });
        console.log('Confirm cancel handler added');
    } else {
        console.error('Confirm cancel button not found');
    }
    
    if (confirmOk) {
        console.log('Confirm OK button found');
    } else {
        console.error('Confirm OK button not found');
    }
}

function initializeExportModal() {
    console.log('Initializing export modal');
    
    // Set up export button handlers directly on existing buttons
    setupExportButtonHandlers();
}

function setupExportButtonHandlers() {
    console.log('Setting up export button handlers');
    
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    
    if (exportTxtBtn) {
        // Remove existing event listeners to prevent duplication
        exportTxtBtn.replaceWith(exportTxtBtn.cloneNode(true));
        const newExportTxtBtn = document.getElementById('exportTxtBtn');
        
        newExportTxtBtn.addEventListener('click', () => {
            console.log('Export TXT button clicked');
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
            console.log('Export JSON button clicked');
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
    console.log('Generating TXT content');
    
    if (!transcriptData || !transcriptData.entries) {
        console.error('No transcript data available');
        return '';
    }
    
    let txtContent = `Transkrypcja Google Meet\n`;
    txtContent += `Data eksportu: ${new Date().toLocaleString('pl-PL')}\n`;
    txtContent += `URL spotkania: ${transcriptData.meetingUrl || 'Nieznany'}\n`;
    txtContent += `=====================================\n\n`;

    transcriptData.entries.forEach(entry => {
        txtContent += `${entry.speaker}`;
        if (entry.timestamp) {
            txtContent += ` [${entry.timestamp}]`;
        }
        txtContent += `:\n${entry.text}\n\n`;
    });

    console.log('TXT content generated, length:', txtContent.length);
    return txtContent;
}

function generateJsonContent() {
    console.log('Generating JSON content');
    
    if (!transcriptData || !transcriptData.entries) {
        console.error('No transcript data available');
        return '{}';
    }
    
    const jsonData = {
        exportDate: new Date().toISOString(),
        meetingUrl: transcriptData.meetingUrl || 'Nieznany',
        scrapedAt: transcriptData.scrapedAt,
        entries: transcriptData.entries,
        stats: {
            totalEntries: transcriptData.entries.length,
            uniqueParticipants: new Set(transcriptData.entries.map(e => e.speaker)).size
        }
    };

    const jsonContent = JSON.stringify(jsonData, null, 2);
    console.log('JSON content generated, length:', jsonContent.length);
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