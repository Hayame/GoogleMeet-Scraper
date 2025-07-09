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
let isFirstUpdate = false; // Track if this is the first update after recording starts
let isFirstBackgroundScan = false; // Track if this is the first background scan after recording starts
let recordingStopped = false; // Flag to ignore background updates after recording stops
let processingScan = false; // Mutex to prevent race conditions between manual and background scanning

document.addEventListener('DOMContentLoaded', function() {
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
            if (!transcriptData || !transcriptData.entries || transcriptData.entries.length === 0) {
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

    console.log('Popup loaded');

    // Initialize session history
    initializeSessionHistory();
    
    // Theme toggle is initialized in initializeTheme()
    
    // Initialize enhanced interactions
    initializeEnhancedInteractions();
    
    // Restore state from storage (recording status, timer, etc.)
    restoreStateFromStorage();
    
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
    chrome.storage.local.get(['realtimeMode', 'transcriptData', 'currentSessionId', 'recordingStartTime', 'baselineEntryCount'], (result) => {
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
        if (result.baselineEntryCount) {
            baselineEntryCount = result.baselineEntryCount;
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
        const activationTime = new Date().toISOString();
        console.log('🟢 [ACTIVATION DEBUG] Starting realtime mode at:', activationTime);
        console.log('🟢 [ACTIVATION DEBUG] Is continuation:', isContinuation);
        
        const realtimeBtn = document.getElementById('recordBtn');
        if (!realtimeBtn) {
            console.error('Record button not found!');
            return;
        }
        
        // Take baseline snapshot for new recordings
        if (!isContinuation) {
            console.log('🟢 [ACTIVATION DEBUG] Taking baseline snapshot before recording');
            await takeBaselineSnapshot();
            isFirstUpdate = true; // Mark that we need to filter the first update
            isFirstBackgroundScan = true; // Mark that we need to filter the first background scan
            console.log('🟢 [ACTIVATION DEBUG] Baseline snapshot complete, isFirstUpdate set to:', isFirstUpdate);
            console.log('🟢 [ACTIVATION DEBUG] isFirstBackgroundScan set to:', isFirstBackgroundScan);
        } else {
            console.log('🟢 [ACTIVATION DEBUG] Skipping baseline snapshot for continuation');
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
            recordingStartTime: recordingStartTime.toISOString(),
            baselineEntryCount: baselineEntryCount
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
                
                // Natychmiastowe pierwsze pobranie
                console.log('🟢 [ACTIVATION DEBUG] Performing immediate first scrape');
                performRealtimeScrape();
                
                // Ustaw interwał pobierania co 2 sekundy (jako backup)
                console.log('🟢 [ACTIVATION DEBUG] Setting up 2-second interval backup');
                realtimeInterval = setInterval(performRealtimeScrape, 2000);
            }
        } catch (error) {
            console.error('Error starting realtime mode:', error);
            updateStatus('Błąd uruchomienia trybu rzeczywistego', 'error');
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
        if (transcriptData && transcriptData.entries.length > 0) {
            saveCurrentSessionToHistory();
        }
        
        // Clear transcript data and baseline info from storage
        transcriptData = null;
        baselineEntryCount = 0;
        lastSeenEntry = null;
        
        // Zapisz stan
        chrome.storage.local.set({ 
            realtimeMode: false, 
            recordingStartTime: null,
            transcriptData: null,
            baselineEntryCount: 0
        });
        
        // Wyczyść interwał
        if (realtimeInterval) {
            clearInterval(realtimeInterval);
            realtimeInterval = null;
        }
    }

    async function takeBaselineSnapshot() {
        const startTime = Date.now();
        console.log('🔵 [BASELINE DEBUG] Starting baseline snapshot at:', new Date().toISOString());
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url.includes('meet.google.com')) {
                console.log('🔵 [BASELINE DEBUG] Not on Google Meet, skipping baseline');
                baselineEntryCount = 0;
                lastSeenEntry = null;
                return;
            }
            
            console.log('🔵 [BASELINE DEBUG] Sending scrapeTranscript message to tab:', tab.id);
            
            return new Promise((resolve) => {
                chrome.tabs.sendMessage(tab.id, { action: 'scrapeTranscript', realtime: false }, (response) => {
                    const endTime = Date.now();
                    const duration = endTime - startTime;
                    
                    if (chrome.runtime.lastError || !response || !response.success) {
                        console.log('🔵 [BASELINE DEBUG] Could not get baseline, starting fresh. Duration:', duration + 'ms');
                        baselineEntryCount = 0;
                        lastSeenEntry = null;
                        resolve();
                        return;
                    }
                    
                    if (response.data && response.data.entries) {
                        baselineEntryCount = response.data.entries.length;
                        if (baselineEntryCount > 0) {
                            lastSeenEntry = response.data.entries[baselineEntryCount - 1];
                            console.log('🔵 [BASELINE DEBUG] Baseline captured successfully:');
                            console.log('   - Entry count:', baselineEntryCount);
                            console.log('   - Last entry speaker:', lastSeenEntry.speaker);
                            console.log('   - Last entry text preview:', lastSeenEntry.text.substring(0, 50) + '...');
                            console.log('   - Duration:', duration + 'ms');
                            console.log('   - Timestamp:', new Date().toISOString());
                        } else {
                            console.log('🔵 [BASELINE DEBUG] Baseline: No existing entries found. Duration:', duration + 'ms');
                        }
                    } else {
                        console.log('🔵 [BASELINE DEBUG] No data in response. Duration:', duration + 'ms');
                        baselineEntryCount = 0;
                        lastSeenEntry = null;
                    }
                    
                    console.log('🔵 [BASELINE DEBUG] Baseline snapshot completed at:', new Date().toISOString());
                    resolve();
                });
            });
        } catch (error) {
            console.error('🔵 [BASELINE DEBUG] Error taking baseline:', error);
            baselineEntryCount = 0;
            lastSeenEntry = null;
        }
    }

    async function performRealtimeScrape() {
        // Prevent race conditions
        if (processingScan) {
            console.log('🔵 [MANUAL SCRAPE DEBUG] Skipping - already processing scan');
            return;
        }
        
        processingScan = true;
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('📍 Current tab:', tab.url);
            
            if (!tab.url.includes('meet.google.com')) {
                deactivateRealtimeMode();
                updateStatus('Opuściłeś Google Meet - nagrywanie zatrzymane', 'error');
                processingScan = false; // Release mutex
                return;
            }

            chrome.tabs.sendMessage(tab.id, { action: 'scrapeTranscript', realtime: true }, (response) => {
                console.log('📥 Response received:', response);
                
                if (chrome.runtime.lastError) {
                    console.error('Realtime error:', chrome.runtime.lastError);
                    updateStatus('Nie można połączyć się ze stroną. Odśwież Google Meet.', 'error');
                    deactivateRealtimeMode();
                    processingScan = false; // Release mutex
                    return;
                }

                if (response && response.success) {                    
                    if (response.data.entries.length > 0) {
                        // Use centralized filtering for manual scraping
                        const filteredResult = getFilteredEntries(response.data, '🔵 [MANUAL SCRAPE DEBUG]');
                        
                        if (filteredResult.entries.length === 0) {
                            console.log('🔵 [MANUAL SCRAPE DEBUG] No new entries after baseline filtering');
                            processingScan = false; // Release mutex
                            return;
                        }
                        
                        const entriesToProcess = filteredResult.entries;
                        
                        // Reset first update flag after first successful processing
                        if (isFirstUpdate) {
                            isFirstUpdate = false;
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
                                                        
                            for (const newEntry of newEntries) {                                
                                const existingIndex = transcriptData.entries.findIndex(e => 
                                    (e.speaker === newEntry.speaker && e.timestamp === newEntry.timestamp) ||
                                    (e.speaker === newEntry.speaker && e.text === newEntry.text)
                                );
                                
                                if (existingIndex >= 0) {
                                    // Aktualizuj istniejący wpis jeśli tekst się zmienił
                                    if (transcriptData.entries[existingIndex].text !== newEntry.text) {
                                        transcriptData.entries[existingIndex].text = newEntry.text;
                                        transcriptData.entries[existingIndex].timestamp = newEntry.timestamp;
                                        hasChanges = true;
                                    }
                                } else {
                                    // Sprawdź czy to kontynuacja ostatniego wpisu tej samej osoby
                                    const lastEntry = transcriptData.entries[transcriptData.entries.length - 1];
                                    if (lastEntry && lastEntry.speaker === newEntry.speaker && 
                                        !lastEntry.timestamp && !newEntry.timestamp) {
                                        // Aktualizuj ostatni wpis zamiast dodawać nowy
                                        lastEntry.text = newEntry.text;
                                        lastEntry.timestamp = newEntry.timestamp;
                                        hasChanges = true;
                                    } else {
                                        // Dodaj nowy wpis
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
                                autoSaveCurrentSession(filteredResult);
                                
                                updateStatus(`Nagrywanie... (${transcriptData.entries.length} wpisów)`, 'info');
                                                }
                        }
                        
                        // Use the same filtered data for stats to avoid re-filtering with stale lastSeenEntry
                        // Update stats after brief delay to ensure chat renders first
                        setTimeout(() => updateStats(transcriptData, filteredResult), 10);
                        exportTxtBtn.disabled = false;
                        
                        // Zapisz dane
                        chrome.storage.local.set({ transcriptData: transcriptData });
                    } else {
                        console.log('⚠️ No entries found in transcript');
                        updateStatus('Czekam na napisy... Upewnij się, że są włączone', 'info');
                        processingScan = false; // Release mutex
                    }
                } else {
                    console.log('❌ Response not successful:', response);
                    updateStatus('Nie znaleziono napisów. Włącz napisy (CC) w Google Meet', 'error');
                    processingScan = false; // Release mutex
                }
                
                // Release mutex after processing
                processingScan = false;
            });
        } catch (error) {
            console.error('Realtime scrape error:', error);
            updateStatus('Błąd: ' + error.message, 'error');
            processingScan = false; // Release mutex on error
        } finally {
            // Ensure mutex is released if deactivateRealtimeMode was called
            if (!realtimeMode) {
                processingScan = false;
            }
        }
    }

    async function getCurrentTabId() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab.id;
    }

    async function restoreStateFromStorage() {
        try {
            console.log('🔄 [RESTORE] Restoring state from storage');
            
            const result = await chrome.storage.local.get([
                'realtimeMode', 
                'recordingStartTime', 
                'transcriptData',
                'currentSessionId',
                'sessionTotalDuration',
                'baselineEntryCount',
                'lastSeenEntry'
            ]);
            
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
                
                // Restore baseline data
                if (result.baselineEntryCount) {
                    baselineEntryCount = result.baselineEntryCount;
                }
                
                if (result.lastSeenEntry) {
                    lastSeenEntry = result.lastSeenEntry;
                }
                
                // Update UI to show recording state
                const realtimeBtn = document.getElementById('recordBtn');
                if (realtimeBtn) {
                    realtimeBtn.classList.add('active');
                    document.querySelector('.record-text').textContent = 'Zatrzymaj nagrywanie';
                }
                
                updateStatus('Nagrywanie wznowione', 'success');
            }
            
            // Restore transcript data
            if (result.transcriptData) {
                console.log('🔄 [RESTORE] Restoring transcript data');
                transcriptData = result.transcriptData;
                displayTranscript(transcriptData);
                updateStats(transcriptData);
                
                const exportTxtBtn = document.getElementById('exportTxtBtn');
                if (exportTxtBtn && transcriptData.entries.length > 0) {
                    exportTxtBtn.disabled = false;
                }
            }
            
            // If recording is active, also check for latest background scan data
            if (result.realtimeMode) {
                console.log('🔄 [RESTORE] Checking for latest background scan data');
                const bgScanResult = await chrome.storage.local.get(['backgroundScan_' + await getCurrentTabId()]);
                const bgScanKey = Object.keys(bgScanResult)[0];
                
                if (bgScanKey && bgScanResult[bgScanKey]) {
                    console.log('🔄 [RESTORE] Found background scan data, processing...');
                    handleBackgroundScanUpdate(bgScanResult[bgScanKey].data);
                }
            }
            
            console.log('🔄 [RESTORE] State restoration completed');
            
        } catch (error) {
            console.error('🔄 [RESTORE] Error restoring state:', error);
        }
    }

    function handleBackgroundScanUpdate(data) {
        const timestamp = new Date().toISOString();
        console.log('🟡 [BACKGROUND DEBUG] Handling background scan update at:', timestamp);
        console.log('🟡 [BACKGROUND DEBUG] Data entries length:', data ? data.entries?.length : 'undefined');
        
        if (!realtimeMode) {
            console.log('🟡 [BACKGROUND DEBUG] Ignoring - not in realtime mode');
            return;
        }
        
        if (recordingStopped) {
            console.log('🟡 [BACKGROUND DEBUG] Ignoring - recording stopped');
            return;
        }
        
        // Prevent race conditions with manual scraping
        if (processingScan) {
            console.log('🟡 [BACKGROUND DEBUG] Skipping - manual scan in progress');
            return;
        }
        
        if (!data || !data.entries || data.entries.length === 0) {
            console.log('🟡 [BACKGROUND DEBUG] No entries in background scan update');
            return;
        }
        
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        
        // Debug baseline filtering state
        console.log('🟡 [BACKGROUND DEBUG] Baseline filtering state:');
        console.log('   - isFirstUpdate:', isFirstUpdate);
        console.log('   - isFirstBackgroundScan:', isFirstBackgroundScan);
        console.log('   - baselineEntryCount:', baselineEntryCount);
        console.log('   - lastSeenEntry:', lastSeenEntry ? `${lastSeenEntry.speaker}: ${lastSeenEntry.text.substring(0, 30)}...` : 'null');
        console.log('   - data.entries.length:', data.entries.length);
        
        // Reset first background scan flag after first scan
        if (isFirstBackgroundScan) {
            isFirstBackgroundScan = false;
            console.log('🟡 [BACKGROUND DEBUG] isFirstBackgroundScan reset to:', isFirstBackgroundScan);
        }
        
        // Apply baseline filtering using centralized function
        const filteredResult = getFilteredEntries(data, '🟡 [BACKGROUND DEBUG]');
        
        if (filteredResult.entries.length === 0) {
            console.log('🟡 [BACKGROUND DEBUG] No new entries after baseline filtering - RETURNING');
            return;
        }
        
        const entriesToProcess = filteredResult.entries;
        
        if (!transcriptData) {
            transcriptData = {
                entries: entriesToProcess,
                scrapedAt: data.scrapedAt,
                meetingUrl: data.meetingUrl
            };
            console.log('✅ Initialized transcript data from background scan');
        } else {
            // Merge new entries with existing ones
            const newEntries = entriesToProcess;
            let hasChanges = false;
                        
            for (const newEntry of newEntries) {
                const existingIndex = transcriptData.entries.findIndex(e => 
                    (e.speaker === newEntry.speaker && e.timestamp === newEntry.timestamp) ||
                    (e.speaker === newEntry.speaker && e.text === newEntry.text)
                );
                
                if (existingIndex >= 0) {
                    // Update existing entry if text changed
                    if (transcriptData.entries[existingIndex].text !== newEntry.text) {
                        transcriptData.entries[existingIndex].text = newEntry.text;
                        transcriptData.entries[existingIndex].timestamp = newEntry.timestamp;
                        hasChanges = true;
                    }
                } else {
                    // Add new entry
                    transcriptData.entries.push(newEntry);
                    hasChanges = true;
                }
            }
            
            if (hasChanges) {
                transcriptData.scrapedAt = data.scrapedAt;

                // Only update display if there are actual changes
                displayTranscript(transcriptData);
                // Update stats after brief delay to ensure chat renders first
                setTimeout(() => updateStats(transcriptData, filteredResult), 10);
                
                if (exportTxtBtn) {
                    exportTxtBtn.disabled = false;
                }
                
                // Scroll to bottom
                const preview = document.getElementById('transcriptContent');
                if (preview) {
                    preview.scrollTop = preview.scrollHeight;
                }
                
                // Auto-save session to history on every update
                autoSaveCurrentSession(filteredResult);
                
                updateStatus(`Nagrywanie w tle... (${transcriptData.entries.length} wpisów)`, 'info');
            }
        }
        
        // Save to storage
        chrome.storage.local.set({ transcriptData: transcriptData });        
    }

    // Wyczyść transkrypcję
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Czy na pewno chcesz wyczyścić całą transkrypcję?')) {
                // Stop recording if active (auto-save will handle the session)
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
                baselineEntryCount = 0;
                lastSeenEntry = null;
                isFirstUpdate = false;
                isFirstBackgroundScan = false;
                recordingStopped = false;
                processingScan = false; // Reset mutex
                
                // Update UI
                displayTranscript({ entries: [] });
                updateStats({ entries: [] });
                updateDurationDisplay(); // Reset duration display
                if (exportTxtBtn) exportTxtBtn.disabled = true;
                updateStatus('Transkrypcja wyczyszczona', 'info');
                
                // Wyczyść z pamięci
                chrome.storage.local.remove(['transcriptData', 'currentSessionId', 'recordingStartTime']);
            }
        });
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

