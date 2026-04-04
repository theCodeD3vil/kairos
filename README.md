# Kairos

Kairos is a monorepo scaffold for a desktop productivity platform and companion developer tooling.

This repository is currently in setup/scaffold phase.

No tracking, ingestion, storage, or analytics features are implemented yet.

## Workspace Layout

- `apps/desktop`: Go + Wails-oriented desktop scaffold
- `apps/desktop/frontend`: React + TypeScript + Vite + Tailwind placeholder UI
- `apps/vscode-extension`: TypeScript VS Code extension scaffold
- `packages/shared`: shared TypeScript types package (`@kairos/shared`)
- `docs`: project documentation

## Prerequisites

- Node.js
- pnpm
- Go
- Optional: Wails CLI (`wails`) for running the desktop host workflow

## Install

```bash
pnpm install
```

## New Machine Setup

Use one command based on your machine:

- macOS: `./scripts/setup-macos.sh`
- Ubuntu: `./scripts/setup-ubuntu.sh`
- If Go + Node are already installed: `./scripts/bootstrap.sh` (or `make setup`)

What these scripts do:

- `setup-macos.sh` / `setup-ubuntu.sh`: machine provisioning (install/verify Go, Node, pnpm path, Wails), then run repo bootstrap.
- `bootstrap.sh`: repo bootstrap only (checks Go + Node, enables pnpm via Corepack when available, installs Wails if missing, then runs `pnpm install`).

Notes:

- `bootstrap.sh` does not install Go or Node by itself.
- Wails install command used: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- pnpm may be enabled via Corepack (`corepack enable pnpm`), which is an official pnpm path.

## Scaffold Commands

Run desktop frontend placeholder:

```bash
pnpm dev:desktop
```

Build all workspace packages:

```bash
pnpm build
```

Typecheck all workspace packages:

```bash
pnpm typecheck
```

Build VS Code extension bundle:

```bash
pnpm --filter kairos-vscode build
```

## Developer Automation

Use the root `Makefile` for common scaffold workflows:

- `make doctor` - verify required tools and report optional Wails status
- `make install` - install workspace dependencies
- `make typecheck` - run workspace type checks
- `make build` - build shared package, desktop frontend, extension, and Go desktop scaffold
- `make desktop-frontend` - start the desktop frontend dev server
- `make desktop-dev` - run `wails dev` from `apps/desktop` (with a friendly message if Wails is missing)
- `make dev` - start the scaffold dev environment in background (`wails dev` when available)
- `make dev-down` - stop background dev processes started by `make dev`

## Desktop Host (Wails) Notes

If Wails CLI is installed, run from `apps/desktop`:

```bash
wails dev
```

If Wails CLI is not installed, install it later and keep using the frontend scaffold for now.

## Intentionally Not Implemented Yet

- Tracking/session capture
- Ingestion endpoints
- Storage logic and persistence
- Analytics logic
- Dashboard data flow
- Real extension telemetry/network behavior
