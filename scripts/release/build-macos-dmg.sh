#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BIN_DIR="$ROOT_DIR/apps/desktop/build/bin"
APP_PATH="$(find "$BIN_DIR" -maxdepth 1 -name '*.app' | head -n1)"

if [[ -z "$APP_PATH" ]]; then
  echo "macOS app bundle not found at $BIN_DIR" >&2
  exit 1
fi

DMG_OUTPUT="$BIN_DIR/Kairos.dmg"
test -f "$DMG_OUTPUT" && rm "$DMG_OUTPUT"

# ensure create-dmg is installed
if ! command -v create-dmg &> /dev/null; then
    echo "create-dmg not found. Please install it, e.g. via 'brew install create-dmg'" >&2
    exit 1
fi

echo "Building macOS DMG installer..."

create-dmg \
  --volname "Kairos" \
  --volicon "$ROOT_DIR/apps/desktop/build/appicon.png" \
  --window-pos 200 120 \
  --window-size 600 400 \
  --icon-size 100 \
  --icon "Kairos.app" 150 190 \
  --hide-extension "Kairos.app" \
  --app-drop-link 450 185 \
  --no-internet-enable \
  "$DMG_OUTPUT" \
  "$APP_PATH"

echo "Generated DMG: $DMG_OUTPUT"
