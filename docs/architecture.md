# Kairos Architecture (Scaffold Phase)

This document describes the initial scaffold-only repository structure.

## Why Go + React + Wails

- Go provides a performant native backend foundation for desktop capabilities.
- React gives a fast iteration frontend experience.
- Wails bridges Go and web UI with a desktop app runtime.

At this phase, only structural placeholders are present.

## Why a Shared Package Exists

`@kairos/shared` centralizes basic common TypeScript types so both desktop frontend and extension can evolve against consistent contracts.

## Why the VS Code Extension Is Separate

The extension has a different runtime and packaging model than the desktop app, so it is isolated in `apps/vscode-extension` while still participating in workspace tooling.

## Current Phase

This repository is scaffold-only:

- folders, manifests, TypeScript configs, and starter files exist
- no product behavior or domain logic is implemented yet