function getFilteredEntries(data, logPrefix = '📊 [STATS DEBUG]') {
    if (!data || !data.entries) {
        console.log(`${logPrefix} No data or entries`);
        return { entries: [], contentChanged: false };
    }
    
    console.log(`${logPrefix} Filtering data:`, {
        originalCount: data.entries.length,
        baselineEntryCount,
        hasLastSeenEntry: !!lastSeenEntry
    });
    
    // If no baseline filtering needed, return all entries
    if (baselineEntryCount === 0) {
        console.log(`${logPrefix} No baseline filtering needed`);
        return { entries: data.entries, contentChanged: false };
    }
    
    let filteredEntries = [];
    let contentChanged = false;
    
    if (data.entries.length > baselineEntryCount) {
        // More entries than baseline - return new entries
        filteredEntries = data.entries.slice(baselineEntryCount);
        console.log(`${logPrefix} NEW ENTRIES detected:`, filteredEntries.length);
    } else if (data.entries.length === baselineEntryCount && lastSeenEntry) {
        // Same number of entries - check if content changed
        const lastEntryIndex = baselineEntryCount - 1;
        const currentLastEntry = data.entries[lastEntryIndex];
        
        if (currentLastEntry && currentLastEntry.text !== lastSeenEntry.text) {
            // Content changed - update reference and return updated entry
            filteredEntries = [currentLastEntry];
            contentChanged = true;
            lastSeenEntry = { ...currentLastEntry }; // Update reference
            console.log(`${logPrefix} CONTENT CHANGED detected:`, {
                speaker: currentLastEntry.speaker,
                oldLength: lastSeenEntry.text?.length || 0,
                newLength: currentLastEntry.text.length
            });
        } else {
            // No changes
            filteredEntries = [];
            console.log(`${logPrefix} NO CHANGES detected`);
        }
    } else {
        // Less entries than baseline
        filteredEntries = [];
        console.log(`${logPrefix} BELOW BASELINE count`);
    }
    
    return {
        entries: filteredEntries,
        contentChanged,
        scrapedAt: data.scrapedAt,
        meetingUrl: data.meetingUrl
    };
}

