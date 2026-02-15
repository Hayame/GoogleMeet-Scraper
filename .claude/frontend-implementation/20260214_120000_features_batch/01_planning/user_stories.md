# User Stories -- Features Batch 2026-02-14

## Context

- Chrome Extension (Manifest V3), vanilla JS, no frameworks
- All UI text in Polish
- Session data schema: `{id, title, date, participantCount, entryCount, transcript: {messages: [{speaker, text, hash}], scrapedAt, meetingUrl}, totalDuration}`
- Existing capabilities: TXT export, clipboard copy, LLM prompt wrapping, session history (max 50), search within current session, recording with auto-save every 2s via background scanner

---

## US-1: Markdown Export

**As a** meeting organizer,
**I want** to export the transcript in Markdown format,
**so that** I can paste it directly into Notion, GitHub, or other Markdown-compatible tools with proper formatting preserved.

**Priority:** HIGH
**Complexity:** S
**Related Architecture:** `js/features/export.js`, `popup.html` (exportModal), `js/utils/constants.js` (EXPORT_FORMATS)

---

## US-2: Auto-Save on Meeting Close

**As a** meeting participant who sometimes forgets to stop recording,
**I want** the extension to automatically save the current session when Google Meet detects the meeting has ended,
**so that** I never lose transcript data due to forgetting to click stop.

**Priority:** HIGH
**Complexity:** M
**Related Architecture:** `content.js` (DOM observation), `background.js` (message relay), `js/features/recording.js`, `js/features/session-history.js`

---

## US-3: Caption Warning

**As a** meeting participant starting a recording,
**I want** to see a warning when captions are disabled or become unavailable during active recording,
**so that** I can re-enable captions before losing any transcript content.

**Priority:** HIGH
**Complexity:** M
**Related Architecture:** `content.js` (caption state detection), `background.js` (message relay), `js/features/recording.js`, `popup.html` (warning banner area)

---

## US-4: Transcript Pagination

**As a** user reviewing a long meeting transcript (500+ entries),
**I want** the transcript to be paginated with 100 entries per page,
**so that** the popup remains responsive and I can navigate through the content efficiently.

**Priority:** MEDIUM
**Complexity:** M
**Related Architecture:** `js/features/transcript.js` (displayTranscript), `popup.html` (pagination controls), `style.css`, `js/features/search-filter.js` (filter integration)

---

## US-5: Quick Copy with LLM Prompt

**As a** user who regularly pastes transcripts into AI chat interfaces,
**I want** a single-click button that copies the transcript wrapped in my selected LLM prompt to the clipboard,
**so that** I can skip the export modal and immediately paste into ChatGPT/Claude.

**Priority:** HIGH
**Complexity:** S
**Related Architecture:** `js/features/export.js` (copyToClipboard, wrapWithLLMPrompt), `popup.html` (transcript-actions area), `style.css`

---

## US-6: Session Search

**As a** user with many saved sessions,
**I want** to search across all saved sessions by keyword (in titles and transcript content),
**so that** I can quickly find a specific past meeting without scrolling through the full history.

**Priority:** MEDIUM
**Complexity:** M
**Related Architecture:** `popup.html` (sidebar search input), `js/features/session-ui.js`, `js/features/session-history.js`, `style.css`, `session-history.css`

---

## US-7: Session Merging

**As a** user who recorded the same meeting in multiple segments,
**I want** to merge two or more sessions into one using hash-based deduplication,
**so that** I get a single continuous transcript without duplicate entries.

**Priority:** LOW
**Complexity:** L
**Related Architecture:** `js/features/session-history.js`, `js/features/session-ui.js`, `popup.html` (merge modal), `style.css`

---

## US-8: Keyboard Shortcuts

**As a** power user who wants fast access to extension actions,
**I want** keyboard shortcuts for up to 4 key actions (start/stop recording, quick copy, export, open popup),
**so that** I can control the extension without clicking through the UI.

**Priority:** MEDIUM
**Complexity:** S
**Related Architecture:** `manifest.json` (commands), `background.js` (chrome.commands listener), `js/features/recording.js`, `js/features/export.js`

---

## US-9: Meeting Statistics

**As a** meeting facilitator analyzing participation,
**I want** to see a visual breakdown of speaker participation as CSS-only bar or pie charts,
**so that** I can quickly assess who spoke the most and identify imbalances.

**Priority:** LOW
**Complexity:** M
**Related Architecture:** `popup.html` (statistics section/modal), `style.css` (CSS-only charts), `js/features/transcript.js` (data aggregation)

---

## US-10: Import Sessions

**As a** user who wants to transfer sessions between devices or restore backups,
**I want** to import sessions from a JSON file,
**so that** I can restore previously exported data or receive transcripts from colleagues.

**Priority:** MEDIUM
**Complexity:** M
**Related Architecture:** `js/features/export.js` (or new import module), `js/features/session-history.js`, `popup.html` (import button in settings or sidebar), `js/utils/data-integrity.js`

---

## Story Map Summary

| Priority | Stories | Total Complexity |
|----------|---------|-----------------|
| HIGH     | US-1, US-2, US-3, US-5 | S + M + M + S = 2S + 2M |
| MEDIUM   | US-4, US-6, US-8, US-10 | M + M + S + M = S + 3M |
| LOW      | US-7, US-9 | L + M |

### Recommended Implementation Order

1. **US-1** (Markdown export) -- smallest scope, extends existing export pattern
2. **US-5** (Quick copy with prompt) -- small scope, high user value
3. **US-3** (Caption warning) -- protects data integrity during recording
4. **US-2** (Auto-save on meeting close) -- prevents data loss
5. **US-4** (Pagination) -- performance improvement for large transcripts
6. **US-8** (Keyboard shortcuts) -- small scope, Chrome Commands API is straightforward
7. **US-6** (Session search) -- useful once session count grows
8. **US-10** (Import sessions) -- complements existing export functionality
9. **US-9** (Meeting statistics) -- CSS-only charts, no external deps
10. **US-7** (Session merging) -- most complex, depends on stable session model
