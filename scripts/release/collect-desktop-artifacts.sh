#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "usage: $0 <version> <platform-label> <output-dir>" >&2
  exit 1
fi

VERSION="$1"
PLATFORM="$2"
OUTPUT_DIR="$3"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BIN_DIR="$ROOT_DIR/apps/desktop/build/bin"

if [[ ! -d "$BIN_DIR" ]]; then
  echo "desktop build output not found: $BIN_DIR" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

shopt -s nullglob
for item in "$BIN_DIR"/*; do
  base_name="$(basename "$item")"

  if [[ -d "$item" ]]; then
    artifact_name="${base_name%.*}-${PLATFORM}-v${VERSION}.zip"
    (
      cd "$BIN_DIR"
      zip -qry "$OUTPUT_DIR/$artifact_name" "$base_name"
    )
    continue
  fi

  name_without_ext="${base_name%.*}"
  ext=""
  if [[ "$base_name" == *.* && "$name_without_ext" != "$base_name" ]]; then
    ext=".${base_name##*.}"
  fi
  artifact_name="${name_without_ext}-${PLATFORM}-v${VERSION}${ext}"
  cp "$item" "$OUTPUT_DIR/$artifact_name"
done

"$ROOT_DIR/scripts/release/write-checksums.sh" "$OUTPUT_DIR" "$OUTPUT_DIR/SHA256SUMS-${PLATFORM}.txt"

echo "desktop release artifacts prepared in: $OUTPUT_DIR"
