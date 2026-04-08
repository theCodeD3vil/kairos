# Kairos Release Pipeline

## Workflows

### CI
File: `.github/workflows/ci.yml`

Runs on:
- pull requests
- pushes to `main`

Checks:
- workspace install
- shared package build
- desktop frontend typecheck/tests
- desktop frontend production build (for embed-backed Go tests)
- desktop Go tests
- extension release verification
- extension `.vsix` package sanity
- desktop release-build sanity (`macOS`, `linux`)

### Desktop release
File: `.github/workflows/desktop-release.yml`

Triggers:
- push tag `v*`
- manual `workflow_dispatch`

Does:
- builds desktop package per platform matrix (`macos`, `linux`, `windows`)
- on macOS, optionally signs/notarizes/staples app bundles when Apple credentials are configured
- collects release artifacts into `dist/release/desktop/<version>/<platform>`
- generates SHA-256 checksums
- resolves curated release notes from `release-notes/vX.Y.Z.md`
- publishes assets to GitHub Release

### Extension release
File: `.github/workflows/extension-release.yml`

Triggers:
- push tag `v*`
- manual `workflow_dispatch`

Does:
- extension release verification/build
- `.vsix` packaging
- checksum generation
- optional VS Code Marketplace publish (if `VSCE_PAT` exists)
- resolves curated release notes from `release-notes/vX.Y.Z.md`
- attaches `.vsix` + checksum file to GitHub Release

### Release dry run
File: `.github/workflows/release-dry-run.yml`

Triggers:
- manual `workflow_dispatch`
- pull requests touching release/build workflow paths

Does:
- version sync validation
- desktop build + artifact collection/validation
- optional macOS sign/notarize validation path (runs only when Apple credentials are configured)
- extension verify/package + `.vsix` validation
- dry-run artifact upload (desktop + extension)

## Required secrets
- `VSCE_PAT`: VS Code Marketplace publishing token (optional but required for publish step)
- `GITHUB_TOKEN`: provided by Actions for release upload
- `APPLE_DEVELOPER_CERT_BASE64`: base64-encoded Developer ID Application `.p12` (optional; required for macOS trusted distribution)
- `APPLE_DEVELOPER_CERT_PASSWORD`: password for `APPLE_DEVELOPER_CERT_BASE64`
- `APPLE_DEVELOPER_IDENTITY`: signing identity name, for example `Developer ID Application: Your Name (TEAMID)`
- `APPLE_ID`: Apple ID used for notarization submissions
- `APPLE_TEAM_ID`: Apple Developer Team ID
- `APPLE_APP_SPECIFIC_PASSWORD`: app-specific password for notarization

Without Apple signing secrets, macOS builds still succeed but remain unsigned/unnotarized. Gatekeeper can warn that the app cannot be verified.

## Release artifact naming

Desktop artifacts:
- `<binary-or-app>-<platform>-v<version>.<ext|zip>`
- `SHA256SUMS-<platform>.txt`

Extension artifacts:
- `kairos-vscode-<version>.vsix`
- `SHA256SUMS-vsix.txt`

## Operator flow
1. Bump versions (see `docs/release-strategy.md`).
2. Run dry run (`scripts/release/run-dry-run-local.sh` or `Release Dry Run` workflow).
3. Create and push tag `vX.Y.Z`.
4. Monitor desktop + extension release workflows.
5. Verify GitHub Release assets/checksums.
6. Validate update-check in desktop app.
7. Ensure `release-notes/vX.Y.Z.md` exists before triggering release workflows.
