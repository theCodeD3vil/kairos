#!/usr/bin/env bash
# install.sh — Install the Kairos Fresh plugin and bridge helper.
#
# Usage:
#   ./install.sh
#   BRIDGE_BIN=/path/to/kairos-fresh-bridge ./install.sh
#
# Environment:
#   BRIDGE_BIN        Pre-built binary (default: ../../dist/kairos-fresh-bridge).
#   FRESH_CONFIG_DIR  Fresh config directory (default: ~/.config/fresh).
#   PLUGIN_DIR        Fresh plugins directory (default: $FRESH_CONFIG_DIR/plugins).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

BRIDGE_BIN="${BRIDGE_BIN:-$REPO_ROOT/dist/kairos-fresh-bridge}"
FRESH_CONFIG_DIR="${FRESH_CONFIG_DIR:-$HOME/.config/fresh}"
PLUGIN_DIR="${PLUGIN_DIR:-$FRESH_CONFIG_DIR/plugins}"

if [[ ! -f "$BRIDGE_BIN" ]]; then
  echo "error: bridge binary not found at $BRIDGE_BIN" >&2
  echo "       Build it first: make fresh-bridge-build" >&2
  exit 1
fi

# --- Install bridge binary ---

# Primary: /usr/local/bin (always in macOS launchd PATH, available to GUI apps)
if [[ -w /usr/local/bin ]]; then
  cp "$BRIDGE_BIN" /usr/local/bin/kairos-fresh-bridge
  chmod +x /usr/local/bin/kairos-fresh-bridge
  echo "installed: /usr/local/bin/kairos-fresh-bridge"
elif sudo -n true 2>/dev/null; then
  sudo cp "$BRIDGE_BIN" /usr/local/bin/kairos-fresh-bridge
  sudo chmod +x /usr/local/bin/kairos-fresh-bridge
  echo "installed: /usr/local/bin/kairos-fresh-bridge (via sudo)"
else
  echo "  NOTE: /usr/local/bin not writable without sudo."
  echo "  Run this once to enable the plugin in Fresh:"
  echo "    sudo cp $BRIDGE_BIN /usr/local/bin/kairos-fresh-bridge"
  echo ""
fi

# Fallback: Fresh config dir (absolute path used by plugin if /usr/local/bin unavailable)
mkdir -p "$FRESH_CONFIG_DIR"
cp "$BRIDGE_BIN" "$FRESH_CONFIG_DIR/kairos-fresh-bridge"
chmod +x "$FRESH_CONFIG_DIR/kairos-fresh-bridge"
echo "installed: $FRESH_CONFIG_DIR/kairos-fresh-bridge"

# --- Install Fresh plugin ---
mkdir -p "$PLUGIN_DIR"
cp "$SCRIPT_DIR/src/kairos.ts" "$PLUGIN_DIR/kairos.ts"
echo "installed: $PLUGIN_DIR/kairos.ts"

echo ""
echo "Kairos Fresh plugin installed. Restart Fresh to activate."
