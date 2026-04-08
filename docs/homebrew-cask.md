# Homebrew Cask Distribution (macOS)

Use Homebrew to install and upgrade Kairos from GitHub Releases.

## User install

```bash
brew tap theCodeD3vil/kairos https://github.com/theCodeD3vil/kairos
brew install --cask kairos
```

If the app is unsigned/not notarized and Gatekeeper prompts are disruptive, users can opt out of quarantine at install time:

```bash
brew install --cask --no-quarantine kairos
```

## User update

```bash
brew update
brew upgrade --cask kairos
```

## Maintainer release steps

1. Publish the macOS DMG to GitHub Release with this name pattern:
   - `Kairos-macos-vX.Y.Z.dmg`
2. Update [`Casks/kairos.rb`](../Casks/kairos.rb):
   - `version`
   - `sha256` (DMG checksum)
3. Commit + push to `main`.
4. Ask users to run:
   - `brew update`
   - `brew upgrade --cask kairos`

## Notes

- Homebrew improves update ergonomics, but it does not replace Apple signing/notarization requirements.
- Without an Apple Developer account, some macOS security prompts can still appear.
