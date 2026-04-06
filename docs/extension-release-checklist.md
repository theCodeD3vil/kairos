# Extension Release Checklist

## Build And Package

- run `pnpm install` at repo root
- run `pnpm --filter @kairos/shared build`
- run `pnpm --filter kairos-vscode verify:release`
- run `pnpm --filter kairos-vscode package:vsix`
- confirm the output exists at `apps/vscode-extension/dist/kairos-vscode-<version>.vsix`

## Manifest Checks

- confirm `apps/vscode-extension/package.json` version matches the intended release
- confirm the publisher value is correct for the intended release target
- confirm repository, homepage, and bugs metadata still match the repo
- confirm `CHANGELOG.md` includes the release entry
- confirm command titles are release-safe

## Clean Install Validation

- uninstall any existing local Kairos extension build
- install the new `.vsix`
- start a fresh VS Code window
- confirm the extension activates without crashing
- confirm the `Kairos` output channel is available

## Desktop Unavailable Validation

- quit the Kairos desktop app
- open VS Code with the extension installed
- confirm VS Code stays stable
- confirm the extension status reflects disconnected or retrying behavior
- confirm the output channel reports desktop unavailability without repeated spam

## Desktop Available Validation

- launch the Kairos desktop app
- open VS Code
- confirm the extension connects automatically
- confirm `Kairos: Refresh Desktop Settings` succeeds
- confirm the desktop backend reports extension status and recent ingestion activity

## Settings Validation

- toggle desktop tracking enabled off and confirm activity emission stops
- toggle desktop tracking enabled on and confirm activity resumes
- toggle focus-only tracking and confirm unfocused edit activity is suppressed
- change heartbeat interval and confirm heartbeat cadence updates
- disable open/save/edit categories individually and confirm each stops sending

## Privacy And Exclusions Validation

- set `filePathMode=hidden` and confirm no file path is sent
- set `filePathMode=masked` and confirm only basenames are sent
- disable project metadata and confirm redacted project/workspace values are emitted
- disable language metadata and confirm redacted language values are emitted
- configure exclusions for project, folder, workspace pattern, file extension, and machine; confirm matching activity is not sent

## Buffering And Retry Validation

- enable buffering and retry in desktop settings
- stop the desktop app while editing
- confirm events buffer without crashing VS Code
- restart the desktop app
- confirm buffered events flush and connection state returns to connected
- confirm queue bounds remain stable during prolonged offline editing

## Upgrade Validation

- package two successive local versions
- install the older build first
- upgrade to the newer build with `code --install-extension --force`
- confirm activation still works after upgrade
- confirm the stored machine ID remains stable after upgrade

## Release Surface Checks

- confirm the packaged `.vsix` does not include `src/`, `test/`, `.test-dist/`, or local dev artifacts
- confirm the release bundle contains only the intended runtime assets and docs
- confirm the package installs cleanly from the generated `.vsix`

## Remaining Manual Gate

- decide whether the placeholder publisher `kairos-dev` should be replaced for the target release channel
- decide whether `UNLICENSED` is acceptable for the target distribution channel
