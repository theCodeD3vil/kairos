# Fresh Integration Plan

## Summary

Build a real local-only Kairos integration for Fresh, the terminal IDE. Fresh has the editor hooks Kairos needs for passive activity tracking: TypeScript plugins, startup loading, editor events, active buffer/path APIs, process spawning, and status messages.

The integration should explicitly show Fresh in Kairos Desktop UI/status pages, not hide it behind the existing VS Code extension status.

## Implementation Status

Started on 2026-06-01.

- Done: shared TypeScript contracts accept `editor: "fresh"` while preserving VS Code.
- Done: Kairos Desktop accepts Fresh handshakes and ingest payloads through the existing protocol v2 WebSocket envelope.
- Done: extension status persistence can list per-editor rows and seeds VS Code/Fresh placeholders.
- Done: WebSocket disconnect handling is editor-aware, so Fresh disconnects do not mark VS Code offline.
- Done: Desktop Settings and overview status surfaces show Fresh explicitly alongside VS Code.
- Done: targeted checks passed for desktop Go packages, shared TypeScript contracts, VS Code extension typecheck, and desktop frontend typecheck.
- Done: `kairos-fresh-bridge` Go helper skeleton implemented (`apps/desktop/cmd/kairos-fresh-bridge/`). Handles discovery, WS connect+handshake, stdin JSON-line commands (record/status/reconnect/shutdown), offline JSONL queue, and reconnect with exponential backoff.
- Done: Fresh TypeScript plugin package created (`apps/fresh-extension/`). Registers commands, subscribes to buffer_modified/buffer_save/cursor_moved events, dwell-tracks file opens, emits heartbeats, spawns bridge helper via Fresh process API.
- Done: Go helper unit tests added (12 tests: discovery ordering, loopback validation, queue drain/enqueue/re-enqueue, identity create/load). All 191 Go tests pass.
- Done: `make typecheck` passes across all 5 workspace packages including `kairos-fresh`.
- Done: frontend unit tests for `adaptEditorIntegrationStatuses` and `editorDisplayName` (9 cases). All 89 frontend tests pass.
- Done: full Go suite 191 tests pass; full `make typecheck` green.

Sources:

- Fresh plugin development: https://getfresh.dev/docs/plugins/development/
- Fresh events and hooks: https://getfresh.dev/docs/plugins/api/events
- Fresh buffer API: https://getfresh.dev/docs/plugins/api/buffer
- Fresh status/logging API: https://getfresh.dev/docs/plugins/api/status-logging

## Architecture

Use a Fresh TypeScript plugin plus a Go helper process.

- Fresh plugin: thin event collector running in Fresh's sandboxed QuickJS environment.
- Go helper: long-running local bridge responsible for desktop discovery, WebSocket protocol, retries, identity, and offline queue.
- Kairos Desktop: accept `extension.editor = "fresh"` over the existing local bridge protocol.
- Scope: local host editing only for v1. No SSH, devcontainer, or remote authority support.

Go helper is preferred over Node because it avoids a Node runtime dependency for terminal users, matches Kairos desktop/backend tooling, can ship as a single cross-platform binary, and is a better fit for offline queue and connection management.

## Implementation Slices

### 1. Multi-editor desktop contracts

- Add a shared editor kind for `vscode` and `fresh`.
- Keep Go contracts string-based for compatibility, but add tests proving `fresh` is accepted.
- Keep protocol v2 and the existing WebSocket envelope unchanged.
- Ensure extension status persistence works per editor row in `extension_status`.
- Change WebSocket connection tracking so disconnect handling marks the editor that handshook, not always `vscode`.

### 2. Kairos Desktop UI/status support

- Keep existing `extensionStatus` as VS Code compatibility if needed, but add an explicit multi-editor status surface such as `extensionStatuses: ExtensionStatus[]`.
- Add backend methods for editor-aware status, preferably `ListExtensionStatuses()` and optionally `GetExtensionStatusForEditor(editor)`.
- Update Settings from "VS Code Extension" to "Editor Integrations".
- Show separate VS Code and Fresh status panels with installed, connected, version, last sync, last event, queue metrics, and bridge reachability where applicable.
- Rename overview/status labels from "VS Code Sync Health" to "Editor Sync Health".
- Use editor display names consistently: `VS Code` and `Fresh`.
- Do not add descriptive subtitle text under headers; repo UI rule says headers must be title-only.

