# Kairos VS Code Extension

Kairos for VS Code sends local editor activity to the Kairos desktop app so the desktop backend can persist raw events, derive sessions, and assemble local productivity views.

## What It Does

- connects to the Kairos desktop app over a local loopback endpoint
- fetches effective desktop-owned settings on startup and reconnect
- emits editor activity events for open, save, edit, focus, blur, and heartbeat activity
- enforces desktop-owned privacy settings before sending
- enforces desktop-owned exclusions before sending
- buffers events in memory when the desktop app is temporarily unavailable, if enabled by desktop settings

## Status Bar

The extension adds a Kairos status bar item inside VS Code.

- The primary label shows a compact Kairos runtime state or your live tracked time for today.
- The hover tooltip shows the current state, today total, queue/buffering detail, last handshake, last successful send, last event, machine name, extension version, file path mode, and heartbeat interval.
- Clicking the status bar item opens a Kairos action picker.

The live today total is an extension-local runtime estimate for immediate visibility. The desktop app remains the canonical persisted source of truth.

## Desktop Dependency

The extension expects the Kairos desktop app to be running locally.

- If the desktop app is running, the extension handshakes, fetches effective settings, and starts sending activity.
- If the desktop app is not running, the extension stays safe and does not crash VS Code.
- When retry and buffering are enabled by desktop settings, the extension retries and flushes queued events after the desktop app becomes available again.

## Privacy Expectations

The desktop app is the canonical settings authority.

The extension applies the current effective desktop settings for:

- tracking enabled/disabled
- focus-only tracking
- file open/save/edit gating
- heartbeat interval
- file path privacy mode
- project/language metadata toggles
- machine-attribution shaping
- exclusions
- buffering and retry behavior

## Commands

- `Kairos: Refresh Desktop Settings`
- `Kairos: Reconnect to Kairos Desktop`
- `Kairos: Open Kairos Desktop`
- `Kairos: Open Kairos Actions`
- `Kairos: Show Kairos Status`
- `Kairos: Show Kairos Output`

## Local Development

From the repo root:

```bash
pnpm --filter @kairos/shared build
pnpm --filter kairos-vscode typecheck
pnpm --filter kairos-vscode test
pnpm --filter kairos-vscode build:dev
```

To run the extension in an Extension Development Host, use the VS Code extension development workflow from `apps/vscode-extension`.

## Package A VSIX

From the repo root:

```bash
pnpm install
pnpm --filter kairos-vscode package:vsix
```

The packaged file is written to:

- `apps/vscode-extension/dist/kairos-vscode-<version>.vsix`

To install locally:

```bash
code --install-extension apps/vscode-extension/dist/kairos-vscode-<version>.vsix
```

## Troubleshooting

If the extension does not connect:

- confirm the Kairos desktop app is running
- confirm the desktop local extension bridge is listening on `127.0.0.1:42137`
- run `Kairos: Refresh Desktop Settings`
- run `Kairos: Reconnect to Kairos Desktop`
- open the `Kairos` output channel inside VS Code for runtime details

If the status bar shows `Disconnected` or `Buffering`:

- confirm the desktop app is open
- click the Kairos status bar item and choose `Reconnect to Kairos Desktop`
- if `Open Kairos Desktop` cannot launch the app automatically on your machine, open the desktop app manually and refresh settings

If tracking appears suppressed:

- check desktop tracking settings
- check privacy settings
- check exclusions
- check focus-only tracking behavior

## Release Notes

See [CHANGELOG.md](/Users/michaelnji/Projects/kairos/apps/vscode-extension/CHANGELOG.md).

## Publisher Note

The manifest currently uses a documented placeholder publisher: `kairos-dev`.

Replace that publisher value before any public Marketplace release.
