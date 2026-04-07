# Release Dry Run (Whole Product)

## Scope
This document captures the Kairos whole-product release dry run for the current release infrastructure:
- desktop release packaging to GitHub Release artifacts
- VS Code extension `.vsix` packaging
- checksum generation/validation
- desktop update-check service validation
- release workflow/script sanity

Date executed: 2026-04-07
Version under test: `0.1.1` (`v0.1.1`)
Dry-run channel: prerelease

## Dry-run flow
1. Verify version sync (`VERSION`, desktop default version, extension `package.json`).
2. Run desktop frontend release prechecks (`typecheck`, `build`).
3. Run desktop backend release-relevant tests.
4. Build desktop release artifacts and validate output naming/checksums.
5. Run extension release verification (`verify:release`).
6. Build `.vsix`, validate package contents, generate checksums.
7. Run update-check tests (`internal/updates`).
8. Capture pass/fail summary and blockers.

Local command:
```bash
scripts/release/run-dry-run-local.sh
```

CI workflow:
- `.github/workflows/release-dry-run.yml`

## What was validated

### Desktop validation
- desktop frontend production build passes
- desktop backend release-relevant tests pass:
  - `internal/ingestion`
  - `internal/sessionization`
  - `internal/settings`
  - `internal/storage`
  - `internal/views`
  - `internal/updates`
- desktop artifact validation script exists and is wired:
  - `scripts/release/validate-desktop-artifacts.sh`

### Extension validation
- extension release verify path passes:
  - typecheck
  - tests
  - release build
- `.vsix` package builds at:
  - `apps/vscode-extension/dist/kairos-vscode-0.1.1.vsix`
- `.vsix` content validation passes:
  - `scripts/release/validate-extension-vsix.sh`
- `.vsix` checksums generated in:
  - `apps/vscode-extension/dist/SHA256SUMS-vsix.txt`
- local install check passes:
  - `code --install-extension apps/vscode-extension/dist/kairos-vscode-0.1.1.vsix --force`

### Update-check validation
- update service tests pass (`apps/desktop/internal/updates`)
- test coverage includes:
  - semantic version comparison logic
  - stable vs prerelease channel behavior
  - safe fallback behavior on metadata/network failures

## Dry-run hardening changes made
- hardened local dry-run runner to execute all major phases and return step-level summary:
  - `scripts/release/run-dry-run-local.sh`
- fixed extension release gate reliability by removing brittle local tsconfig path overrides and relying on package exports:
  - `apps/vscode-extension/tsconfig.json`
- added/kept release artifact validators in workflows:
  - desktop artifact validation step
  - `.vsix` package validation step
- checklists updated with rollback/backout actions:
  - `docs/release-checklist.md`
  - `docs/desktop-release-checklist.md`
  - `docs/extension-release-checklist.md`

## Artifacts produced in dry run
- extension package:
  - `apps/vscode-extension/dist/kairos-vscode-0.1.1.vsix`
- extension checksums:
  - `apps/vscode-extension/dist/SHA256SUMS-vsix.txt`

Desktop packaging was attempted but blocked in this sandbox environment (see blockers).

## Blockers and limitations

### Current blocker
- Local desktop packaging in this sandbox fails during Wails binding generation because backend initialization attempts to bind `127.0.0.1:0` and socket bind is denied by environment policy.
- Error observed:
  - `listen tcp 127.0.0.1:0: bind: operation not permitted`

Impact:
- Local dry run cannot complete full desktop artifact generation in this restricted environment.

Status:
- Not identified as a product/runtime defect; it is an execution-environment restriction.
- Must be validated on a normal local machine or GitHub Actions runner without local socket restrictions.

### Acceptable v1 limitations (intentional)
- desktop update flow is discovery + user-directed download only (no self-installing binary replacement)
- Marketplace publish may be skipped in dry run when credentials are unavailable; `.vsix` artifact remains mandatory

## Repeat procedure
1. Ensure dependencies are installed: `pnpm install`.
2. Run local dry run: `scripts/release/run-dry-run-local.sh`.
3. If local desktop packaging is restricted by environment, run dry-run workflow:
   - GitHub Actions: `Release Dry Run` workflow.
4. Verify uploaded dry-run artifacts:
   - desktop artifacts + checksums
   - extension `.vsix` + checksums
5. Execute `docs/release-checklist.md` before creating stable release.

## Readiness assessment
Current status: **release-ready pending one final blocker clearance**.

Blocker to clear before stable release:
- run one successful desktop packaging dry run in an unrestricted environment and confirm produced desktop artifacts/checksums.

If cleared, Kairos can proceed with prerelease publication and then stable release using the documented pipeline.
