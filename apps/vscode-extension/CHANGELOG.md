# Changelog

## 1.2.1

- recovered gracefully from a corrupted local outbox database during activation
- preserved corrupt outbox files for diagnosis while recreating a fresh outbox
- added regression coverage for corrupted outbox startup recovery

## 0.1.1

- added the live Kairos status bar with today tracking time, richer tooltip detail, and quick actions
- added reconnect, status, output, and desktop-open command palette actions
- improved release validation coverage for status presentation and runtime transitions

## 0.1.0

- added real desktop handshake and settings synchronization
- added runtime gating for tracking, focus-only mode, event categories, privacy, and exclusions
- added bounded in-memory buffering and retry behavior
- added local loopback transport integration with the Kairos desktop app
- hardened build, package, and release-readiness workflow for local VSIX distribution
