# Knowledge Graph Summary

## Statistics
| Metric | Count |
|--------|------:|
| Total Symbols | 93 |
| -- SRV (Services/Managers) | 18 |
| -- UTL (Utilities) | 67 |
| -- CNS (Constants) | 3 |
| -- STR (State) | 5 |
| Total Relations | 55 |
| -- USES | 55 |
| Circular Dependencies | 2 |
| Business Rules | 55 |
| Chrome Messages | 13 |

## Top 10 Most Connected Symbols
| Rank | Symbol | ID | In | Out | Total | Role |
|------|--------|----|-----|-----|-------|------|
| 1 | SessionHistoryManager | S015 | 4 | 8 | 12 | Core service: session CRUD, auto-save, highest fan-out |
| 2 | StorageManager | S002 | 10 | 1 | 11 | Infrastructure hub: used by nearly every module |
| 3 | UIManager | S003 | 5 | 4 | 9 | UI hub: status, button visibility, sidebar |
| 4 | StateManager | S001 | 6 | 2 | 8 | State hub: central getter/setter pairs |
| 5 | BackgroundScanner | S014 | 2 | 6 | 8 | Data pipeline: merge queue, scan coordination |
| 6 | TranscriptManager | S017 | 5 | 2 | 7 | Display hub: transcript rendering and stats |
| 7 | SearchFilterManager | S020 | 5 | 2 | 7 | Filter hub: search and participant filtering |
| 8 | RecordingManager | S013 | 0 | 6 | 6 | Orchestrator: no inbound deps, drives recording flow |
| 9 | SettingsManager | S023 | 1 | 5 | 6 | Settings service: user preferences, multi-prompt CRUD, Google name |
| 10 | TransactionCoordinator | S005 | 3 | 2 | 5 | Safety layer: atomic writes with rollback |

## Architectural Observations
- **Hub-and-spoke storage pattern**: StorageManager (S002) has the highest in-degree (10) -- nearly every module depends on it for persistence. This is appropriate given its role as the single abstraction over chrome.storage.
- **Leaf orchestrators**: RecordingManager (S013) and SettingsManager (S023) have zero or near-zero in-degree but high out-degree, acting as user-action entry points that orchestrate multiple subsystems.
- **Two runtime-resolved circular dependencies**: S015 <-> S016 (SessionHistoryManager <-> SessionUIManager) and S017 <-> S020 (TranscriptManager <-> SearchFilterManager). Both are resolved via late-binding through `window.*` globals rather than direct imports, so they do not cause load-order issues.
- **Orphan modules**: ThemeManager (S022) and DebugManager (S012) have no inbound or outbound module-level dependencies. ThemeManager operates solely on localStorage and DOM attributes; DebugManager is a development-only introspection tool.
- **High UTL count is inflated by global aliases**: 22 of the 54 UTL symbols (S024-S045) are thin `window.*` delegation aliases, not independent logic. The true utility function count is 32.
- **Three execution contexts with Chrome messaging bridge**: Popup (23 modules), Content Script (1 file + shared detector), and Background Service Worker (1 file). They communicate through 13 Chrome runtime message routes.
- **Strong data integrity layer**: TransactionCoordinator (S005) + DataIntegrity (S011) + checkpoint system (S065-S066) provide crash recovery, orphan detection, and atomic writes -- unusual depth for a browser extension.
- **No external dependencies**: The entire project is vanilla JS with zero npm packages, reducing supply-chain risk but increasing the surface area of hand-rolled utilities.

## Recent Changes (cosmetic, no symbol impact)
- **UI Cleanup (2026-02-14)**: CSS dedup (~150 lines removed from style.css), design token migration in session-history.css, unified trash icons to stroke-based SVG across S016 (SessionUIManager) and S023 (SettingsManager), compacted settings tabs. No new/removed symbols; only innerHTML markup and CSS values changed.

## Index Health Metrics
| Metric | Value | Status |
|--------|-------|--------|
| Last full reindex | 2026-02-14 | OK |
| Source files in repo | 27 | -- |
| Source files indexed | 27 | OK |
| Coverage | 100% | OK |
| Symbols [REMOVED] | 4 | OK |
| Dangling references | 0 | OK |
| Circular dependencies | 2 (runtime-resolved) | WARN |

## Full Graph (Mermaid)

```mermaid
graph TD
    subgraph Infrastructure
        S080["S080 DEBUG_ENABLED"]
        S006["S006 AppConstants"]
    end

    subgraph Core
        S005["S005 TransactionCoordinator"]
        S002["S002 StorageManager"]
        S001["S001 StateManager"]
        S003["S003 UIManager"]
        S004["S004 TimerManager"]
    end

    subgraph Utilities
        S007["S007 Formatters"]
        S008["S008 DOMHelpers"]
        S009["S009 GoogleUserDetector"]
        S010["S010 SessionUtils"]
        S011["S011 DataIntegrity"]
    end

    subgraph Features
        S013["S013 RecordingManager"]
        S014["S014 BackgroundScanner"]
        S015["S015 SessionHistoryManager"]
        S016["S016 SessionUIManager"]
        S017["S017 TranscriptManager"]
        S018["S018 TranscriptRefreshManager"]
        S019["S019 ExportManager"]
        S020["S020 SearchFilterManager"]
        S021["S021 ModalManager"]
        S022["S022 ThemeManager"]
        S023["S023 SettingsManager"]
    end

    subgraph ContentScript
        S051["S051 scrapeTranscript"]
        S059["S059 enableCaptionsIfNeeded"]
    end

    subgraph Background
        S063["S063 startBackgroundScanning"]
        S065["S065 createCheckpoint"]
    end

    subgraph Popup
        S067["S067 initializeApplication"]
    end

    %% Core dependencies
    S005 --> S002
    S005 --> S006
    S002 --> S006
    S001 --> S002
    S001 --> S006
    S003 --> S001
    S003 --> S016
    S003 --> S020
    S004 --> S001
    S004 --> S002

    %% Utility dependencies
    S010 --> S007
    S011 --> S002
    S011 --> S006

    %% Feature dependencies
    S013 --> S001
    S013 --> S002
    S013 --> S003
    S013 --> S004
    S013 --> S005
    S013 --> S014

    S014 --> S001
    S014 --> S002
    S014 --> S005
    S014 --> S015
    S014 --> S017
    S014 --> S020

    S015 --> S001
    S015 --> S002
    S015 --> S003
    S015 --> S004
    S015 --> S005
    S015 --> S016
    S015 --> S017
    S015 --> S020

    S016 --> S015
    S016 --> S017
    S016 --> S020

    S017 --> S008
    S017 --> S020

    S018 --> S002
    S018 --> S003
    S018 --> S014
    S018 --> S017

    S019 --> S003
    S019 --> S021
    S019 --> S023

    S020 --> S001
    S020 --> S017

    S021 --> S015

    S023 --> S002
    S023 --> S003
    S023 --> S015
    S023 --> S019
    S023 --> S021

    %% Cross-context messaging
    S067 -.->|startBackgroundScanning| S063
    S063 -.->|scrapeTranscript| S051
    S063 -.->|backgroundScanUpdate| S014
    S009 -.->|updateGoogleUserName| S063
```