### 3. Fresh helper skeleton

- Add a Go helper under a dedicated command, e.g. `apps/desktop/cmd/kairos-fresh-bridge`.
- Responsibilities:
  - Discover Kairos Desktop using the same bridge discovery file and port range strategy as the VS Code extension.
  - Connect to `/v1/extension/ws` with `kairos.v2`.
  - Handshake with `extension.editor = "fresh"`.
  - Maintain machine ID and installation ID.
  - Accept simple local commands from the Fresh plugin, such as `record`, `status`, `reconnect`, and `shutdown`.
  - Queue events locally when Kairos Desktop is unavailable.
  - Replay queued events with retry/backoff and per-event result handling.
- Prefer a small local state file/database under the user's Kairos config/data directory rather than putting durable state in the Fresh plugin sandbox.

### 4. Fresh TypeScript plugin

- Add a Fresh plugin package under `apps/fresh-extension`.
- Register command palette commands:
  - `kairos_refresh_status`
  - `kairos_reconnect`
  - `kairos_show_status`
- Subscribe to Fresh editor events:
  - `buffer_modified` for edit activity.
  - `buffer_save` for save activity.
  - `cursor_moved` or active buffer polling for active-file changes.
- Use `editor.getActiveBufferId()` and `editor.getBufferPath(bufferId)` to derive active file context.
- Use `editor.getCwd()` for local workspace/project fallback.
- Use `editor.pathExtname(path)` or a small mapping helper for language metadata if Fresh does not expose language id directly.
- Use `editor.setStatus(...)` for short user-visible status updates.
- Spawn the Go helper via Fresh process APIs. If long-running background process I/O is insufficient for event streaming, fall back to invoking the helper as short-lived commands per event.

### 5. Tracking semantics

- Match the VS Code extension behavior where feasible:
  - Ignore unsaved/virtual buffers without a file path.
  - Require a short file dwell period before counting a file as actively tracked.
  - Emit edit/save/open or heartbeat-style events without recording content.
  - Respect desktop-owned privacy and tracking settings after handshake.
  - Buffer offline events when enabled by desktop settings.
- For v1, do not attempt terminal command tracking, remote Fresh sessions, or devcontainer attribution.

## Test Plan

- Go desktop tests:
  - `fresh` handshakes successfully and persists a separate extension status row.
  - Fresh disconnect does not mark VS Code disconnected.
  - Fresh ingest payloads are accepted by the existing ingestion path.
  - Existing VS Code status and bridge tests still pass.
- Shared TypeScript tests/typechecks:
  - `fresh` is accepted by shared editor types.
  - Existing VS Code extension code still typechecks.
- Frontend tests:
  - Settings data adaptation includes both VS Code and Fresh status.
  - Settings page renders distinct Fresh and VS Code integration panels.
  - Overview/status labels use editor-neutral copy.
- Helper tests:
  - Desktop discovery candidate ordering.
  - WebSocket handshake payload shape.
  - Offline queue enqueue/replay behavior.
  - Retry/backoff after desktop unavailable.
- Fresh plugin tests, if practical:
  - Event payload shaping from Fresh event data.
  - Active buffer/path resolution.
  - Helper command invocation.

## Acceptance Criteria

- Fresh appears explicitly in Kairos Desktop settings/status UI.
- Fresh activity can be recorded locally into Kairos Desktop with `extension.editor = "fresh"`.
- VS Code behavior remains unchanged.
- Desktop privacy/tracking settings apply to Fresh events.
- Fresh integration works locally without Node.
- If Kairos Desktop is unavailable, Fresh activity is buffered and later replayed by the helper.

## Open Risks

- Fresh plugin APIs may not provide a stable long-running process communication channel. If so, use short-lived helper invocations for v1.
- Fresh may not expose language id directly. If unavailable, infer language from file extension.
- Fresh may not expose true editor focus/window focus. If unavailable, v1 should track based on edit/save/cursor activity only and avoid claiming focus-aware tracking.
- Packaging/distribution for Fresh plugins may require a separate marketplace/repo workflow later.

## Out of Scope For V1

- Fresh SSH remote editing.
- Fresh devcontainer sessions.
- Terminal command tracking.
- Marketplace publishing.
- Cloud sync.
- Redesigning the settings UI beyond editor integration/status changes.

## Suggested Commit

`✨ feat(fresh): add Kairos Fresh status probe`
