# Kairos for VS Code

<p align="center">
  <img src="./media/kairos-logo.png" alt="Kairos Logo" width="128" height="128" />
</p>

Kairos connects VS Code to the Kairos desktop app and sends local coding activity over localhost so the desktop app can build sessions, analytics, and calendar views.

## Features

- Local desktop bridge over `127.0.0.1:42137`
- Desktop-owned settings sync (privacy, exclusions, tracking behavior)
- Activity capture for open, save, edit, focus, blur, and heartbeat
- Safe buffering and retry when desktop is temporarily unavailable
- Status bar runtime indicator with quick action menu
- Desktop reconnect and settings refresh commands

## Requirements

- Kairos desktop app installed and running
- VS Code `1.98.0` or newer

## Install

### From VS Code Marketplace

1. Open Extensions in VS Code (`Ctrl+Shift+X` / `Cmd+Shift+X`).
2. Search for `Kairos`.
3. Select **Kairos** and click **Install**.
4. Launch Kairos desktop and keep it running.

### From VSIX (manual)

```bash
pnpm install
pnpm --filter kairos-vscode package:vsix
code --install-extension apps/vscode-extension/dist/kairos-vscode-<version>.vsix
```

## Commands

- `Kairos: Refresh Desktop Settings`
- `Kairos: Reconnect to Kairos Desktop`
- `Kairos: Open Kairos Desktop`
- `Kairos: Open Kairos Actions`
- `Kairos: Show Kairos Status`
- `Kairos: Show Kairos Output`

## Troubleshooting

- If status shows disconnected, open command palette and run `Kairos: Reconnect to Kairos Desktop`.
- If no activity appears, confirm desktop tracking/privacy/exclusion settings allow capture.
- Check the `Kairos` output channel in VS Code for bridge and event details.

## Release Notes

See [CHANGELOG.md](/Users/michaelnji/Projects/kairos/apps/vscode-extension/CHANGELOG.md).
