# Kairos Release Strategy (v1)

## Scope
Kairos ships as:
- desktop app (`apps/desktop`, Wails)
- VS Code extension (`apps/vscode-extension`)

This phase establishes build/package/release/update-check foundations only.

## Versioning

### Semantic versioning
Kairos uses semantic versioning: `MAJOR.MINOR.PATCH`.

### Version ownership
- Root marker: [`VERSION`](../VERSION) (product release intent)
- Desktop build version source: `apps/desktop/internal/buildinfo/buildinfo.go` (overridden in CI via `-ldflags`)
- Extension version source: `apps/vscode-extension/package.json` (`version`)

### Current policy
- In early releases, desktop and extension versions should move together for clarity.
- They are not hard-coupled at code level.

### Compatibility policy
- Extension `X.Y.Z` is intended for desktop `X.Y.Z`.
- Patch differences are tolerated (`X.Y.(Z±n)`) when protocol/contract remains unchanged.
- Major/minor mismatches are unsupported unless explicitly documented in release notes.

## Channels
- Stable: normal tag, e.g. `v0.1.1`
- Prerelease: tag contains prerelease suffix, e.g. `v0.2.0-rc.1`

## Distribution

### Desktop
- Artifacts published to GitHub Releases.
- Checksums attached to each release.
- Desktop app checks GitHub Releases for update discovery (no self-install in this phase).

### Extension
- `.vsix` always produced and uploaded as artifact/release asset.
- VS Code Marketplace publish runs when `VSCE_PAT` is configured.

## Deferred in v1
- Full desktop binary self-replacement/updater framework
- Delta updates/patch channels
- Enterprise deployment/orchestration
