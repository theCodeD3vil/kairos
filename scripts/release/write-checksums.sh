#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "usage: $0 <artifacts-dir> <output-file>" >&2
  exit 1
fi

ARTIFACTS_DIR="$1"
OUTPUT_FILE="$2"

if [[ ! -d "$ARTIFACTS_DIR" ]]; then
  echo "artifacts directory does not exist: $ARTIFACTS_DIR" >&2
  exit 1
fi

hash_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
    return
  fi
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
    return
  fi
  if command -v openssl >/dev/null 2>&1; then
    openssl dgst -sha256 "$file" | awk '{print $NF}'
    return
  fi

  echo "no sha256 tool found (sha256sum/shasum/openssl)" >&2
  exit 1
}

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

while IFS= read -r file; do
  [[ -f "$file" ]] || continue
  if [[ "$(basename "$file")" == "$(basename "$OUTPUT_FILE")" ]]; then
    continue
  fi

  checksum="$(hash_file "$file")"
  rel_path="$(basename "$file")"
  printf "%s  %s\n" "$checksum" "$rel_path" >> "$tmp_file"
done < <(find "$ARTIFACTS_DIR" -maxdepth 1 -type f | sort)

mv "$tmp_file" "$OUTPUT_FILE"
echo "wrote checksums: $OUTPUT_FILE"
