# Kairos

Kairos is an offline-first code time tracker with a desktop app and a VS Code extension.

## Overview

- Tracks your coding time automatically.
- Works offline.
- Helps you understand where your coding time goes.
- Shows daily and weekly activity in a simple desktop dashboard.

## Install

### Linux

Kairos Linux builds are published on GitHub Releases as `.deb` packages (Debian/Ubuntu-based distributions).

1. Open the latest release: `https://github.com/theCodeD3vil/kairos/releases/latest`
2. Download the Linux `.deb` file.
3. Install it:

```bash
sudo dpkg -i kairos-linux-v<version>.deb
sudo apt-get install -f
```

### macOS

```bash
brew tap theCodeD3vil/kairos https://github.com/theCodeD3vil/kairos
brew install --cask kairos
```

Upgrade:

```bash
brew update
brew upgrade --cask kairos
```

### VS Code Extension

1. Open the latest release: `https://github.com/theCodeD3vil/kairos/releases/latest`
2. Download `kairos-vscode-<version>.vsix`
3. Install it:

```bash
code --install-extension kairos-vscode-<version>.vsix
```

### macOS Security Prompt

Because Kairos is not yet notarized, macOS may block first launch.

If that happens:

1. Open Kairos once from Finder.
2. Go to `System Settings > Privacy & Security`.
3. Click `Open Anyway` for Kairos.

If needed, run:

```bash
xattr -dr com.apple.quarantine /Applications/Kairos.app
open /Applications/Kairos.app
```

## Privacy

- Your data stays on your computer.
- No cloud sync in v1.

## Current Limitations

- No cloud sync yet
- No multi-user profiles
- No export reports yet

## Documentation

- Desktop app docs: [`apps/desktop/README.md`](apps/desktop/README.md)
- VS Code extension docs: [`apps/vscode-extension/README.md`](apps/vscode-extension/README.md)
- Desktop release checklist: [`docs/desktop-release-checklist.md`](docs/desktop-release-checklist.md)
- Extension release checklist: [`docs/extension-release-checklist.md`](docs/extension-release-checklist.md)

## Contributing

### Setup

```bash
pnpm install
cd apps/desktop && go mod tidy
```

### Run

Desktop frontend only:

```bash
pnpm dev:desktop
```

Full desktop app:

```bash
make desktop-dev
```

### Build

```bash
make build
```

Packaged desktop app:

```bash
make desktop-release-build
make desktop-release-artifacts KAIROS_VERSION=$(cat VERSION)
```

VS Code extension package:

```bash
pnpm --filter kairos-vscode verify:release
pnpm --filter kairos-vscode package:vsix
```

### Useful Links

- Version file: [`VERSION`](VERSION)
- Release strategy: [`docs/release-strategy.md`](docs/release-strategy.md)
- Release pipeline docs: [`docs/release-pipeline.md`](docs/release-pipeline.md)
