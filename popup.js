let transcriptData = null;
let realtimeMode = false;
let realtimeInterval = null;
let currentSessionId = null;
let sessionHistory = [];

document.addEventListener('DOMContentLoaded', function() {
    const realtimeBtn = document.getElementById('recordBtn');
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statusDiv = document.getElementById('recordingStatus');
    const previewDiv = document.getElementById('transcriptContent');
    const statsDiv = document.getElementById('transcriptStats');
    const exportBtn = document.getElementById('exportBtn');
    const floatingPanel = document.getElementById('floatingPanel');
    const floatingActionPanel = document.getElementById('floatingActionPanel');
    const exportModal = document.getElementById('exportModal');
    const themeToggle = document.getElementById('themeToggle');
    
    // Initialize modal system
    initializeModalSystem();
    
    // Export button handling
    exportBtn.addEventListener('click', () => {
        showModal('exportModal');
    });
    
    // Modal close handlers
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modalId = closeBtn.getAttribute('data-modal');
            hideModal(modalId);
        });
    });
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal.id);
            }
        });
    });

    // Theme toggle functionality
    initializeTheme();
    
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    console.log('Popup loaded');

    // Initialize session history
    initializeSessionHistory();
    
    // Initialize theme toggle
    initializeThemeToggle();
    
    // Initialize enhanced interactions
    initializeEnhancedInteractions();
    
    // Setup floating action panel handlers
    setupFloatingActionPanelHandlers();
    
    // Przywróć stan trybu rzeczywistego
    chrome.storage.local.get(['realtimeMode', 'transcriptData', 'currentSessionId'], (result) => {
        if (result.currentSessionId) {
            currentSessionId = result.currentSessionId;
        }
        if (result.realtimeMode) {
            activateRealtimeMode();
        }
        if (result.transcriptData) {
            transcriptData = result.transcriptData;
            displayTranscript(transcriptData);
            updateStats(transcriptData);
            exportTxtBtn.disabled = false;
            showFloatingActionPanel();
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

    function activateRealtimeMode() {
        console.log('Activating realtime mode');
        realtimeMode = true;
        realtimeBtn.classList.add('active');
        document.querySelector('.record-text').textContent = 'Zatrzymaj nagrywanie';
        updateStatus('Nagrywanie aktywne - automatyczne pobieranie co 2 sekundy', 'info');
        showFloatingActionPanel();
        
        // Create new session if none exists
        if (!currentSessionId) {
            currentSessionId = generateSessionId();
            chrome.storage.local.set({ currentSessionId: currentSessionId });
        }
        
        // Zapisz stan
        chrome.storage.local.set({ realtimeMode: true });
        
        // Natychmiastowe pierwsze pobranie
        performRealtimeScrape();
        
        // Ustaw interwał pobierania co 2 sekundy
        realtimeInterval = setInterval(performRealtimeScrape, 2000);
    }

    function deactivateRealtimeMode(saveSession = true) {
        console.log('Deactivating realtime mode');
        realtimeMode = false;
        realtimeBtn.classList.remove('active');
        document.querySelector('.record-text').textContent = 'Rozpocznij nagrywanie';
        updateStatus('Nagrywanie zatrzymane', 'success');
        
        // Save current session to history if there's data
        if (saveSession && transcriptData && transcriptData.entries.length > 0) {
            saveCurrentSessionToHistory();
        }
        
        // Zapisz stan
        chrome.storage.local.set({ realtimeMode: false });
        
        // Wyczyść interwał
        if (realtimeInterval) {
            clearInterval(realtimeInterval);
            realtimeInterval = null;
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
                        // Scal nowe dane z istniejącymi
                        if (!transcriptData) {
                            transcriptData = response.data;
                        } else {
                            // Inteligentne scalanie - sprawdź czy ostatni wpis należy do tej samej osoby
                            const newEntries = response.data.entries;
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
                                
                                updateStatus(`Nagrywanie... (${transcriptData.entries.length} wpisów)`, 'info');
                                showFloatingActionPanel();
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

    // Wyczyść transkrypcję
    clearBtn.addEventListener('click', () => {
        if (confirm('Czy na pewno chcesz wyczyścić całą transkrypcję?')) {
            // Save current session before clearing if it has data
            if (transcriptData && transcriptData.entries.length > 0) {
                saveCurrentSessionToHistory();
            }
            
            transcriptData = null;
            currentSessionId = null;
            displayTranscript({ entries: [] });
            updateStats({ entries: [] });
            exportTxtBtn.disabled = true;
            hideFloatingActionPanel();
            updateStatus('Transkrypcja wyczyszczona', 'info');
            
            // Wyczyść z pamięci
            chrome.storage.local.remove(['transcriptData', 'currentSessionId']);
            
            if (realtimeMode) {
                deactivateRealtimeMode(false);
            }
        }
    });

    // Export handlers will be set up by the modal system
});

function updateStatus(message, type = '') {
    const statusDiv = document.getElementById('recordingStatus');
    const statusText = statusDiv.querySelector('.status-text');
    const statusDot = statusDiv.querySelector('.status-dot');
    
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
    previewDiv.innerHTML = '';

    if (data.entries.length === 0) {
        previewDiv.innerHTML = `
            <div class="empty-transcript">
                <svg class="empty-icon" width="48" height="48" viewBox="0 0 24 24">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
                <p>Brak transkrypcji</p>
                <p class="empty-subtitle">Rozpocznij nagrywanie, aby zobaczyć transkrypcję</p>
            </div>`;
        hideFloatingActionPanel();
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
        textP.textContent = entry.text;
        
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

    const uniqueParticipants = new Set(data.entries.map(e => e.speaker)).size;

    // Update stats
    entryCountSpan.textContent = data.entries.length;
    participantCountSpan.textContent = uniqueParticipants;
    
    // Calculate duration (placeholder - could be enhanced)
    const now = new Date();
    const startTime = data.entries.length > 0 ? new Date(data.scrapedAt || now) : now;
    const duration = Math.floor((now - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    durationSpan.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    statsDiv.style.display = 'block';
    
    // Update floating panel stats
    updateFloatingPanelStats();
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
    }, () => {
        // Zwolnij URL po pobraniu
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
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
        sessionHistory = result.sessionHistory || [];
        renderSessionHistory();
    });
    
    // Add event listeners for history UI
    const newSessionBtn = document.getElementById('newSessionBtn');
    if (newSessionBtn) {
        newSessionBtn.addEventListener('click', createNewSession);
    }
}

function createNewSession() {
    // Save current session if it has data
    if (transcriptData && transcriptData.entries.length > 0) {
        if (confirm('Czy chcesz zapisać bieżącą sesję przed utworzeniem nowej?')) {
            saveCurrentSessionToHistory();
        }
    }
    
    // Clear current data
    transcriptData = null;
    currentSessionId = generateSessionId();
    displayTranscript({ entries: [] });
    updateStats({ entries: [] });
    document.getElementById('exportTxtBtn').disabled = true;
    hideFloatingActionPanel();
    
    // Save new session ID
    chrome.storage.local.set({ currentSessionId: currentSessionId });
    
    updateStatus('Utworzono nową sesję', 'success');
}

function saveCurrentSessionToHistory() {
    if (!transcriptData || transcriptData.entries.length === 0) {
        return;
    }
    
    const sessionId = currentSessionId || generateSessionId();
    const uniqueParticipants = new Set(transcriptData.entries.map(e => e.speaker)).size;
    
    const session = {
        id: sessionId,
        title: generateSessionTitle(),
        date: new Date().toISOString(),
        participantCount: uniqueParticipants,
        entryCount: transcriptData.entries.length,
        transcript: transcriptData
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
        updateStatus('Nie znaleziono sesji', 'error');
        return;
    }
    
    // Save current session if it has unsaved data
    if (transcriptData && transcriptData.entries.length > 0 && currentSessionId !== sessionId) {
        if (confirm('Czy chcesz zapisać bieżącą sesję przed wczytaniem historycznej?')) {
            saveCurrentSessionToHistory();
        }
    }
    
    // Load the session
    transcriptData = session.transcript;
    currentSessionId = session.id;
    displayTranscript(transcriptData);
    updateStats(transcriptData);
    document.getElementById('exportTxtBtn').disabled = false;
    showFloatingActionPanel();
    
    // Update storage
    chrome.storage.local.set({ 
        transcriptData: transcriptData,
        currentSessionId: currentSessionId
    });
    
    updateStatus(`Wczytano sesję: ${session.title}`, 'success');
}

function deleteSessionFromHistory(sessionId, event) {
    event.stopPropagation(); // Prevent triggering the load action
    
    showDeleteConfirmation(sessionId);
}

function renderSessionHistory() {
    const historyContainer = document.getElementById('sessionList');
    if (!historyContainer) return;
    
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

// Floating Action Panel Management
function showFloatingActionPanel() {
    const panel = document.getElementById('floatingActionPanel');
    if (panel) {
        panel.style.display = 'flex';
        // Trigger reflow to ensure the element is rendered
        panel.offsetHeight;
        panel.classList.add('show');
        panel.classList.remove('hide');
        
        // Update floating panel stats
        updateFloatingPanelStats();
    }
}

function hideFloatingActionPanel() {
    const panel = document.getElementById('floatingActionPanel');
    if (panel) {
        panel.classList.add('hide');
        panel.classList.remove('show');
        // Hide the panel after animation completes
        setTimeout(() => {
            panel.style.display = 'none';
        }, 300);
    }
}

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
    document.querySelectorAll('.floating-action-button, .btn, .record-button').forEach(button => {
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
    document.querySelectorAll('.floating-action-button:not([data-ripple]), .btn:not([data-ripple]), .record-button:not([data-ripple])').forEach(button => {
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
function initializeThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    
    // Load saved theme
    chrome.storage.local.get(['theme'], (result) => {
        const theme = result.theme || 'light';
        document.documentElement.setAttribute('data-theme', theme);
    });
    
    // Theme toggle click handler
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        chrome.storage.local.set({ theme: newTheme });
    });
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
    
    // Initialize resume recording modal
    initializeResumeRecordingModal();
    
    // Initialize confirm modal
    initializeConfirmModal();
    
    // Initialize export modal enhancements
    initializeExportModal();
}

function showModal(modalId, data = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
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
    requestAnimationFrame(() => {
        modal.classList.add('show');
    });
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
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
        document.getElementById('exportTxtBtn').disabled = true;
        hideFloatingActionPanel();
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
    
    showModal('resumeRecordingModal');
    
    // Set up cancel handler
    resumeCancel.addEventListener('click', () => {
        hideModal('resumeRecordingModal');
    });
}

function initializeResumeRecordingModal() {
    const resumeOptions = document.querySelectorAll('.resume-option');
    
    resumeOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove selection from all options
            resumeOptions.forEach(opt => opt.classList.remove('selected'));
            // Add selection to clicked option
            option.classList.add('selected');
            
            const action = option.getAttribute('data-action');
            
            setTimeout(() => {
                hideModal('resumeRecordingModal');
                
                if (action === 'continue') {
                    // Continue current session
                    activateRealtimeMode();
                } else if (action === 'new') {
                    // Start new session
                    saveCurrentSessionToHistory();
                    transcriptData = null;
                    currentSessionId = generateSessionId();
                    displayTranscript({ entries: [] });
                    updateStats({ entries: [] });
                    chrome.storage.local.set({ currentSessionId: currentSessionId });
                    activateRealtimeMode();
                }
            }, 300);
        });
    });
}

function initializeConfirmModal() {
    const confirmCancel = document.getElementById('confirmCancel');
    const confirmOk = document.getElementById('confirmOk');
    
    confirmCancel.addEventListener('click', () => {
        hideModal('confirmModal');
    });
}

function initializeExportModal() {
    const exportModal = document.getElementById('exportModal');
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    
    // Add filename input and preview to export modal
    const modalBody = exportModal.querySelector('.modal-body');
    
    // Create enhanced export UI
    const exportEnhancedUI = document.createElement('div');
    exportEnhancedUI.innerHTML = `
        <div class="export-format-selection">
            <label class="export-format-label">Wybierz format eksportu:</label>
            <div class="export-options">
                <button id="exportTxtBtn" class="export-option">
                    <svg width="32" height="32" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                    </svg>
                    <span>Eksportuj jako TXT</span>
                </button>
                <button id="exportJsonBtn" class="export-option">
                    <svg width="32" height="32" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                    </svg>
                    <span>Eksportuj jako JSON</span>
                </button>
            </div>
        </div>
        
        <div class="export-filename-section" style="margin-top: 20px;">
            <label class="export-format-label">Nazwa pliku:</label>
            <input type="text" id="exportFilename" class="export-filename" value="transkrypcja-google-meet">
        </div>
        
        <div class="export-preview-section" style="margin-top: 20px;">
            <label class="export-format-label">Podgląd:</label>
            <div id="exportPreview" class="export-preview">
                <pre>Wybierz format eksportu, aby zobaczyć podgląd</pre>
            </div>
        </div>
    `;
    
    // Replace the existing export options
    const existingOptions = modalBody.querySelector('.export-options');
    if (existingOptions) {
        existingOptions.replaceWith(exportEnhancedUI);
    } else {
        modalBody.appendChild(exportEnhancedUI);
    }
    
    // Re-attach event listeners for the new buttons
    setupExportButtonHandlers();
}

function setupExportButtonHandlers() {
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const exportFilename = document.getElementById('exportFilename');
    const exportPreview = document.getElementById('exportPreview');
    
    if (exportTxtBtn) {
        exportTxtBtn.addEventListener('click', () => {
            if (!transcriptData) return;
            
            const filename = exportFilename.value || 'transkrypcja-google-meet';
            const txtContent = generateTxtContent();
            
            // Show preview
            exportPreview.innerHTML = `<pre>${txtContent.substring(0, 500)}...</pre>`;
            
            // Download file
            downloadFile(txtContent, `${filename}.txt`, 'text/plain');
            updateStatus('Wyeksportowano do pliku TXT!', 'success');
            hideModal('exportModal');
        });
    }
    
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            if (!transcriptData) return;
            
            const filename = exportFilename.value || 'transkrypcja-google-meet';
            const jsonContent = generateJsonContent();
            
            // Show preview
            exportPreview.innerHTML = `<pre>${JSON.stringify(JSON.parse(jsonContent), null, 2).substring(0, 500)}...</pre>`;
            
            // Download file
            downloadFile(jsonContent, `${filename}.json`, 'application/json');
            updateStatus('Wyeksportowano do pliku JSON!', 'success');
            hideModal('exportModal');
        });
    }
}

