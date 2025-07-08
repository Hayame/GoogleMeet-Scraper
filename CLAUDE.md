# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Google Meet transcript scraping Chrome/Edge extension that extracts transcripts from Google Meet sessions. The extension works by injecting a content script into Google Meet pages to scrape transcript data from the DOM and provide export functionality.

## Architecture

The extension follows the standard Chrome extension architecture:

- **manifest.json**: Extension configuration with permissions for Google Meet pages
- **content.js**: Content script that runs on meet.google.com pages, handles DOM scraping and transcript extraction
- **popup.html/popup.js**: Extension popup interface for user interactions, export controls, and realtime monitoring
- **style.css**: UI styling for the popup interface
- **background-js.js**: Background script for extension lifecycle management
- **Icons**: Standard Chrome extension icons (16px, 48px, 128px)

## Key Components

### Content Script (content.js)
- Scrapes transcript data from Google Meet's DOM using multiple selector strategies
- Handles realtime transcript monitoring via MutationObserver
- Communicates with popup via Chrome extension messaging API
- Implements fallback methods for different Google Meet UI versions

### Popup Interface (popup.js)
- Provides manual transcript scraping functionality
- Implements realtime recording mode with auto-refresh every 2 seconds
- Handles TXT and JSON export formats
- Manages transcript data persistence via chrome.storage.local

## DOM Scraping Strategy

The extension uses multiple CSS selectors to handle different Google Meet UI versions:
- Primary containers: `.a4cQT`, `[jscontroller="MZnM8e"]`, `[jscontroller="bzaDVe"]`
- Speaker elements: `[jsname="hJNqvr"]`, `.MBpOc`, `.NeplSy`
- Text elements: `[jsname="YSAhf"]`, `[jsname="MBpOc"]`, `[jsname="NeplSy"]`
- Timestamp elements: `.frX31c-vlczkd`, `.P5KVFf`, `[jsname="r2fjRf"]`

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

### Code Architecture Notes
- The extension uses Chrome Manifest V3 with appropriate permissions
- All transcript data is processed locally - no external servers involved
- Realtime mode uses polling every 2 seconds rather than continuous DOM observation
- Duplicate detection prevents repeated entries in transcript data

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