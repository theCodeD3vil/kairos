# Desktop Release Checklist

## Version + notes
- confirm release tag format is `vX.Y.Z` (or prerelease tag)
- confirm desktop version metadata is set through build ldflags
- confirm GitHub Release notes/changelog are ready

## Build
- run `make doctor`
- run `make desktop-release-check`
- run `make desktop-release-artifacts KAIROS_VERSION=<X.Y.Z>`
- verify artifacts exist in `dist/release/desktop/<X.Y.Z>/<platform>`
- verify checksum file exists and references all desktop assets

## Runtime smoke tests
- launch packaged desktop app outside `wails dev`
- launch with no existing data and confirm first-start succeeds
- relaunch with existing DB and confirm data/settings persist
- verify app shutdown closes local server + SQLite cleanly

## Data and UI sanity
- confirm Overview/Sessions/Analytics/Calendar/Settings load real data or valid empty states
- confirm no mock labels/data are visible
- confirm settings persist and section resets work

## Extension integration sanity
- run desktop with extension disconnected and verify stable offline state
- run desktop with extension connected and verify handshake + ingestion
- verify VS Code health status reflects real reachability

## Update check validation
- open Settings → About
- run `Check Updates`
- verify current/latest/update-available fields populate
- verify `Download Update` opens release URL
- verify update check fails safely when network is unavailable

## Release publication
- verify desktop assets + checksums are attached to GitHub Release
- verify prerelease flag is correct for prerelease tags
- for macOS trusted distribution: verify signature + notarization + stapling
- if Homebrew cask is used: bump `Casks/kairos.rb` version + sha256 to match the new macOS DMG
  - `codesign --verify --deep --strict --verbose=2 <Kairos.app>`
  - `spctl --assess --type execute --verbose <Kairos.app>`

## Rollback/backout
- if packaging fails before publish: stop release and fix, do not retag
- if a bad desktop artifact is already published: mark release as prerelease/draft and publish corrected patch version
