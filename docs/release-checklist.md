# Product Release Checklist

## Pre-release
- version bump completed (`VERSION`, desktop ldflags target, extension `package.json`)
- changelog/release notes drafted
- compatibility statement (desktop ↔ extension) verified

## Build + test gates
- CI workflow green
- desktop release workflow green for supported platforms
- extension release workflow green
- local smoke tests complete on at least one machine per active platform

## Functional sanity
- no-data startup path validated
- existing-data startup path validated with existing data
- desktop/extension local integration sanity validated
- update-check flow validated from Settings → About

## Artifact verification
- desktop artifacts attached to GitHub Release
- desktop checksum files attached and valid
- extension `.vsix` attached to GitHub Release
- extension checksum file attached and valid
- prerelease/stable flag on GitHub Release is correct

## Distribution validation
- Marketplace publish status confirmed (or intentionally skipped with `.vsix` fallback)
- release notes are user-facing and do not expose internal-only implementation details

## Rollback/abort plan
- release abort owner identified before publishing
- rollback action recorded:
  - if GitHub Release already published, immediately mark as prerelease or draft and add "do not use" release note
  - if Marketplace publish already completed, publish a corrective patch release and update release notes
  - if only artifacts were built but not published, stop and fix before retagging

## Post-release
- tag and release metadata match shipped artifact versions
- known deferred items are tracked separately (full self-updating, installer replacement)
