#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
cd "$repo_root"

if ! command -v brew >/dev/null 2>&1; then
  echo "[error] Homebrew is required but not installed."
  echo "Install Homebrew first: https://brew.sh"
  exit 1
fi

echo "[info] Verifying machine-level dependencies on macOS..."

if ! command -v go >/dev/null 2>&1; then
  echo "[info] Installing Go via Homebrew..."
  brew install go
else
  echo "[ok] go: $(go version 2>/dev/null)"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[info] Installing Node.js via Homebrew..."
  brew install node
else
  echo "[ok] node: $(node -v 2>/dev/null)"
fi

if command -v corepack >/dev/null 2>&1; then
  echo "[info] Enabling pnpm via Corepack..."
  corepack enable pnpm
  corepack prepare pnpm@latest --activate
elif ! command -v pnpm >/dev/null 2>&1; then
  echo "[info] Corepack not found; installing pnpm via npm..."
  npm install -g pnpm
fi

if [[ -x "$(go env GOPATH)/bin/wails" ]] || command -v wails >/dev/null 2>&1; then
  echo "[ok] wails already installed"
else
  echo "[info] Installing Wails CLI..."
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
fi

gobin="$(go env GOBIN)"
if [[ -z "$gobin" ]]; then
  gobin="$(go env GOPATH)/bin"
fi
if [[ -d "$gobin" ]] && [[ ":$PATH:" != *":$gobin:"* ]]; then
  export PATH="$gobin:$PATH"
  echo "[info] Added $gobin to PATH for this script run."
fi

echo ""
echo "[info] Running repo bootstrap..."
"$repo_root/scripts/bootstrap.sh"
