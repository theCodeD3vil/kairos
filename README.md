# Kairos

Kairos is a local-first coding activity tracker made of a Wails desktop app, a VS Code extension, and a shared contract package.

The current v1 scope is implemented around:

- raw activity ingestion from the VS Code extension
- SQLite persistence for events, machines, extension status, settings, and sessions
- deterministic sessionization from persisted raw events
- backend-backed page assembly for Overview, Sessions, Analytics, Calendar, and Settings
- desktop-owned settings authority with extension settings synchronization
- local-only extension transport over a loopback desktop server

## Workspace Layout

- `apps/desktop`: Go + Wails desktop host, backend services, SQLite storage, and packaged frontend
- `apps/desktop/frontend`: React + TypeScript desktop UI
- `apps/vscode-extension`: VS Code extension runtime and packaging surface
- `packages/shared`: canonical shared TypeScript contracts published as `@kairos/shared`
- `docs`: technical notes, hardening docs, and release checklists

## Prerequisites

- Node.js
- pnpm
- Go
- Wails CLI for desktop dev or packaged desktop builds

Install Wails when needed:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

## Install

```bash
pnpm install
cd apps/desktop && go mod tidy
```

## Development

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

## Build

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

Version/release foundations:

- product version marker: [`VERSION`](VERSION)
- release strategy: [`docs/release-strategy.md`](docs/release-strategy.md)
- release pipelines: [`docs/release-pipeline.md`](docs/release-pipeline.md)
- desktop update model: [`docs/desktop-updates.md`](docs/desktop-updates.md)

## Data Flow

1. The VS Code extension fetches effective desktop-owned settings from the local desktop server.
2. The extension emits raw activity events to the desktop app over loopback transport.
3. The desktop app validates and persists raw events, machines, and extension status in SQLite.
4. Session rebuilds derive first-class coding sessions from persisted raw events.
5. View assembly services build Overview, Sessions, Analytics, Calendar, and Settings payloads from persisted state.
6. The desktop frontend consumes those page-ready payloads through Wails bindings.

## Storage

- Default desktop database path: user config directory under `Kairos/kairos.sqlite3`
- Override for development/tests: `KAIROS_DATABASE_PATH`
- Local extension server host override: `KAIROS_LOCAL_SERVER_HOST`
- Local extension server port override: `KAIROS_LOCAL_SERVER_PORT`

## V1 Limitations

- no cloud sync
- no multi-user or profile support
- no reports/export flows
- no dedicated projects page
- no advanced summary tables beyond sessions and page assembly

See [`apps/desktop/README.md`](apps/desktop/README.md), [`docs/settings-system.md`](docs/settings-system.md), and [`docs/desktop-release-checklist.md`](docs/desktop-release-checklist.md) for release and runtime details.
