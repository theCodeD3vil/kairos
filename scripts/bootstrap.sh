#!/usr/bin/env bash
set -euo pipefail

required_tools=(go node pnpm)
missing=0

echo "Checking required tools..."
for tool in "${required_tools[@]}"; do
  if command -v "$tool" >/dev/null 2>&1; then
    case "$tool" in
      go) version="$(go version 2>/dev/null || true)" ;;
      node) version="$(node -v 2>/dev/null || true)" ;;
      pnpm) version="$(pnpm -v 2>/dev/null || true)" ;;
      *) version="" ;;
    esac
    echo "[ok] $tool: $version"
  else
    echo "[missing] $tool (required)"
    missing=1
  fi
done

if command -v wails >/dev/null 2>&1; then
  echo "[ok] wails (optional): $(wails version | head -n 1)"
elif [[ -x "$HOME/go/bin/wails" ]]; then
  echo "[ok] wails (optional): $("$HOME/go/bin/wails" version | head -n 1)"
else
  echo "[missing] wails (optional)"
  echo "Install with: go install github.com/wailsapp/wails/v2/cmd/wails@latest"
fi

if [[ "$missing" -ne 0 ]]; then
  echo ""
  echo "Missing required tools. Install them and rerun ./scripts/bootstrap.sh"
  exit 1
fi

echo ""
echo "Installing workspace dependencies..."
pnpm install

echo ""
echo "Bootstrap complete. Recommended next commands:"
echo "  make doctor"
echo "  make build"
echo "  make desktop-frontend"
echo "  make desktop-dev"