function generateTxtContent() {
    let txtContent = `Transkrypcja Google Meet\n`;
    txtContent += `Data eksportu: ${new Date().toLocaleString('pl-PL')}\n`;
    txtContent += `URL spotkania: ${transcriptData.meetingUrl}\n`;
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
    const jsonData = {
        exportDate: new Date().toISOString(),
        meetingUrl: transcriptData.meetingUrl,
        scrapedAt: transcriptData.scrapedAt,
        entries: transcriptData.entries,
        stats: {
            totalEntries: transcriptData.entries.length,
            uniqueParticipants: new Set(transcriptData.entries.map(e => e.speaker)).size
        }
    };

    return JSON.stringify(jsonData, null, 2);
}

// Setup floating action panel handlers
function setupFloatingActionPanelHandlers() {
    const floatingExportBtn = document.getElementById('floatingExportBtn');
    const floatingClearBtn = document.getElementById('floatingClearBtn');
    
    if (floatingExportBtn) {
        floatingExportBtn.addEventListener('click', () => {
            addButtonLoadingState(floatingExportBtn);
            showModal('exportModal');
        });
    }
    
    if (floatingClearBtn) {
        floatingClearBtn.addEventListener('click', () => {
            if (confirm('Czy na pewno chcesz wyczyścić całą transkrypcję?')) {
                addButtonLoadingState(floatingClearBtn);
                
                // Save current session before clearing if it has data
                if (transcriptData && transcriptData.entries.length > 0) {
                    saveCurrentSessionToHistory();
                }
                
                transcriptData = null;
                currentSessionId = null;
                displayTranscript({ entries: [] });
                updateStats({ entries: [] });
                const exportTxtBtn = document.getElementById('exportTxtBtn');
                if (exportTxtBtn) exportTxtBtn.disabled = true;
                hideFloatingActionPanel();
                updateStatus('Transkrypcja wyczyszczona', 'info');
                
                // Wyczyść z pamięci
                chrome.storage.local.remove(['transcriptData', 'currentSessionId']);
                
                if (realtimeMode) {
                    deactivateRealtimeMode(false);
                }
            }
        });
    }
}

// Enhanced floating action panel management
function updateFloatingPanelStats() {
    const floatingEntryCount = document.getElementById('floatingEntryCount');
    if (floatingEntryCount && transcriptData) {
        floatingEntryCount.textContent = transcriptData.entries.length;
    }
}

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
    document.querySelectorAll('.floating-action-button, .btn, .record-button').forEach(button => {
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
    document.querySelectorAll('.floating-action-button:not([data-ripple]), .btn:not([data-ripple]), .record-button:not([data-ripple])').forEach(button => {
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