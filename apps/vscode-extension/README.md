# Kairos for VS Code

<p align="center">
  <img src="./media/kairos-logo.png" alt="Kairos Logo" width="128" height="128" />
</p>

Kairos for VS Code tracks your coding time and sends it to Kairos Desktop.

## Features

- Automatic code time tracking while you work
- Works with Kairos Desktop
- Offline-first behavior
- Simple status in the VS Code status bar
- Quick reconnect and refresh commands

## Requirements

- Kairos Desktop installed and running
- VS Code `1.98.0` or newer

## Install

### From VS Code Marketplace

1. Open Extensions in VS Code (`Ctrl+Shift+X` / `Cmd+Shift+X`).
2. Search for `Kairos`.
3. Select **Kairos** and click **Install**.
4. Open Kairos Desktop and keep it running.

### From VSIX (manual)

1. Open the latest release: `https://github.com/theCodeD3vil/kairos/releases/latest`
2. Download `kairos-vscode-<version>.vsix`
3. Install it:

```bash
code --install-extension kairos-vscode-<version>.vsix
```

## Commands

- `Kairos: Refresh Desktop Settings`
- `Kairos: Reconnect to Kairos Desktop`
- `Kairos: Open Kairos Desktop`
- `Kairos: Open Kairos Actions`
- `Kairos: Show Kairos Status`
- `Kairos: Show Kairos Output`

## Troubleshooting

- If status shows disconnected, run `Kairos: Reconnect to Kairos Desktop`.
- If no activity appears, make sure Kairos Desktop is open.
- If needed, check the `Kairos` output channel in VS Code.

## Privacy

- Your coding activity data stays local on your computer.
- No cloud sync in v1.

## Release Notes

See [CHANGELOG.md](/Users/michaelnji/Projects/kairos/apps/vscode-extension/CHANGELOG.md).
