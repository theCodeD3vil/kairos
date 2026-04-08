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
mkdir -p "$STAGING_DIR/usr/share/pixmaps"
mkdir -p "$STAGING_DIR/usr/share/icons/hicolor/1024x1024/apps"

# Copy binary
cp "$BIN_PATH" "$STAGING_DIR/usr/bin/kairos"
chmod 755 "$STAGING_DIR/usr/bin/kairos"

# Copy icon
if [[ -f "$ROOT_DIR/apps/desktop/build/appicon.png" ]]; then
  cp "$ROOT_DIR/apps/desktop/build/appicon.png" "$STAGING_DIR/usr/share/icons/hicolor/1024x1024/apps/kairos.png"
  cp "$ROOT_DIR/apps/desktop/build/appicon.png" "$STAGING_DIR/usr/share/pixmaps/kairos.png"
fi

# Create Desktop entry
cat <<EOF > "$STAGING_DIR/usr/share/applications/kairos.desktop"
[Desktop Entry]
Name=Kairos
Exec=/usr/bin/kairos
Icon=/usr/share/pixmaps/kairos.png
Type=Application
Categories=Utility;
Terminal=false
StartupNotify=true
StartupWMClass=Kairos
EOF

# Create control file
cat <<EOF > "$STAGING_DIR/DEBIAN/control"
Package: kairos
Version: ${VERSION}
Architecture: ${ARCH}
Maintainer: kairos@michaelnji.codes
Description: Local-first activity tracking for Kairos Desktop.
Depends: libgtk-3-0, libglib2.0-0, libgdk-pixbuf-2.0-0, libwebkit2gtk-4.1-0 | libwebkit2gtk-4.0-37, libjavascriptcoregtk-4.1-0 | libjavascriptcoregtk-4.0-18
EOF

# Refresh icon/app caches when available (non-fatal if tools are missing).
cat <<'EOF' > "$STAGING_DIR/DEBIAN/postinst"
#!/usr/bin/env bash
set -euo pipefail

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database /usr/share/applications || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi
EOF
chmod 755 "$STAGING_DIR/DEBIAN/postinst"

# Build deb
OUTPUT_DEB="$BIN_DIR/kairos.deb"
dpkg-deb --build "$STAGING_DIR" "$OUTPUT_DEB"
echo "Generated $OUTPUT_DEB"
