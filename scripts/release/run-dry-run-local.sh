#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
VERSION="$(tr -d ' \n\r\t' < "$ROOT_DIR/VERSION")"
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')"
DESKTOP_OUT_DIR="$ROOT_DIR/dist/release-dry-run/desktop/$VERSION/$PLATFORM"
EXTENSION_DIST_DIR="$ROOT_DIR/apps/vscode-extension/dist"
FAILURES=0

if [[ "$PLATFORM" == "darwin" ]]; then
  export KAIROS_DESKTOP_CGO_LDFLAGS="-framework UniformTypeIdentifiers"
fi

step() {
  local name="$1"
  shift
  echo "==> ${name}"
  if "$@"; then
    echo "ok: ${name}"
  else
    echo "failed: ${name}"
    FAILURES=$((FAILURES + 1))
  fi
  echo ""
}

step "verify version sync" "$ROOT_DIR/scripts/release/verify-version-sync.sh"

step "desktop release prechecks" bash -lc "
  set -euo pipefail
  pnpm --dir \"$ROOT_DIR\" --filter @kairos/desktop-frontend typecheck
  pnpm --dir \"$ROOT_DIR\" --filter @kairos/desktop-frontend build
  cd \"$ROOT_DIR/apps/desktop\"
  go test ./internal/ingestion \
    ./internal/sessionization \
    ./internal/settings \
    ./internal/storage \
    ./internal/views \
    ./internal/updates
"

step "desktop release build + artifacts" bash -lc "
  set -euo pipefail
  make -C \"$ROOT_DIR\" desktop-release-artifacts KAIROS_VERSION=\"$VERSION\"
  mkdir -p \"$DESKTOP_OUT_DIR\"
  if [[ -d \"$ROOT_DIR/dist/release/desktop/$VERSION/$PLATFORM\" ]]; then
    cp -f \"$ROOT_DIR\"/dist/release/desktop/\"$VERSION\"/\"$PLATFORM\"/* \"$DESKTOP_OUT_DIR\"/
  fi
  \"$ROOT_DIR/scripts/release/validate-desktop-artifacts.sh\" \"$DESKTOP_OUT_DIR\"
"

step "extension release build + package" bash -lc "
  set -euo pipefail
  pnpm --dir \"$ROOT_DIR\" --filter kairos-vscode verify:release
  pnpm --dir \"$ROOT_DIR\" --filter kairos-vscode package:vsix

  vsix_path=\"\$(ls -1 \"$EXTENSION_DIST_DIR\"/*.vsix | head -n1)\"
  \"$ROOT_DIR/scripts/release/validate-extension-vsix.sh\" \"\$vsix_path\"
  \"$ROOT_DIR/scripts/release/write-checksums.sh\" \"$EXTENSION_DIST_DIR\" \"$EXTENSION_DIST_DIR/SHA256SUMS-vsix.txt\"
"

step "update-check tests" bash -lc "
  set -euo pipefail
  cd \"$ROOT_DIR/apps/desktop\"
  go test ./internal/updates -run \"Test(CheckForUpdate|IsVersionGreater)\" -count=1
"

echo "Dry run complete."
echo "Desktop artifacts (if built): $DESKTOP_OUT_DIR"
if ls -1 "$EXTENSION_DIST_DIR"/*.vsix >/dev/null 2>&1; then
  echo "Extension artifact: $(ls -1 "$EXTENSION_DIST_DIR"/*.vsix | head -n1)"
fi

if [[ "$FAILURES" -gt 0 ]]; then
  echo "Dry run finished with ${FAILURES} failed step(s)."
  exit 1
fi

echo "Dry run finished with all steps passing."
