#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <vsix-path>" >&2
  exit 1
fi

VSIX_PATH="$1"

if [[ ! -f "$VSIX_PATH" ]]; then
  echo "vsix not found: $VSIX_PATH" >&2
  exit 1
fi

if ! command -v unzip >/dev/null 2>&1; then
  echo "unzip is required to validate vsix contents" >&2
  exit 1
fi

LISTING="$(mktemp)"
trap 'rm -f "$LISTING"' EXIT
unzip -l "$VSIX_PATH" > "$LISTING"

must_have=(
  "extension/dist/extension.js"
  "extension/package.json"
  "extension/readme.md"
  "extension/changelog.md"
  "extension/LICENSE.txt"
)

for required in "${must_have[@]}"; do
  if ! grep -Fq "$required" "$LISTING"; then
    echo "missing required file in vsix: $required" >&2
    exit 1
  fi
done

must_not_have=(
  "extension/src/"
  "extension/test/"
  "extension/.test-dist/"
  "extension/node_modules/"
)

for forbidden in "${must_not_have[@]}"; do
  if grep -Fq "$forbidden" "$LISTING"; then
    echo "forbidden file path in vsix: $forbidden" >&2
    exit 1
  fi
done

echo "vsix validation passed: $VSIX_PATH"
