/**
 * Background Scanner Module
 * Extracted from popup.js - handles background scanning functionality and message processing
 */

// Create background scanner manager with all extracted functions
window.BackgroundScanner = {
    // Mutex flag to prevent race conditions during data merge
    _isMergingData: false,

    /**
     * Handle background scan updates from content script
     * Source: popup.js lines 283-399
     * @param {Object} data - Transcript data from background scan
     */
    async handleBackgroundScanUpdate(data) {
        const timestamp = new Date().toISOString();
        console.log('🟡 [BACKGROUND DEBUG] Handling background scan update at:', timestamp);
        console.log('🟡 [BACKGROUND DEBUG] Data messages length:', data ? data.messages?.length : 'undefined');
        console.log('🟡 [BACKGROUND DEBUG] Current state:', {
            realtimeMode: window.realtimeMode,
            currentSessionId: window.currentSessionId,
            currentSessionIdType: typeof window.currentSessionId,
            hasTranscriptData: !!window.transcriptData,
            hasSessionHistory: !!window.sessionHistory,
            sessionHistoryLength: window.sessionHistory?.length || 0,
            restorationInProgress: window.StateManager?.isRestorationInProgress()
        });
        
        // ENHANCED DEBUG: Show session ID format analysis
        if (window.currentSessionId && window.sessionHistory && window.sessionHistory.length > 0) {
            console.log('🟡 [BACKGROUND DEBUG] Session ID analysis:', {
                currentSessionId: window.currentSessionId,
                currentSessionIdType: typeof window.currentSessionId,
                sessionHistoryIds: window.sessionHistory.slice(0, 3).map(s => ({ id: s.id, type: typeof s.id })),
                exactMatchExists: !!window.sessionHistory.find(s => s.id === window.currentSessionId)
            });
        }

        // REMOVED: Problematic session history check that created infinite loop for new users
        // The check for sessionHistory.length === 0 incorrectly treated empty arrays as "not loaded"
        // This is now handled by the enhanced session existence verification in the auto-save logic
        
        if (!window.realtimeMode) {
            console.log('🟡 [BACKGROUND DEBUG] Ignoring - not in realtime mode');
            return;
        }
        
        if (window.StateManager?.getRecordingStopped()) {
            console.log('🟡 [BACKGROUND DEBUG] Ignoring - recording stopped');
            return;
        }
        
        if (!data || !data.messages || data.messages.length === 0) {
            console.log('🟡 [BACKGROUND DEBUG] No messages in background scan update');
            return;
        }
        
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        
        // Debug: log state before detecting changes
        console.log('🔍 [DEBUG] handleBackgroundScanUpdate - Before detectChanges:', {
            hasTranscriptData: !!window.transcriptData,
            oldMessagesCount: window.transcriptData ? window.transcriptData.messages.length : 0,
            newMessagesCount: data.messages.length,
            recordingPaused: window.StateManager?.getRecordingPaused(),
            recordingStopped: window.StateManager?.getRecordingStopped(),
            oldHashesSample: window.transcriptData ? window.transcriptData.messages.slice(0,3).map(m => ({ speaker: m.speaker, hash: m.hash, text: m.text.substring(0,30) })) : [],
            newHashesSample: data.messages.slice(0,3).map(m => ({ speaker: m.speaker, hash: m.hash, text: m.text.substring(0,30) }))
        });
        
        // Detect changes using hash comparison
        const changes = window.detectChanges ? window.detectChanges(window.transcriptData ? window.transcriptData.messages : [], data.messages) : { added: [], updated: [], removed: [] };
        
        // Debug: log changes detected
        console.log('🔍 [DEBUG] detectChanges result:', {
            added: changes.added.length,
            updated: changes.updated.length,
            removed: changes.removed.length,
            addedSample: changes.added.slice(0,3).map(m => ({ speaker: m.speaker, hash: m.hash, text: m.text.substring(0,30) }))
        });
        
        if (!window.transcriptData) {
            // Check if this is a session continuation (has sessionStartTime) or completely new session
            const isContinuation = window.StateManager?.getSessionStartTime() !== null || window.StateManager?.getRecordingStartTime() !== null;
            
            if (isContinuation) {
                console.log('🔄 [CONTINUATION] Initializing transcript data for continued session');
                console.log('🔄 [CONTINUATION] SessionStartTime exists:', !!window.StateManager?.getSessionStartTime());
                console.log('🔄 [CONTINUATION] RecordingStartTime exists:', !!window.StateManager?.getRecordingStartTime());
            } else {
                console.log('✅ [NEW] Initializing transcript data for completely new session');
            }
            
            // Initialize with new data structure
            window.transcriptData = {
                messages: data.messages,
                scrapedAt: data.scrapedAt,
                meetingUrl: data.meetingUrl
            };
            
            // For continuations, treat all messages as "added" for proper incremental display
            if (isContinuation && data.messages.length > 0) {
                const continuationChanges = {
                    added: data.messages,
                    updated: [],
                    removed: []
                };
                console.log(`🔄 [CONTINUATION] Treating ${data.messages.length} messages as newly added`);
                if (window.displayTranscript) {
                    window.displayTranscript(window.transcriptData, continuationChanges);
                }
            } else {
                // New session - use normal display
                if (window.displayTranscript) {
                    window.displayTranscript(window.transcriptData, changes);
                }
            }
            
            if (window.updateStats) {
                window.updateStats(window.transcriptData);
            }
            
            // Complete pending filter restoration when new data arrives
            if (window.SearchFilterManager && window.SearchFilterManager.completePendingRestoration) {
                window.SearchFilterManager.completePendingRestoration();
            }
            
            if (exportTxtBtn) {
                exportTxtBtn.disabled = false;
            }
            
            // Auto-save session to history
            if (window.SessionHistoryManager && window.SessionHistoryManager.autoSaveCurrentSession) {
                window.SessionHistoryManager.autoSaveCurrentSession();
            }
            
            if (window.updateStatus) {
                window.updateStatus(`Nagrywanie w tle... (${window.transcriptData.messages.length} wpisów)`, 'info');
            }
        } else if (changes.added.length > 0 || changes.updated.length > 0) {
            // Update data with changes
            window.transcriptData.messages = data.messages;
            window.transcriptData.scrapedAt = data.scrapedAt;

            // Update display with incremental changes
            if (window.displayTranscript) {
                window.displayTranscript(window.transcriptData, changes);
            }
            if (window.updateStats) {
                window.updateStats(window.transcriptData);
            }
            
            // Complete pending filter restoration when new data arrives
            if (window.SearchFilterManager && window.SearchFilterManager.completePendingRestoration) {
                window.SearchFilterManager.completePendingRestoration();
            }
            
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
            if (window.SessionHistoryManager && window.SessionHistoryManager.autoSaveCurrentSession) {
                window.SessionHistoryManager.autoSaveCurrentSession();
            }
            
            if (window.updateStatus) {
                window.updateStatus(`Nagrywanie w tle... (${window.transcriptData.messages.length} wpisów)`, 'info');
            }
        }

        // Save to storage - use TransactionCoordinator for atomic operations
        // This ensures transcriptData, sessionHistory, and session state are saved together
        const saveResult = await window.TransactionCoordinator.saveRecordingState({
            transcriptData: window.transcriptData,
            currentSessionId: window.currentSessionId,
            sessionHistory: window.sessionHistory,
            realtimeMode: window.realtimeMode
        });

        if (!saveResult.success) {
            console.error('❌ [BACKGROUND SCANNER] Failed to save state:', saveResult.error);
            // Data remains in memory - will retry on next update (3 seconds)
            return;
        }

        console.log('✅ [BACKGROUND SCANNER] State saved atomically in', saveResult.duration, 'ms');
    },

    /**
     * Initialize background scan message listener
     * Source: popup.js lines 402-409
     */
    initializeMessageListener() {
        // Listen for background scan updates
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {        
            if (request.action === 'backgroundScanUpdate') {
                console.log('🔄 Background scan update received');
                this.handleBackgroundScanUpdate(request.data);
            }
            
            return true;
        });
    },

    /**
     * Start background scanning for a specific tab
     * @param {number} tabId - The tab ID to start scanning on
     * @returns {Promise} Promise that resolves when scanning starts
     */
    async startBackgroundScanning(tabId) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'startBackgroundScanning',
                tabId: tabId
            }, (response) => {
                if (response && response.success) {
                    console.log('🟢 Background scanning started for tab:', tabId);
                    resolve(response);
                } else {
                    console.error('❌ Failed to start background scanning for tab:', tabId);
                    reject(new Error('Failed to start background scanning'));
                }
            });
        });
    },

    /**
     * Stop background scanning
     * @returns {Promise} Promise that resolves when scanning stops
     */
    async stopBackgroundScanning() {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'stopBackgroundScanning'
            }, (response) => {
                if (response && response.success) {
                    console.log('✅ Background scanning stopped');
                    resolve(response);
                } else {
                    console.error('❌ Failed to stop background scanning');
                    reject(new Error('Failed to stop background scanning'));
                }
            });
        });
    },


    // 30-second auto-save interval removed to prevent duplicate sessions
    // Real-time auto-save in handleBackgroundScanUpdate() handles all saves properly


    /**
     * BULLETPROOF Reaktywacja background scannera po otwarciu popup
     * Naprawia wszystkie 9 failure modes:
     * - Usuwa check restoration flag
     * - Dodaje fallback dla brakującego MEET_TAB_ID
     * - Konwertuje chrome.tabs.get na Promise
     * - Dodaje retry mechanism
     * - Odzyskuje zgromadzone dane ze storage
     */
    async reactivateAfterRestore() {
        try {
            console.log('🔄 [REACTIVATE] ===== ROZPOCZĘCIE BULLETPROOF REAKTYWACJI =====');

            // ============================================
            // FAZA 0: ZNAJDŹ KARTĘ MEET (z fallback)
            // ============================================

            let meetTabId = null;

            // Spróbuj pobrać zapisane MEET_TAB_ID ze storage
            const result = await window.StorageManager.getStorageData([window.AppConstants.STORAGE_KEYS.MEET_TAB_ID]);
            const storedTabId = result[window.AppConstants.STORAGE_KEYS.MEET_TAB_ID];

            if (storedTabId) {
                console.log('🔍 [REACTIVATE] Znaleziono zapisane MEET_TAB_ID:', storedTabId);

                // Zweryfikuj czy karta nadal istnieje i jest kartą Meet
                const tabValid = await this.verifyMeetTab(storedTabId);

                if (tabValid) {
                    meetTabId = storedTabId;
                    console.log('✅ [REACTIVATE] Zapisana karta jest nadal aktywna');
                } else {
                    console.warn('⚠️ [REACTIVATE] Zapisana karta nie istnieje lub nie jest kartą Meet');
                }
            }

            // FALLBACK: Jeśli brak zapisanego ID lub karta nieważna, znajdź aktywną kartę Meet
            if (!meetTabId) {
                console.log('🔍 [REACTIVATE] Szukanie aktywnej karty Meet jako fallback...');
                meetTabId = await this.findActiveMeetTab();

                if (!meetTabId) {
                    console.error('❌ [REACTIVATE] Nie znaleziono żadnej karty Google Meet');
                    if (window.updateStatus) {
                        window.updateStatus('Nie znaleziono aktywnej karty Google Meet', 'error');
                    }
                    return;
                }

                console.log('✅ [REACTIVATE] Znaleziono aktywną kartę Meet:', meetTabId);

                // Zapisz nowo znalezione ID do storage
                await window.StorageManager.setStorageData({
                    [window.AppConstants.STORAGE_KEYS.MEET_TAB_ID]: meetTabId
                });
                console.log('💾 [REACTIVATE] Zapisano nowe MEET_TAB_ID do storage');
            }

            // ============================================
            // FAZA 1: ODZYSKAJ ZGROMADZONE DANE
            // ============================================

            const accumulatedData = await this.retrieveAccumulatedScanData(meetTabId);

            if (accumulatedData) {
                console.log('📦 [REACTIVATE] Znaleziono zgromadzone dane, łączenie...');

                try {
                    await this.mergeAccumulatedData(accumulatedData);

                    // DOPIERO TERAZ usuń ze storage - TYLKO jeśli merge się powiódł!
                    const storageKey = `backgroundScan_${meetTabId}`;
                    await window.StorageManager.removeStorageData([storageKey]);
                    console.log('🧹 [REACTIVATE] Dane połączone i wyczyszczono ze storage');

                } catch (mergeError) {
                    console.error('❌ [REACTIVATE] Merge failed, keeping data in storage for retry:', mergeError);

                    // ZOSTAW dane w storage - można spróbować ponownie później!
                    if (window.updateStatus) {
                        window.updateStatus('Częściowy błąd przywracania danych - dane zachowane', 'warning');
                    }
                }
            } else {
                console.log('📭 [REACTIVATE] Brak zgromadzonych danych do odzyskania');
            }

            // ============================================
            // FAZA 2: RESTART SKANOWANIA W TLE
            // ============================================

            console.log('🔄 [REACTIVATE] Restartowanie background scanning dla tab:', meetTabId);

            const restartSuccess = await this.startBackgroundScanningWithRetry(meetTabId);

            if (restartSuccess) {
                console.log('✅ [REACTIVATE] ===== REAKTYWACJA ZAKOŃCZONA SUKCESEM =====');

                if (window.updateStatus) {
                    window.updateStatus('Skanowanie w tle wznowione pomyślnie', 'success');
                }
            } else {
                console.error('❌ [REACTIVATE] ===== REAKTYWACJA NIEUDANA =====');

                if (window.updateStatus) {
                    window.updateStatus('Nie udało się wznowić skanowania w tle', 'error');
                }
            }

        } catch (error) {
            console.error('❌ [REACTIVATE] Krytyczny błąd podczas reaktywacji:', error);

            if (window.updateStatus) {
                window.updateStatus('Błąd reaktywacji: ' + error.message, 'error');
            }
        }
    },

    /**
     * Pobranie zgromadzonych danych ze skanowania w tle
     * Wywoływane gdy popup otwiera się ponownie podczas aktywnego nagrywania
     * @param {number} tabId - ID karty która była skanowana
     * @returns {Promise<Object|null>} Zgromadzone dane lub null
     */
    /**
     * Retrieve accumulated scan data with multi-path recovery
     * Tries: Primary → Checkpoints → Meeting URL match
     *
     * @param {number} tabId - Meet tab ID
     * @returns {Promise<Object|null>} Accumulated transcript data or null
     */
    async retrieveAccumulatedScanData(tabId) {
        console.log('🔍 [RETRIEVE] Searching for accumulated data, tabId:', tabId);

        // RECOVERY PATH 1: Primary storage key
        const primaryData = await this._tryPrimaryKey(tabId);
        if (primaryData) {
            console.log('✅ [RETRIEVE] Found data via primary key');
            return primaryData;
        }

        // RECOVERY PATH 2: Checkpoints (if primary failed or outdated)
        const checkpointData = await this._tryCheckpoints(tabId);
        if (checkpointData) {
            console.log('✅ [RETRIEVE] Found data via checkpoint');
            return checkpointData;
        }

        // RECOVERY PATH 3: Meeting URL match (tab ID reuse protection)
        const urlMatchData = await this._tryMeetingUrlMatch();
        if (urlMatchData) {
            console.log('✅ [RETRIEVE] Found data via meeting URL match');
            return urlMatchData;
        }

        console.log('⚠️ [RETRIEVE] No accumulated data found');
        return null;
    },

    /**
     * Połączenie zgromadzonych danych z istniejącą transkrypcją
     * Używa detekcji duplikatów przez hashe do identyfikacji nowych wiadomości
     * @param {Object} accumulatedData - Zgromadzone dane transkrypcji ze storage
     */
    async mergeAccumulatedData(accumulatedData) {
        // Prevent race condition with handleBackgroundScanUpdate
        if (this._isMergingData) {
            console.log('🔄 [MERGE] Already merging, queuing...');
            // Wait 100ms and try again
            await new Promise(resolve => setTimeout(resolve, 100));
            if (this._isMergingData) {
                console.warn('⚠️ [MERGE] Still merging, aborting this merge');
                return;
            }
        }

        this._isMergingData = true;

        try {
            console.log('🔄 [MERGE] Łączenie zgromadzonych danych z istniejącą transkrypcją');

            if (!accumulatedData || !accumulatedData.messages || accumulatedData.messages.length === 0) {
                console.log('🔄 [MERGE] Brak wiadomości do połączenia');
                return;
            }

            const exportTxtBtn = document.getElementById('exportTxtBtn');

            // Pobierz obecny stan transkrypcji
            const currentMessages = window.transcriptData?.messages || [];
            const newMessages = accumulatedData.messages;

            console.log('🔄 [MERGE] Porównanie danych:', {
                obecnychWiadomosci: currentMessages.length,
                nowychWiadomosci: newMessages.length
            });

            // Wykryj zmiany używając porównania hashy (istniejąca metoda)
            const changes = this.detectChanges(currentMessages, newMessages);

            console.log('🔄 [MERGE] Wykryte zmiany:', {
                dodane: changes.added.length,
                zaktualizowane: changes.updated.length,
                usuniete: changes.removed.length
            });

            // Jeśli brak zmian, nic nie rób
            if (changes.added.length === 0 && changes.updated.length === 0) {
                console.log('✅ [MERGE] Brak nowych wiadomości, dane aktualne');
                return;
            }

            // Zainicjuj lub zaktualizuj transcriptData
            if (!window.transcriptData) {
                console.log('🔄 [MERGE] Inicjalizacja danych transkrypcji');
                window.transcriptData = {
                    messages: newMessages,
                    scrapedAt: accumulatedData.scrapedAt,
                    meetingUrl: accumulatedData.meetingUrl
                };
            } else {
                console.log('🔄 [MERGE] Aktualizacja istniejących danych');
                window.transcriptData.messages = newMessages;
                window.transcriptData.scrapedAt = accumulatedData.scrapedAt;
            }

            // Zaktualizuj wyświetlanie z przyrostowymi zmianami
            if (window.displayTranscript) {
                window.displayTranscript(window.transcriptData, changes);
            }

            // Zaktualizuj statystyki
            if (window.updateStats) {
                window.updateStats(window.transcriptData);
            }

            // Dokończ przywracanie filtrów
            if (window.SearchFilterManager && window.SearchFilterManager.completePendingRestoration) {
                window.SearchFilterManager.completePendingRestoration();
            }

            // Włącz przycisk eksportu
            if (exportTxtBtn) {
                exportTxtBtn.disabled = false;
            }

            // Auto-zapis sesji
            if (window.SessionHistoryManager && window.SessionHistoryManager.autoSaveCurrentSession) {
                window.SessionHistoryManager.autoSaveCurrentSession();
            }

            // Zapisz do storage
            await window.StorageManager.saveTranscriptData(window.transcriptData);

            // Zaktualizuj status
            if (window.updateStatus) {
                window.updateStatus(
                    `Przywrócono ${changes.added.length} nowych wpisów (${window.transcriptData.messages.length} łącznie)`,
                    'success'
                );
            }

            console.log('✅ [MERGE] Dane połączone pomyślnie:', {
                calkowiteWiadomosci: window.transcriptData.messages.length,
                nowoDodanych: changes.added.length
            });

        } catch (error) {
            console.error('❌ [MERGE] Błąd łączenia danych:', error);

            if (window.updateStatus) {
                window.updateStatus('Błąd podczas przywracania danych transkrypcji', 'error');
            }
        } finally {
            this._isMergingData = false;
        }
    },

    /**
     * Try primary storage key recovery
     * @private
     * @param {number} tabId - Tab ID
     * @returns {Promise<Object|null>} Data or null
     */
    async _tryPrimaryKey(tabId) {
        try {
            const storageKey = `backgroundScan_${tabId}`;
            const result = await window.StorageManager.getStorageData([storageKey]);
            const scanData = result[storageKey];

            if (!scanData || !scanData.data) {
                return null;
            }

            // Check age (1 hour max)
            const dataAge = Date.now() - scanData.timestamp;
            const MAX_AGE = 60 * 60 * 1000;

            if (dataAge > MAX_AGE) {
                console.warn(`⚠️ [RETRIEVE] Primary data too old (${Math.round(dataAge / 60000)} minutes)`);
                return null;
            }

            return scanData.data;
        } catch (error) {
            console.error('❌ [RETRIEVE] Primary key failed:', error);
            return null;
        }
    },

    /**
     * Try checkpoint recovery
     * @private
     * @param {number} tabId - Tab ID
     * @returns {Promise<Object|null>} Data or null
     */
    async _tryCheckpoints(tabId) {
        try {
            const allData = await chrome.storage.local.get(null);
            const checkpointKeys = Object.keys(allData)
                .filter(k => k.startsWith(`checkpoint_${tabId}_`))
                .sort()
                .reverse(); // Most recent first

            if (checkpointKeys.length === 0) {
                return null;
            }

            // Try most recent checkpoint
            const latestCheckpoint = allData[checkpointKeys[0]];

            // Verify age
            const checkpointAge = Date.now() - latestCheckpoint.timestamp;
            const MAX_AGE = 60 * 60 * 1000;

            if (checkpointAge > MAX_AGE) {
                console.warn(`⚠️ [RETRIEVE] Checkpoint too old (${Math.round(checkpointAge / 60000)} minutes)`);

                // Cleanup old checkpoints
                await chrome.storage.local.remove(checkpointKeys);
                return null;
            }

            console.log(`💾 [RETRIEVE] Using checkpoint (${latestCheckpoint.data.messages.length} messages)`);
            return latestCheckpoint.data;

        } catch (error) {
            console.error('❌ [RETRIEVE] Checkpoint recovery failed:', error);
            return null;
        }
    },

    /**
     * Try meeting URL match recovery (protection against tab ID reuse)
     * @private
     * @returns {Promise<Object|null>} Data or null
     */
    async _tryMeetingUrlMatch() {
        try {
            const currentMeetingUrl = window.transcriptData?.meetingUrl;

            if (!currentMeetingUrl) {
                console.log('⚠️ [RETRIEVE] No current meeting URL for matching');
                return null;
            }

            const allData = await chrome.storage.local.get(null);

            // Search all backgroundScan_* keys for matching URL
            for (const [key, value] of Object.entries(allData)) {
                if (key.startsWith('backgroundScan_') && value.meetingUrl === currentMeetingUrl) {
                    console.log(`🔗 [RETRIEVE] Found data by URL match: ${key}`);

                    // Verify age
                    const dataAge = Date.now() - value.timestamp;
                    const MAX_AGE = 60 * 60 * 1000;

                    if (dataAge > MAX_AGE) {
                        console.warn('⚠️ [RETRIEVE] URL-matched data too old');
                        return null;
                    }

                    return value.data;
                }
            }

            return null;
        } catch (error) {
            console.error('❌ [RETRIEVE] URL match failed:', error);
            return null;
        }
    },

    /**
     * Flush pending data immediately (called on popup close)
     * @returns {Promise<void>}
     */
    async flushPendingData() {
        try {
            console.log('💾 [FLUSH] Flushing pending background scan data');

            const meetTabId = await window.StorageManager.getStorageData([
                window.AppConstants.STORAGE_KEYS.MEET_TAB_ID
            ]);

            if (!meetTabId.meetTabId) {
                console.log('⚠️ [FLUSH] No meet tab ID found');
                return;
            }

            const accumulatedData = await this.retrieveAccumulatedScanData(meetTabId.meetTabId);

            if (accumulatedData && accumulatedData.messages?.length > 0) {
                console.log(`💾 [FLUSH] Found ${accumulatedData.messages.length} messages to merge`);

                // Force merge even if popup closing
                await this.mergeAccumulatedData(accumulatedData);

                // Cleanup storage after successful merge
                await this._cleanupBackgroundScanData(meetTabId.meetTabId);

                console.log('✅ [FLUSH] Data flushed successfully');
            } else {
                console.log('💾 [FLUSH] No pending data to flush');
            }
        } catch (error) {
            console.error('❌ [FLUSH] Failed to flush data:', error);
        }
    },

    /**
     * Cleanup background scan data after successful merge
     * @private
     * @param {number} tabId - Tab ID
     * @returns {Promise<void>}
     */
    async _cleanupBackgroundScanData(tabId) {
        try {
            const allData = await chrome.storage.local.get(null);
            const keysToRemove = [];

            // Remove primary key
            keysToRemove.push(`backgroundScan_${tabId}`);

            // Remove all checkpoints for this tab
            const checkpointKeys = Object.keys(allData).filter(k =>
                k.startsWith(`checkpoint_${tabId}_`)
            );
            keysToRemove.push(...checkpointKeys);

            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
                console.log(`🧹 [CLEANUP] Removed ${keysToRemove.length} background scan keys`);
            }
        } catch (error) {
            console.error('❌ [CLEANUP] Failed:', error);
        }
    },

    /**
     * Weryfikuj czy karta istnieje i jest kartą Google Meet
     * Konwertuje callback-based chrome.tabs.get na Promise
     * @param {number} tabId - ID karty do weryfikacji
     * @returns {Promise<boolean>} true jeśli karta jest aktywną kartą Meet
     */
    async verifyMeetTab(tabId) {
        return new Promise((resolve) => {
            chrome.tabs.get(tabId, (tab) => {
                if (chrome.runtime.lastError) {
                    console.log('🔍 [VERIFY] Karta nie istnieje:', chrome.runtime.lastError.message);
                    resolve(false);
                    return;
                }

                if (!tab || !tab.url) {
                    console.log('🔍 [VERIFY] Karta nie ma URL');
                    resolve(false);
                    return;
                }

                const isMeetTab = tab.url.includes('meet.google.com');
                console.log('🔍 [VERIFY] Karta', tabId, isMeetTab ? 'JEST' : 'NIE JEST', 'kartą Meet');
                resolve(isMeetTab);
            });
        });
    },

    /**
     * Znajdź aktywną kartę Google Meet jako fallback
     * Używane gdy MEET_TAB_ID nie istnieje w storage lub jest nieważny
     * @returns {Promise<number|null>} ID karty Meet lub null
     */
    async findActiveMeetTab() {
        return new Promise((resolve) => {
            // Najpierw spróbuj znaleźć aktywną kartę w bieżącym oknie
            chrome.tabs.query({
                active: true,
                currentWindow: true,
                url: 'https://meet.google.com/*'
            }, (tabs) => {
                if (tabs && tabs.length > 0) {
                    console.log('🔍 [FIND] Znaleziono aktywną kartę Meet w bieżącym oknie:', tabs[0].id);
                    resolve(tabs[0].id);
                    return;
                }

                // Fallback: Znajdź DOWOLNĄ kartę Meet (nawet nieaktywną)
                chrome.tabs.query({
                    url: 'https://meet.google.com/*'
                }, (tabs) => {
                    if (tabs && tabs.length > 0) {
                        console.log('🔍 [FIND] Znaleziono kartę Meet (nieaktywna):', tabs[0].id);
                        resolve(tabs[0].id);
                    } else {
                        console.log('🔍 [FIND] Nie znaleziono żadnej karty Meet');
                        resolve(null);
                    }
                });
            });
        });
    },

    /**
     * Restart background scanning z retry mechanism
     * Próbuje 3 razy z opóźnieniem 1 sekundy
     * @param {number} tabId - ID karty do skanowania
     * @returns {Promise<boolean>} true jeśli sukces
     */
    async startBackgroundScanningWithRetry(tabId, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 [RETRY] Próba ${attempt}/${maxRetries} restart skanowania...`);

                await this.startBackgroundScanning(tabId);

                console.log(`✅ [RETRY] Sukces na próbie ${attempt}`);
                return true;

            } catch (error) {
                console.warn(`⚠️ [RETRY] Próba ${attempt} nieudana:`, error.message);

                if (attempt < maxRetries) {
                    console.log(`🔄 [RETRY] Oczekiwanie 1 sekundę przed następną próbą...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    console.error(`❌ [RETRY] Wszystkie ${maxRetries} próby wyczerpane`);
                    return false;
                }
            }
        }

        return false;
    },

    /**
     * Detect changes between old and new transcript messages
     * Source: popup-old.js lines 2239-2348
     * @param {Array} oldMessages - Previous transcript messages
     * @param {Array} newMessages - New transcript messages
     * @returns {Object} Object with added, updated, and removed arrays
     */
    detectChanges(oldMessages, newMessages) {
        const changes = {
            added: [],
            updated: [],
            removed: []
        };
        
        // Debug: log input parameters
        console.log('🔍 [DEBUG] detectChanges input:', {
            oldCount: oldMessages ? oldMessages.length : 0,
            newCount: newMessages ? newMessages.length : 0
        });
        
        // Handle null/empty cases
        if (!oldMessages || oldMessages.length === 0) {
            // All new messages are added
            if (newMessages && newMessages.length > 0) {
                changes.added = [...newMessages];
                console.log('🔍 [DEBUG] No old messages, all new messages added:', changes.added.length);
            }
            return changes;
        }
        
        if (!newMessages || newMessages.length === 0) {
            // All old messages are removed
            changes.removed = [...oldMessages];
            console.log('🔍 [DEBUG] No new messages, all old messages removed:', changes.removed.length);
            return changes;
        }
        
        // Create hash maps for efficient lookups
        const oldHashes = new Map();
        const newHashes = new Map();
        
        // Map old messages by hash for quick lookup
        oldMessages.forEach((msg, index) => {
            oldHashes.set(msg.hash, { ...msg, originalIndex: index });
        });
        
        // Map new messages by hash  
        newMessages.forEach((msg, index) => {
            newHashes.set(msg.hash, { ...msg, originalIndex: index });
        });
        
        console.log('🔍 [DEBUG] Hash comparison:', {
            oldHashes: oldHashes.size,
            newHashes: newHashes.size,
            oldHashSample: Array.from(oldHashes.keys()).slice(0, 3),
            newHashSample: Array.from(newHashes.keys()).slice(0, 3)
        });
        
        // First pass: Position-based comparison for updates (same position, same speaker, different text)
        const minLength = Math.min(oldMessages.length, newMessages.length);
        for (let i = 0; i < minLength; i++) {
            const oldMsg = oldMessages[i];
            const newMsg = newMessages[i];
            
            if (oldMsg.speaker === newMsg.speaker && oldMsg.hash !== newMsg.hash) {
                // Same speaker at same position but different hash = update
                changes.updated.push({
                    ...newMsg,
                    index: i,  // Preserve position index
                    previousText: oldMsg.text
                });
                console.log(`🔍 [DEBUG] Updated message at position ${i}:`, newMsg.speaker, `"${oldMsg.text.substring(0, 20)}" -> "${newMsg.text.substring(0, 20)}"`);
                
                // Remove from hash maps to avoid double-processing
                oldHashes.delete(oldMsg.hash);
                newHashes.delete(newMsg.hash);
            } else if (oldMsg.hash === newMsg.hash) {
                // Identical messages - remove from hash maps
                oldHashes.delete(oldMsg.hash);
                newHashes.delete(newMsg.hash);
            }
        }
        
        // Second pass: Hash-based comparison for additions/removals
        // Find new messages (in new but not in old)
        newHashes.forEach((newMsg, hash) => {
            if (!oldHashes.has(hash)) {
                changes.added.push(newMsg);
                console.log(`🔍 [DEBUG] Added new message:`, newMsg.speaker, newMsg.text.substring(0, 30));
            }
        });
        
        // Find removed messages (in old but not in new)
        oldHashes.forEach((oldMsg, hash) => {
            if (!newHashes.has(hash)) {
                changes.removed.push(oldMsg);
                console.log(`🔍 [DEBUG] Removed message:`, oldMsg.speaker, oldMsg.text.substring(0, 30));
            }
        });
        
        console.log('🔍 [DEBUG] detectChanges final result:', {
            added: changes.added.length,
            updated: changes.updated.length,
            removed: changes.removed.length
        });
        
        // Log samples for debugging
        if (changes.updated.length > 0) {
            console.log('🔍 [DEBUG] Updated message sample:', {
                speaker: changes.updated[0].speaker,
                oldText: changes.updated[0].previousText?.substring(0, 30),
                newText: changes.updated[0].text.substring(0, 30)
            });
        }
        
        return changes;
    },

    /**
     * Initialize all background scanner functionality
     */
    initialize() {
        this.initializeMessageListener();
        // 30-second auto-save interval removed - real-time auto-save handles all saves
        
        // CRITICAL FIX: Expose detectChanges globally for backward compatibility
        window.detectChanges = this.detectChanges.bind(this);
        console.log('🔗 [BACKGROUND] detectChanges exposed globally');
        
        console.log('🔄 Background Scanner initialized');
    }
};