function getFilteredStatsData(data) {
    return getFilteredEntries(data, '📊 [STATS DEBUG]');
}

function updateStats(data, preFilteredData = null) {
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

    // Use pre-filtered data if provided, otherwise filter now
    const filteredData = preFilteredData || getFilteredStatsData(data);
    const uniqueParticipants = new Set(filteredData.entries.map(e => e.speaker)).size;

    // Update stats with filtered data
    entryCountSpan.textContent = filteredData.entries.length;
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
    // Load session history from storage
    chrome.storage.local.get(['sessionHistory'], (result) => {
        try {
            sessionHistory = result.sessionHistory || [];
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
    } else {
        console.error('New session button not found');
    }
}

function createNewSession() {    
    // Stop recording if active (auto-save will handle the session)
    if (realtimeMode) {
        deactivateRealtimeMode();
    }
    
    // Create new session (no need to ask about saving - auto-save handles it)
    performNewSessionCreation();
}


function performNewSessionCreation() {    
    // Clear current data
    transcriptData = null;
    currentSessionId = generateSessionId();
    recordingStartTime = null;
    sessionTotalDuration = 0; // Reset total duration for new session
    baselineEntryCount = 0; // Reset baseline for new session
    lastSeenEntry = null;
    isFirstUpdate = false; // Reset first update flag
    isFirstBackgroundScan = false; // Reset first background scan flag
    recordingStopped = false; // Reset recording stopped flag
    
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
}

function autoSaveCurrentSession(preFilteredData = null) {
    if (!transcriptData || transcriptData.entries.length === 0) {
        return;
    }
    
    // Use pre-filtered data if provided, otherwise filter now
    const filteredResult = preFilteredData || getFilteredEntries(transcriptData, '🔄 [AUTOSAVE DEBUG]');
    
    if (filteredResult.entries.length === 0) {
        console.log('🔄 [AUTOSAVE DEBUG] No valid entries after filtering - not auto-saving');
        return;
    }
    
    const validEntries = filteredResult.entries;
    
    const sessionId = currentSessionId || generateSessionId();
    const uniqueParticipants = new Set(validEntries.map(e => e.speaker)).size;
    
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
        entries: validEntries,
        scrapedAt: transcriptData.scrapedAt,
        meetingUrl: transcriptData.meetingUrl
    };
    
    const session = {
        id: sessionId,
        title: generateSessionTitle(),
        date: originalDate, // Preserve original date or set new one
        participantCount: uniqueParticipants,
        entryCount: validEntries.length,
        transcript: filteredTranscriptData,
        totalDuration: currentTotalDuration
    };
    
    console.log('🔄 [AUTOSAVE DEBUG] Creating session with:', {
        id: sessionId,
        entryCount: validEntries.length,
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
    });
}

function saveCurrentSessionToHistory() {
    console.log('💾 [SAVE DEBUG] saveCurrentSessionToHistory called');
    
    if (!transcriptData || transcriptData.entries.length === 0) {
        console.log('💾 [SAVE DEBUG] No transcript data to save');
        return;
    }
    
    console.log('💾 [SAVE DEBUG] Saving session:');
    console.log('   - Original entries count:', transcriptData.entries.length);
    console.log('   - baselineEntryCount:', baselineEntryCount);
    
    // Validate and filter baseline entries if they somehow got through
    let validEntries = transcriptData.entries;
    if (baselineEntryCount > 0 && transcriptData.entries.length >= baselineEntryCount) {
        validEntries = transcriptData.entries.slice(baselineEntryCount);
        console.log('💾 [SAVE DEBUG] Filtered entries count:', validEntries.length);
        
        if (validEntries.length === 0) {
            console.log('💾 [SAVE DEBUG] No valid entries after filtering - not saving');
            return;
        }
    } else {
        console.log('💾 [SAVE DEBUG] No baseline filtering applied');
    }
    
    const sessionId = currentSessionId || generateSessionId();
    const uniqueParticipants = new Set(validEntries.map(e => e.speaker)).size;
    
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
        entryCount: validEntries.length,
        transcript: {
            entries: validEntries,
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
    }
    
    // Save updated history
    chrome.storage.local.set({ sessionHistory: sessionHistory }, () => {
        renderSessionHistory();
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
                    baselineEntryCount = 0; // Reset baseline
                    lastSeenEntry = null;
                    isFirstUpdate = false; // Reset first update flag
                    isFirstBackgroundScan = false; // Reset first background scan flag
                    recordingStopped = false; // Reset recording stopped flag
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

    return txtContent;
}

function generateJsonContent() {    
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