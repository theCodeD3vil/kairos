# Kairos Desktop

Kairos Desktop is the main app for tracking your coding time.

## Overview

- Tracks coding time automatically.
- Works offline.
- Shows your activity in simple daily and weekly views.
- Connects with the Kairos VS Code extension.

## Install

### macOS

```bash
brew tap theCodeD3vil/kairos https://github.com/theCodeD3vil/kairos
brew install --cask kairos
```

### Linux

1. Open the latest release: `https://github.com/theCodeD3vil/kairos/releases/latest`
2. Download the `.deb` file
3. Install it:

```bash
sudo dpkg -i kairos-linux-v<version>.deb
sudo apt-get install -f
```

## Use

1. Open Kairos Desktop.
2. Install the Kairos VS Code extension.
3. Keep desktop running while you code.
4. Review your activity in Kairos.

## Privacy

- Your data stays on your computer.
- No cloud sync in v1.

## Troubleshooting

- If VS Code looks disconnected, open the extension command palette and reconnect.
- If macOS blocks first launch, open `System Settings > Privacy & Security` and click `Open Anyway`.

## Current Limitations

- No cloud sync yet
- No export reports yet
- No multi-user profiles yet

## For Contributors

### Run

From repo root:

```bash
make desktop-dev
```

Or from this folder:

```bash
wails dev
```

### Build

From repo root:

```bash
make desktop-release-check
make desktop-release-build
make desktop-release-artifacts KAIROS_VERSION=$(cat VERSION)
```
