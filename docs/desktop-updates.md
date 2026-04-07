# Desktop Update Management (v1)

## v1 model
Kairos desktop supports update discovery only.

It does:
- detect current desktop version
- query GitHub Releases metadata
- compare latest release version vs current version
- expose update availability in Settings/About
- open release/download URL for manual install

It does not:
- auto-download/install
- replace binaries in-place
- manage installer frameworks (Sparkle/WinSparkle/etc.)

## Source of truth
- Update repository: `michaelnji/kairos` (from desktop build info)
- Release metadata source: GitHub Releases API

## Behavior details
- Stable builds prefer non-prerelease releases.
- Prerelease channels can consume prerelease tags.
- If GitHub is unreachable, update check fails safely and UI remains usable.

## Contracts surfaced to frontend
- `currentVersion`
- `latestVersion`
- `updateAvailable`
- `releaseUrl` / `assetUrl`
- `checkedAt`
- `error` (optional)

## Validation checklist
1. Open Settings → About.
2. Click `Check Updates`.
3. Confirm status and latest version populate.
4. Confirm `Download Update` opens GitHub release URL when available.
5. Simulate network failure and confirm non-crashing failure state.
