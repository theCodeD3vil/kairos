#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
VERSION_FILE="$ROOT_DIR/VERSION"
EXTENSION_PACKAGE_JSON="$ROOT_DIR/apps/vscode-extension/package.json"
BUILDINFO_FILE="$ROOT_DIR/apps/desktop/internal/buildinfo/buildinfo.go"

if [[ ! -f "$VERSION_FILE" ]]; then
  echo "missing VERSION file" >&2
  exit 1
fi

PRODUCT_VERSION="$(tr -d ' \n\r\t' < "$VERSION_FILE")"
EXTENSION_VERSION="$(node -e "const fs=require('fs'); const path=require('path'); const pkg=path.join(process.cwd(),'apps','vscode-extension','package.json'); process.stdout.write(JSON.parse(fs.readFileSync(pkg,'utf8')).version)")"
DESKTOP_DEFAULT_VERSION="$(awk -F'"' '/DesktopVersion[[:space:]]*=/ {print $2; exit}' "$BUILDINFO_FILE")"

if [[ "$PRODUCT_VERSION" != "$EXTENSION_VERSION" ]]; then
  echo "version mismatch: VERSION=$PRODUCT_VERSION extension=$EXTENSION_VERSION" >&2
  exit 1
fi

if [[ "$DESKTOP_DEFAULT_VERSION" != "$PRODUCT_VERSION-dev" && "$DESKTOP_DEFAULT_VERSION" != "$PRODUCT_VERSION" ]]; then
  echo "desktop default version should be $PRODUCT_VERSION or $PRODUCT_VERSION-dev (got $DESKTOP_DEFAULT_VERSION)" >&2
  exit 1
fi

echo "version sync ok: product=$PRODUCT_VERSION extension=$EXTENSION_VERSION desktop-default=$DESKTOP_DEFAULT_VERSION"
