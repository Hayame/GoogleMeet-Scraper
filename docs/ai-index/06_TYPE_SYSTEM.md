# Type System

Note: This project uses vanilla JavaScript without TypeScript. Types documented here are implicit shapes observed from the code.

## Core Data Structures

### TranscriptData (stored in chrome.storage.local as `transcriptData`)
```javascript
{
  messages: TranscriptMessage[],
  scrapedAt: string,        // ISO 8601 timestamp
  meetingUrl: string         // e.g. "https://meet.google.com/abc-defg-hij"
}
```
- **Produced by**: content.js scrapeTranscript() (S051)
- **Consumed by**: TranscriptManager (S017), ExportManager (S019), BackgroundScanner (S014)
- **Stored in**: chrome.storage.local[STORAGE_KEYS.TRANSCRIPT_DATA]

### TranscriptMessage
```javascript
{
  index: number,             // Position in scrape result
  speaker: string,           // Speaker name (may be user display name)
  text: string,              // Sanitized transcript text
  hash: string,              // base36 hash of speaker:text (for dedup/change detection)
  timestamp?: string         // Optional timestamp string
}
```
- **Produced by**: content.js scrapeTranscript() (S051)
- **Used by**: BackgroundScanner.detectChanges (S027), TranscriptManager (S017)

### Session (stored in sessionHistory array)
```javascript
{
  id: string,                // "session_<timestamp>_<random>" format
  title: string,             // "Spotkanie o HH:MM" format
  date: string,              // ISO 8601 creation timestamp
  participantCount: number,
  entryCount: number,
  transcript: TranscriptData,
  totalDuration: number      // Duration in seconds
}
```
- **Produced by**: SessionHistoryManager._performAutoSave (S015)
- **Stored in**: chrome.storage.local[STORAGE_KEYS.SESSION_HISTORY]
- **Rendered by**: SessionUIManager.renderSessionHistory (S016)

### SessionState (internal to StateManager)
```javascript
{
  recordingStartTime: Date | null,
  sessionStartTime: Date | null,
  totalDuration: number,     // Accumulated seconds from previous recording segments
  isRecordingStopped: boolean,
  isRecordingPaused: boolean,
  isRestorationInProgress: boolean
}
```
- **Managed by**: StateManager (S001) via getter/setter pairs

### UIState (stored in chrome.storage.local as `lastUIState`)
```javascript
{
  sidebarCollapsed: boolean,
  searchPanelOpen: boolean,
  filterPanelOpen: boolean,
  searchQuery: string,
  activeParticipantFilters: string[],
  theme: string,             // "light" | "dark"
  timestamp: number          // Date.now()
}
```
- **Saved by**: StateManager.saveUIState (S001)
- **Restored by**: StateManager.restoreUIState → UIManager.restoreUIState, SearchFilterManager.restoreFilterState

### TransactionOperation
```javascript
{
  key: string,   // chrome.storage key
  value: any     // Value to write
}
```
- **Used by**: TransactionCoordinator.executeTransaction (S005)

### MergeQueueOperation (internal to BackgroundScanner)
```javascript
{
  id: number,               // Sequential from _mergeSequence
  data: TranscriptData,
  priority: number,         // 100=restoration, 10=manual, 1=background
  timestamp: number,
  retryCount: number,
  onComplete: Function | null
}
```

### ChangeSet (returned by BackgroundScanner.detectChanges)
```javascript
{
  added: TranscriptMessage[],
  updated: TranscriptMessage[],   // May include previousText
  removed: TranscriptMessage[]
}
```

### BackgroundScanData (stored per tab in chrome.storage.local)
```javascript
{
  data: TranscriptData,
  timestamp: number,        // Date.now()
  sequenceNumber: number,   // Scan count
  meetingUrl: string
}
```
- **Key format**: `backgroundScan_<tabId>`
- **Produced by**: background.js startBackgroundScanning (S063)
- **Consumed by**: BackgroundScanner.retrieveAccumulatedScanData (S014)

### CheckpointData
```javascript
{
  data: TranscriptData,
  timestamp: number,
  scanCount: number,
  type: "CHECKPOINT"
}
```
- **Key format**: `checkpoint_<tabId>_<timestamp>`
- **Max kept**: 3 per tab

## Enumerations (AppConstants)

### SESSION_STATES
```javascript
{
  ACTIVE_RECORDING: "active_recording",
  PAUSED_SESSION: "paused_session",
  HISTORICAL_SESSION: "historical_session",
  NEW_SESSION: "new_session"
}
```

### APP_STATES
```javascript
{
  RECORDING: "recording",
  STOPPED: "stopped",
  PAUSED: "paused"
}
```

### THEMES
```javascript
{
  LIGHT: "light",
  DARK: "dark",
  AUTO: "auto"
}
```

### Button Visibility States (UIManager)
```
"RECORDING" — record button active, refresh visible, close hidden
"HISTORICAL" — record hidden, close visible, refresh hidden
"NEW"        — record button ready, close hidden, refresh hidden
```
