# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Google Meet transcript scraping Chrome/Edge extension that extracts transcripts from Google Meet sessions. The extension works by injecting a content script into Google Meet pages to scrape transcript data from the DOM and provide export functionality.

## Architecture

The extension follows a modular Chrome extension architecture with 15 specialized modules:

### Core Infrastructure
- **manifest.json**: Extension configuration with permissions for Google Meet pages
- **content.js**: Content script that runs on meet.google.com pages
- **background-js.js**: Background script for extension lifecycle management
- **popup.html**: Main UI interface
- **style.css**: UI styling for the popup interface
- **Icons**: Standard Chrome extension icons (16px, 48px, 128px)

### Modular JavaScript Architecture

#### Core Modules (Foundation)
- **js/core/state-manager.js**: Global state management and restoration logic
- **js/core/storage-manager.js**: Chrome storage operations and data persistence
- **js/core/ui-manager.js**: Button visibility and UI state management
- **js/core/timer-manager.js**: Duration tracking and timer logic

#### Utility Modules (Helpers)
- **js/utils/constants.js**: Application constants and configuration
- **js/utils/formatters.js**: Date/duration formatting functions
- **js/utils/dom-helpers.js**: DOM manipulation utilities

#### Feature Modules (Functionality)
- **js/features/recording.js**: Recording start/stop functionality
- **js/features/background-scanner.js**: Background transcript scanning
- **js/features/session-history.js**: Session CRUD operations
- **js/features/session-ui.js**: Session history UI rendering
- **js/features/transcript.js**: Transcript display and management
- **js/features/export.js**: TXT/JSON export functionality
- **js/features/search-filter.js**: Search and participant filtering
- **js/features/modal-manager.js**: Modal dialogs management

#### Main Entry Point
- **popup.js**: Application orchestrator and module initialization

## Key Components

### Content Script (content.js)
- Scrapes transcript data from Google Meet's DOM using multiple selector strategies
- Handles realtime transcript monitoring via MutationObserver
- Communicates with popup via Chrome extension messaging API
- Implements fallback methods for different Google Meet UI versions

### Modular Popup System
- **Recording Manager**: Handles start/stop recording with state management
- **Background Scanner**: Manages realtime transcript monitoring via 2-second intervals
- **Session Manager**: Provides session CRUD operations with auto-save functionality
- **Transcript Manager**: Handles display, search, and filtering of transcript data
- **Export Manager**: Implements TXT and JSON export formats
- **UI Manager**: Centralized button visibility and status management

## DOM Scraping Strategy

The extension uses multiple CSS selectors to handle different Google Meet UI versions:
- Primary containers: `.a4cQT`, `[jscontroller="MZnM8e"]`, `[jscontroller="bzaDVe"]`
- Speaker elements: `[jsname="hJNqvr"]`, `.MBpOc`, `.NeplSy`
- Text elements: `[jsname="YSAhf"]`, `[jsname="MBpOc"]`, `[jsname="NeplSy"]`
- Timestamp elements: `.frX31c-vlczkd`, `.P5KVFf`, `[jsname="r2fjRf"]`

## Module Dependencies

### Loading Order (defined in popup.html)
1. **Core modules** (constants, storage-manager, state-manager, ui-manager, timer-manager)
2. **Utility modules** (formatters, dom-helpers)
3. **Feature modules** (modal-manager, recording, background-scanner, session-history, session-ui, transcript, export, search-filter)
4. **Main script** (popup.js)

### Inter-Module Communication
- Modules communicate via global window object
- State management centralized in StateManager
- Storage operations handled by StorageManager
- UI updates coordinated through UIManager

### Module Initialization Sequence
```javascript
1. StateManager.initialize()
2. UIManager.initialize()
3. TimerManager.initialize()
4. ModalManager.initialize()
5. BackgroundScanner.initialize()
6. RecordingManager.initialize()
7. SessionHistoryManager + SessionUIManager.initialize()
8. TranscriptManager.initialize()
9. SearchFilterManager.initialize()
10. ExportManager.initialize()
11. Main event listeners setup
12. Theme system initialization
13. State restoration
```

## Development

### Testing the Extension
1. Load the extension in Chrome: `chrome://extensions/` → Enable Developer mode → Load unpacked
2. Navigate to a Google Meet session with captions enabled
3. Click the extension icon to open the popup interface
4. Test both manual scraping and realtime recording modes

### Debugging
- Use browser console (F12) on Google Meet pages to debug content script
- Check extension popup console for popup script debugging
- Monitor Chrome extension logs in `chrome://extensions/`
- Each module has comprehensive console logging with prefixes (🔄, 🟢, 🔴, etc.)

### Working with Modular Codebase
- **Adding new features**: Create new modules in appropriate subdirectory
- **Modifying state**: Use StateManager getter/setter methods
- **Storage operations**: Use StorageManager methods consistently
- **UI updates**: Route through UIManager for consistency
- **Module exports**: Use `window.ModuleName = {...}` pattern

### Code Architecture Notes
- The extension uses Chrome Manifest V3 with appropriate permissions
- All transcript data is processed locally - no external servers involved
- Realtime mode uses polling every 2 seconds rather than continuous DOM observation
- Duplicate detection prevents repeated entries in transcript data
- Modular architecture enables easier testing and maintenance

## Export Formats

### TXT Format
Plain text with speaker names, timestamps, and formatted output suitable for reading

### JSON Format
Structured data format containing:
- `entries[]`: Array of transcript entries with speaker, text, and timestamp
- `scrapedAt`: ISO timestamp of when data was scraped
- `meetingUrl`: Google Meet session URL

## Limitations
- Only works with Google Meet's native captions (not external captions)
- Requires captions to be enabled in the meeting
- Scrapes only currently visible transcript (older messages may scroll out of view)
- No automatic persistence - requires manual export or realtime mode activation