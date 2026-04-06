# Kairos Desktop

Kairos Desktop is the local host for v1. It owns the SQLite database, settings authority, session rebuilds, page-data assembly, and the loopback server used by the VS Code extension.

## Run In Development

From the repo root:

```bash
make desktop-dev
```

Or from this directory:

```bash
wails dev
```

The desktop frontend dev server runs through Vite and the Go backend runs through Wails.

## Backend Initialization

Startup order is:

1. open SQLite
2. run migrations
3. initialize settings service
4. initialize ingestion, sessionization, and view services
5. start the local extension server
6. start Wails

If SQLite or migrations fail, startup fails fast before the frontend binds to the backend.

## Local Storage

Default database path:

- macOS/Linux/Windows config directory under `Kairos/kairos.sqlite3`

Development/test overrides:

- `KAIROS_DATABASE_PATH`
- `KAIROS_LOCAL_SERVER_HOST`
- `KAIROS_LOCAL_SERVER_PORT`

The local extension server binds to `127.0.0.1` by default.

## Data Flow

1. The VS Code extension handshakes with the local desktop server.
2. The desktop app returns effective extension settings owned by the desktop settings service.
3. The extension sends raw activity batches.
4. The desktop backend validates and persists raw events, machines, and extension status.
5. Session rebuilds derive persisted sessions from raw events.
6. View services assemble real page payloads for the desktop frontend.

## Build

Repo root:

```bash
make desktop-release-check
make desktop-release-build
```

`make desktop-release-build` isolates packaging from live local state by overriding:

- `KAIROS_DATABASE_PATH` to a build-local SQLite file
- `KAIROS_LOCAL_SERVER_PORT=0` to avoid loopback port collisions during `wails build`

Direct Wails build:

```bash
wails build
```

## V1 Implemented

- Overview, Sessions, Analytics, Calendar, and Settings pages backed by real backend data
- persisted settings with desktop-owned defaults
- extension status, machine tracking, and ingestion stats
- deterministic session rebuilds from persisted raw events

## V1 Deferred

- cloud sync
- reports/export flows
- destructive storage actions from the Settings page
- dedicated projects page
- advanced caching/materialized summaries
