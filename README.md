# Kairos

Kairos is a local-first coding activity tracker with a desktop app and a VS Code extension.

## Overview

- Tracks coding activity from VS Code in real time.
- Stores data locally in SQLite.
- Builds sessions and analytics from raw activity events.
- Shows Overview, Sessions, Analytics, Calendar, and Settings in the desktop app.
- Keeps settings desktop-owned and synced to the extension.

## Install

### Linux

Kairos Linux builds are published on GitHub Releases as `.deb` packages.
Current Linux install validation is on Debian/Ubuntu-based distributions.

1. Open the latest release: `https://github.com/theCodeD3vil/kairos/releases/latest`
2. Download the Linux `.deb` desktop artifact.
3. Install the package:

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

### macOS Security Prompt (Gatekeeper)

Kairos is open source and publicly auditable. Apple may still block first launch because current releases are not signed and notarized with an Apple Developer certificate yet.

When macOS says the app cannot be opened:

1. Try opening Kairos once from Finder (this registers the blocked launch).
2. Open `System Settings > Privacy & Security`.
3. In the Security section, find the message about Kairos and click `Open Anyway`.
4. Confirm by clicking `Open` in the final dialog.

Alternative terminal method:

```bash
xattr -dr com.apple.quarantine /Applications/Kairos.app
open /Applications/Kairos.app
```

Why this appears:

- The warning is triggered by missing notarization/signing identity.
- It is not, by itself, proof that the app is malware.

### Troubleshooting on Update (macOS)

After installing a new Kairos version, macOS may show the same warning again because each release is a new unsigned app build.

If that happens:

1. Launch once to trigger the block message.
2. Use `System Settings > Privacy & Security > Open Anyway` again.
3. If needed, re-run:

```bash
xattr -dr com.apple.quarantine /Applications/Kairos.app
open /Applications/Kairos.app
```

### VS Code Extension

Install from VSIX:

```bash
pnpm install
pnpm --filter kairos-vscode package:vsix
code --install-extension apps/vscode-extension/dist/kairos-vscode-<version>.vsix
```

## Privacy

- Local-first by default.
- No cloud sync in v1.
- Data is stored in your local desktop database.

## Limitations

- No cloud sync
- No multi-user or profile support
- No reports/export flows
- No dedicated projects page
- No advanced summary tables beyond sessions and page assembly

## Documentation

- Desktop runtime details: [`apps/desktop/README.md`](apps/desktop/README.md)
- Settings system: [`docs/settings-system.md`](docs/settings-system.md)
- Release checklist: [`docs/desktop-release-checklist.md`](docs/desktop-release-checklist.md)

## Developer Contributions

### Workspace Layout

- `apps/desktop`: Go + Wails desktop host, backend services, SQLite storage, and packaged frontend
- `apps/desktop/frontend`: React + TypeScript desktop UI
- `apps/vscode-extension`: VS Code extension runtime and packaging surface
- `packages/shared`: canonical shared TypeScript contracts published as `@kairos/shared`
- `docs`: technical notes, hardening docs, and release checklists

### Prerequisites

- Node.js
- pnpm
- Go
- Wails CLI for desktop dev or packaged desktop builds

Install Wails when needed:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### Setup

```bash
pnpm install
cd apps/desktop && go mod tidy
```

### Development

Run the desktop frontend only:

```bash
pnpm dev:desktop
```

Run the full desktop host in Wails dev mode:

```bash
make desktop-dev
```

Useful checks:

```bash
make doctor
make typecheck
make desktop-release-check
```

### Build

Build the shared package, desktop frontend, extension, and Go desktop host:

```bash
make build
```

Build a packaged desktop app:

```bash
make desktop-release-build
make desktop-release-artifacts KAIROS_VERSION=$(cat VERSION)
```

Build and package the VS Code extension:

```bash
pnpm --filter kairos-vscode verify:release
pnpm --filter kairos-vscode package:vsix
```

### Release

- Product version marker: [`VERSION`](VERSION)
- Release strategy: [`docs/release-strategy.md`](docs/release-strategy.md)
- Release pipelines: [`docs/release-pipeline.md`](docs/release-pipeline.md)
- Desktop update model: [`docs/desktop-updates.md`](docs/desktop-updates.md)

### Architecture

1. The VS Code extension fetches effective desktop-owned settings from the local desktop server.
2. The extension emits raw activity events to the desktop app over loopback transport.
3. The desktop app validates and persists raw events, machines, and extension status in SQLite.
4. Session rebuilds derive first-class coding sessions from persisted raw events.
5. View assembly services build Overview, Sessions, Analytics, Calendar, and Settings payloads from persisted state.
6. The desktop frontend consumes those page-ready payloads through Wails bindings.

### Environment

- Default desktop database path: user config directory under `Kairos/kairos.sqlite3`
- Override for development/tests: `KAIROS_DATABASE_PATH`
- Local extension server host override: `KAIROS_LOCAL_SERVER_HOST`
- Local extension server port override: `KAIROS_LOCAL_SERVER_PORT`
