#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RELEASE_TAG="${1:-${RELEASE_TAG:-}}"

if [[ -z "${RELEASE_TAG}" ]]; then
  echo "missing release tag" >&2
  exit 1
fi

RELEASE_NOTES_PATH="$ROOT_DIR/release-notes/${RELEASE_TAG}.md"
if [[ ! -f "$RELEASE_NOTES_PATH" ]]; then
  echo "missing curated release notes: $RELEASE_NOTES_PATH" >&2
  exit 1
fi

echo "$RELEASE_NOTES_PATH"
