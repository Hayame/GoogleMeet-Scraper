let transcriptData = null;
let realtimeMode = false;
let realtimeInterval = null;

document.addEventListener('DOMContentLoaded', function() {
    const realtimeBtn = document.getElementById('realtimeBtn');
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statusDiv = document.getElementById('status');
    const previewDiv = document.getElementById('preview');
    const statsDiv = document.getElementById('stats');

    console.log('Popup loaded');

    // Przywróć stan trybu rzeczywistego
    chrome.storage.local.get(['realtimeMode', 'transcriptData'], (result) => {
        if (result.realtimeMode) {
            activateRealtimeMode();
        }
        if (result.transcriptData) {
            transcriptData = result.transcriptData;
            displayTranscript(transcriptData);
            updateStats(transcriptData);
            exportTxtBtn.disabled = false;
            clearBtn.style.display = 'inline-flex';
        }
    });

    // Tryb rzeczywisty
    realtimeBtn.addEventListener('click', () => {
        if (realtimeMode) {
            deactivateRealtimeMode();
        } else {
            activateRealtimeMode();
        }
    });

    function activateRealtimeMode() {
        console.log('Activating realtime mode');
        realtimeMode = true;
        realtimeBtn.classList.add('active');
        document.getElementById('realtimeText').textContent = 'Zatrzymaj nagrywanie';
        updateStatus('🔴 Nagrywanie aktywne - automatyczne pobieranie co 2 sekundy', 'info');
        clearBtn.style.display = 'inline-flex';
        
        // Zapisz stan
        chrome.storage.local.set({ realtimeMode: true });
        
        // Natychmiastowe pierwsze pobranie
        performRealtimeScrape();
        
        // Ustaw interwał pobierania co 2 sekundy
        realtimeInterval = setInterval(performRealtimeScrape, 2000);
    }

    function deactivateRealtimeMode() {
        console.log('Deactivating realtime mode');
        realtimeMode = false;
        realtimeBtn.classList.remove('active');
        document.getElementById('realtimeText').textContent = 'Rozpocznij nagrywanie';
        updateStatus('⏹️ Nagrywanie zatrzymane', 'success');
        
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
                updateStatus('⚠️ Opuściłeś Google Meet - nagrywanie zatrzymane', 'error');
                return;
            }

            console.log('📤 Sending scrapeTranscript message to tab:', tab.id);
            chrome.tabs.sendMessage(tab.id, { action: 'scrapeTranscript', realtime: true }, (response) => {
                console.log('📥 Response received:', response);
                
                if (chrome.runtime.lastError) {
                    console.error('Realtime error:', chrome.runtime.lastError);
                    updateStatus('❌ Nie można połączyć się ze stroną. Odśwież Google Meet.', 'error');
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
                            // Dodaj tylko nowe wpisy
                            const existingTexts = new Set(
                                transcriptData.entries.map(e => `${e.speaker}:${e.text}`)
                            );
                            
                            const newEntries = response.data.entries.filter(
                                entry => !existingTexts.has(`${entry.speaker}:${entry.text}`)
                            );
                            
                            if (newEntries.length > 0) {
                                transcriptData.entries.push(...newEntries);
                                transcriptData.scrapedAt = response.data.scrapedAt;
                                
                                // Animacja dla nowych wpisów
                                const currentCount = document.querySelectorAll('.transcript-entry').length;
                                displayTranscript(transcriptData);
                                
                                // Przewiń do nowych wpisów
                                const preview = document.getElementById('preview');
                                preview.scrollTop = preview.scrollHeight;
                                
                                updateStatus(`🔴 Nagrywanie... (${transcriptData.entries.length} wpisów)`, 'info');
                            }
                        }
                        
                        updateStats(transcriptData);
                        exportTxtBtn.disabled = false;
                        
                        // Zapisz dane
                        chrome.storage.local.set({ transcriptData: transcriptData });
                    } else {
                        console.log('⚠️ No entries found in transcript');
                        updateStatus('⏳ Czekam na napisy... Upewnij się, że są włączone', 'info');
                    }
                } else {
                    console.log('❌ Response not successful:', response);
                    updateStatus('⚠️ Nie znaleziono napisów. Włącz napisy (CC) w Google Meet', 'error');
                }
            });
        } catch (error) {
            console.error('Realtime scrape error:', error);
            updateStatus('❌ Błąd: ' + error.message, 'error');
        }
    }

    // Wyczyść transkrypcję
    clearBtn.addEventListener('click', () => {
        if (confirm('Czy na pewno chcesz wyczyścić całą transkrypcję?')) {
            transcriptData = null;
            displayTranscript({ entries: [] });
            updateStats({ entries: [] });
            exportTxtBtn.disabled = true;
            clearBtn.style.display = 'none';
            updateStatus('🗑️ Transkrypcja wyczyszczona', 'info');
            
            // Wyczyść z pamięci
            chrome.storage.local.remove('transcriptData');
            
            if (realtimeMode) {
                deactivateRealtimeMode();
            }
        }
    });

    // Eksport do TXT
    exportTxtBtn.addEventListener('click', () => {
        if (!transcriptData) return;

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

        downloadFile(txtContent, 'transkrypcja-google-meet.txt', 'text/plain');
        updateStatus('📄 Wyeksportowano do pliku TXT!', 'success');
    });
});

function updateStatus(message, type = '') {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = 'status-message';
    if (type) {
        statusDiv.classList.add(type);
    }
}

function displayTranscript(data) {
    const previewDiv = document.getElementById('preview');
    previewDiv.innerHTML = '';

    if (data.entries.length === 0) {
        previewDiv.innerHTML = '<p class="empty-state">Brak wpisów w transkrypcji</p>';
        return;
    }

    // Mapa kolorów dla różnych użytkowników
    const speakerColors = new Map();
    let colorIndex = 1;

    // Pokaż pierwsze 10 wpisów
    const entriesToShow = data.entries.slice(0, 10);
    entriesToShow.forEach(entry => {
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
        previewDiv.appendChild(entryDiv);
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
}

function updateStats(data) {
    const statsDiv = document.getElementById('stats');
    const entryCountSpan = document.getElementById('entryCount');
    const participantCountSpan = document.getElementById('participantCount');
    const realtimeStatus = document.getElementById('realtimeStatus');

    const uniqueParticipants = new Set(data.entries.map(e => e.speaker)).size;

    entryCountSpan.textContent = data.entries.length;
    participantCountSpan.textContent = uniqueParticipants;
    statsDiv.style.display = 'block';
    
    // Pokaż status trybu rzeczywistego
    if (realtimeMode) {
        realtimeStatus.style.display = 'flex';
    } else {
        realtimeStatus.style.display = 'none';
    }
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
    }, (downloadId) => {
        // Zwolnij URL po pobraniu
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
}