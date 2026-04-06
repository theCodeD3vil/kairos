# Desktop Release Checklist

## Build

- Run `make doctor`
- Run `make desktop-release-check`
- Run `make desktop-release-build`
- Confirm the packaged desktop build completes without frontend or backend errors

## Fresh Startup

- Launch the desktop app with no existing database
- Confirm SQLite is created and migrations run successfully
- Confirm the app reaches the Overview page without crashing
- Confirm Settings loads real system, storage, and about data

## Restart With Existing Data

- Launch the desktop app after a database already exists
- Confirm startup succeeds without rerunning old migrations incorrectly
- Confirm existing settings, events, and sessions are still visible

## Extension Disconnected

- Start the desktop app without the VS Code extension connected
- Confirm Overview, Sessions, Analytics, Calendar, and Settings still render coherent empty or historical state
- Confirm extension status shows disconnected rather than failing page loads

## Extension Connected

- Start the desktop app and VS Code extension together
- Confirm the extension fetches effective desktop settings
- Confirm extension status updates in Settings
- Confirm new activity appears after ingestion and session rebuilds

## Settings

- Update General settings and restart the app to confirm persistence
- Update Privacy settings and confirm file path/privacy behavior remains coherent
- Update Tracking settings and confirm disabled tracking stops new ingestion
- Update Exclusions and confirm matching activity is filtered
- Update VS Code extension settings and confirm the extension sees refreshed effective settings
- Reset one section and confirm it returns to defaults
- Use Reset All and confirm all persisted settings return to defaults

## Pages

- Overview shows real totals, recent sessions, top projects, top languages, and sync status
- Sessions shows real range-backed data and an empty state when no sessions exist
- Analytics shows real summaries and filter-backed breakdowns
- Calendar month navigation uses real backend data
- Calendar selected day shows real sessions, project breakdown, and machine breakdown

## No-Data State

- Validate a clean database with no ingested data
- Confirm Overview, Sessions, Analytics, and Calendar return zero/empty payloads instead of crashing

## Upgrade / Regression

- Run the app against an already-populated database from a previous local build
- Confirm migrations advance safely
- Confirm existing session and settings data remain readable

## Packaging

- Verify the packaged app starts outside `wails dev`
- Confirm the loopback extension server binds to `127.0.0.1`
- Confirm shutdown closes the local server and SQLite cleanly

## Release Notes

- Verify desktop version metadata is correct
- Verify root and desktop README content matches the shipped behavior
- Verify deferred actions in Settings are still explicitly marked as not implemented
