# Kairos VS Code Extension

Kairos for VS Code sends local editor activity to the Kairos desktop app so the desktop backend can persist raw events, derive sessions, and assemble local productivity views.

## What It Does

- connects to the Kairos desktop app over a local loopback endpoint
- fetches effective desktop-owned settings on startup and reconnect
- emits editor activity events for open, save, edit, focus, blur, and heartbeat activity
- enforces desktop-owned privacy settings before sending
- enforces desktop-owned exclusions before sending
- buffers events in memory when the desktop app is temporarily unavailable, if enabled by desktop settings

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
- open the `Kairos` output channel inside VS Code for runtime details

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
