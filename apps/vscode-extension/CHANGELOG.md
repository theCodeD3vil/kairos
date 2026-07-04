# Changelog

## 1.2.2

- keeps the VS Code companion aligned with Kairos Desktop 1.2.2 for a consistent update experience
- preserves local activity tracking while the desktop app adds clearer background refresh feedback

## 1.2.1

- recovers gracefully if the local outbox database cannot be opened during startup
- moves affected outbox files aside before creating a fresh queue
- shows recovery details in the Kairos output channel

## 0.1.1

- added the live Kairos status bar with today tracking time, richer tooltip detail, and quick actions
- added reconnect, status, output, and desktop-open command palette actions
- improved status updates during connection changes

## 0.1.0

- connected VS Code to Kairos Desktop for activity sync
- honored desktop settings for tracking, focus-only mode, event categories, privacy, and exclusions
- added bounded in-memory buffering and retry behavior
- sent activity to the local Kairos Desktop app
- added the first VS Code companion for Kairos activity tracking
