#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
cd "$repo_root"

require_tool() {
  local tool="$1"
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "[missing] $tool (required)"
    return 1
  fi

  case "$tool" in
    go) echo "[ok] $tool: $(go version 2>/dev/null)" ;;
    node) echo "[ok] $tool: $(node -v 2>/dev/null)" ;;
    *) echo "[ok] $tool" ;;
  esac
}

enable_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    echo "[ok] pnpm: $(pnpm -v 2>/dev/null)"
    return 0
  fi

  if command -v corepack >/dev/null 2>&1; then
    echo "[info] pnpm not found. Enabling pnpm via Corepack..."
    corepack enable pnpm
    corepack prepare pnpm@latest --activate
    if command -v pnpm >/dev/null 2>&1; then
      echo "[ok] pnpm: $(pnpm -v 2>/dev/null)"
      return 0
    fi
  fi

  echo "[error] pnpm is missing and Corepack is unavailable."
  echo "        Install pnpm or install a Node distribution with Corepack support."
  return 1
}

wails_install_status="already-installed"
added_go_bin_to_path="no"

ensure_go_bin_on_path() {
  local gobin
  gobin="$(go env GOBIN)"
  if [[ -z "$gobin" ]]; then
    gobin="$(go env GOPATH)/bin"
  fi

  if [[ -d "$gobin" ]] && [[ ":$PATH:" != *":$gobin:"* ]]; then
    export PATH="$gobin:$PATH"
    added_go_bin_to_path="yes"
    echo "[info] Added $gobin to PATH for this script run."
  fi
}

ensure_wails() {
  ensure_go_bin_on_path

  if command -v wails >/dev/null 2>&1; then
    echo "[ok] wails: $(wails version | head -n 1)"
    return 0
  fi

  echo "[info] wails not found. Installing via Go..."
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
  wails_install_status="installed-during-bootstrap"

  ensure_go_bin_on_path

  if command -v wails >/dev/null 2>&1; then
    echo "[ok] wails: $(wails version | head -n 1)"
  else
    echo "[error] Wails installation completed but 'wails' is still not on PATH in this shell."
    echo "        Try running with: \"$(go env GOPATH)/bin/wails\""
    return 1
  fi
}

echo "Checking required tools..."
require_tool go
require_tool node

enable_pnpm
ensure_wails

echo ""
echo "Installing workspace dependencies..."
pnpm install

echo ""
echo "Bootstrap summary:"
echo "- go: $(go version 2>/dev/null)"
echo "- node: $(node -v 2>/dev/null)"
echo "- pnpm: $(pnpm -v 2>/dev/null)"
echo "- wails: $(wails version | head -n 1)"
echo "- wails install status: $wails_install_status"

if [[ "$added_go_bin_to_path" == "yes" ]]; then
  gobin="$(go env GOBIN)"
  if [[ -z "$gobin" ]]; then
    gobin="$(go env GOPATH)/bin"
  fi
  echo ""
  echo "Note: PATH was updated only for this script run."
  echo "Add this to your shell profile for future sessions:"
  echo "  export PATH=\"$gobin:\$PATH\""
fi

echo ""
echo "Recommended next commands:"
echo "  make doctor"
echo "  make build"
echo "  make desktop-dev"
