# Settings System

## Persistence Model

- Settings are stored in SQLite in `settings_sections`.
- Each persisted section is keyed by section name and stored as a JSON payload.
- Persisted sections:
  - `general`
  - `privacy`
  - `tracking`
  - `exclusions`
  - `extension`
  - `appBehavior`

## Defaults

- Defaults live in the desktop backend settings package.
- Effective settings are computed as:
  - code defaults
  - overridden by valid persisted sections
  - combined with derived runtime sections such as extension status, system info, storage info, and about info
- Invalid or unreadable persisted sections fall back to defaults and are logged.

## Authority Model

- The desktop app is the canonical settings authority.
- The frontend reads and updates settings through desktop backend surfaces.
- The backend exposes `GetExtensionEffectiveSettings()` as the filtered extension-facing payload.

## Runtime Application

- `tracking.trackingEnabled`
  - disables raw event persistence while still allowing extension heartbeat/status metadata updates
- `tracking.idleTimeoutMinutes`
  - drives session split behavior during rebuilds
- `tracking.sessionMergeThresholdMinutes`
  - drives session merge behavior during rebuilds
- `privacy.filePathMode`
  - `hidden` removes file paths before persistence
  - `masked` stores only the basename
- `exclusions`
  - currently applied in the ingestion path for project names, machines, folders, file extensions, and workspace patterns
- `extension.trackFileOpenEvents`, `trackSaveEvents`, `trackEditEvents`
  - currently enforced in the ingestion path if the extension still sends those events

## Extension Synchronization

- The desktop backend now exposes an extension-effective settings payload derived from:
  - tracking settings
  - privacy settings
  - exclusions
  - extension settings
- This is intended to become the extension’s desktop-owned configuration source.
- The extension-side transport hookup is still minimal because the extension runtime in this repo is still scaffold-level.

## Deferred

- Full extension-side transport consumption of desktop-owned settings
- UI enforcement of privacy display flags such as hiding machine names in every assembled page
- Persisted edit history or settings audit trail
- Data export/import and reset-all destructive storage actions
