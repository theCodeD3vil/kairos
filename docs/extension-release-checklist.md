# Extension Release Checklist

## Version + metadata
- confirm `apps/vscode-extension/package.json` `version` is the intended release version
- confirm extension metadata (`publisher`, `repository`, `homepage`, `bugs`) is correct
- confirm compatibility note with desktop version is reflected in release notes

## Build and package
- run `pnpm install` at repo root
- run `pnpm --filter kairos-vscode verify:release`
- run `pnpm --filter kairos-vscode package:vsix`
- verify `apps/vscode-extension/dist/kairos-vscode-<version>.vsix` exists
- verify `apps/vscode-extension/dist/SHA256SUMS-vsix.txt` exists

## Package integrity
- verify `.vsix` excludes source/test/dev-only artifacts
- install `.vsix` locally with `code --install-extension ... --force`
- verify extension activates and status bar appears

## Runtime integration sanity
- with desktop offline: verify extension degrades safely
- with desktop online: verify handshake, refresh, reconnect, and ingestion flow
- verify active-edit timing rules still apply (15s dwell + edit-only counted time)

## Release publication
- verify `.vsix` is uploaded to GitHub Release
- if `VSCE_PAT` is configured, verify Marketplace publish succeeded
- if Marketplace publish is skipped, verify package-only fallback still produced `.vsix`

## Rollback/backout
- if `.vsix` validation or install check fails: stop release and rebuild package
- if Marketplace publish already shipped a bad package: immediately publish a corrective patch release and update release notes
