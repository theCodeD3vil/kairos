#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
cd "$repo_root"

if ! command -v apt-get >/dev/null 2>&1; then
  echo "[error] This setup script is intended for Ubuntu/Debian-like systems with apt-get."
  exit 1
fi

sudo apt-get update
sudo apt-get install -y curl git build-essential ca-certificates gnupg

if ! command -v go >/dev/null 2>&1; then
  echo "[info] Installing Go via apt-get..."
  sudo apt-get install -y golang-go
else
  echo "[ok] go: $(go version 2>/dev/null)"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[info] Installing Node.js via NodeSource (preferred over Ubuntu default node packages)..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "[ok] node: $(node -v 2>/dev/null)"
fi

if command -v corepack >/dev/null 2>&1; then
  echo "[info] Enabling pnpm via Corepack..."
  corepack enable pnpm
  corepack prepare pnpm@latest --activate
elif ! command -v pnpm >/dev/null 2>&1; then
  echo "[info] Corepack not found; installing pnpm via npm..."
  sudo npm install -g pnpm
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
