#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
VERSION="$(cat "$ROOT_DIR/VERSION")"
ARCH="amd64"
BIN_DIR="$ROOT_DIR/apps/desktop/build/bin"
BIN_PATH="$BIN_DIR/Kairos"

if [[ ! -f "$BIN_PATH" ]]; then
  echo "Binary not found at $BIN_PATH!"
  exit 1
fi

STAGING_DIR="$(mktemp -d)"
trap 'rm -rf "$STAGING_DIR"' EXIT

# Create directory structure
mkdir -p "$STAGING_DIR/DEBIAN"
mkdir -p "$STAGING_DIR/usr/bin"
mkdir -p "$STAGING_DIR/usr/share/applications"
mkdir -p "$STAGING_DIR/usr/share/icons/hicolor/1024x1024/apps"

# Copy binary
cp "$BIN_PATH" "$STAGING_DIR/usr/bin/kairos"
chmod 755 "$STAGING_DIR/usr/bin/kairos"

# Copy icon
if [[ -f "$ROOT_DIR/apps/desktop/build/appicon.png" ]]; then
  cp "$ROOT_DIR/apps/desktop/build/appicon.png" "$STAGING_DIR/usr/share/icons/hicolor/1024x1024/apps/kairos.png"
fi

# Create Desktop entry
cat <<EOF > "$STAGING_DIR/usr/share/applications/kairos.desktop"
[Desktop Entry]
Name=Kairos
Exec=/usr/bin/kairos
Icon=kairos
Type=Application
Categories=Utility;
Terminal=false
EOF

# Create control file
cat <<EOF > "$STAGING_DIR/DEBIAN/control"
Package: kairos
Version: ${VERSION}
Architecture: ${ARCH}
Maintainer: kairos@michaelnji.codes
Description: Local-first activity tracking for Kairos Desktop.
EOF

# Build deb
OUTPUT_DEB="$BIN_DIR/kairos.deb"
dpkg-deb --build "$STAGING_DIR" "$OUTPUT_DEB"
echo "Generated $OUTPUT_DEB"
