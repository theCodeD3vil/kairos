# Extension Runtime Integration

## Authority Model

- The desktop app is the canonical settings authority.
- The VS Code extension does not own tracking/privacy/exclusion policy.
- The extension refreshes effective settings from the desktop app through the local loopback handshake endpoint.

## Transport

- Desktop exposes a local-only HTTP server on `127.0.0.1:42137`.
- Extension startup performs `POST /v1/extension/handshake`.
- Event delivery uses `POST /v1/ingestion/events`.
- Both endpoints require `POST`, `application/json`, and bounded request bodies.

## Runtime Flow

The extension event pipeline is:

1. VS Code editor/window signal occurs.
2. Runtime checks desktop-owned effective settings.
3. Desktop exclusions are enforced when `respectDesktopExclusions=true`.
4. Privacy shaping is applied before emission.
5. Event enters the in-memory queue.
6. Runtime attempts delivery to the local desktop backend.
7. Success/failure updates connection state and retry/buffering behavior.

## Applied Settings

The extension now applies:

- `trackingEnabled`
- `trackOnlyWhenFocused`
- `trackFileOpenEvents`
- `trackSaveEvents`
- `trackEditEvents`
- `sendHeartbeatEvents`
- `heartbeatIntervalSeconds`
- `sendProjectMetadata`
- `sendLanguageMetadata`
- `sendMachineAttribution`
  - current v1 behavior strips optional machine metadata fields; required protocol identity still remains
- `filePathMode`
- `respectDesktopExclusions`
- `bufferEventsWhenOffline`
- `retryConnectionAutomatically`

## Exclusions

When desktop exclusions are enabled for extension enforcement, the extension drops matching events before they are queued or sent.

Supported checks:

- project names
- workspace patterns
- folder substrings
- file extensions
- machine identifiers/names

Desktop still remains the durable enforcement layer on ingestion.

## Privacy Shaping

Privacy shaping happens before event emission:

- `filePathMode=hidden` removes file paths
- `filePathMode=masked` sends only the basename
- `sendProjectMetadata=false` redacts `workspaceId` and `projectName`
- `sendLanguageMetadata=false` redacts `language`

## Buffering And Retry

- Unsent events are buffered in memory only.
- Queue size is bounded to `500` events.
- Overflow uses deterministic oldest-drop behavior.
- Delivery batch size is capped at `100` events.
- Retry uses bounded backoff from `1s` up to `15s`.

## Connection States

The extension runtime uses these states:

- `disconnected`
- `connecting`
- `connected`
- `retrying`
- `offline-buffering`

These states drive output/status-bar updates inside the extension.

## Deferred

- durable extension-side queue persistence
- push-based desktop-to-extension settings updates
- multi-editor support
- richer desktop UI for reconnect/queue diagnostics
- additional privacy/display policy propagation beyond current payload shaping
