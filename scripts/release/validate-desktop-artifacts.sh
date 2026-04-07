#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <artifact-dir>" >&2
  exit 1
fi

ARTIFACT_DIR="$1"
if [[ ! -d "$ARTIFACT_DIR" ]]; then
  echo "artifact directory not found: $ARTIFACT_DIR" >&2
  exit 1
fi

checksum_file="$(find "$ARTIFACT_DIR" -maxdepth 1 -type f -name 'SHA256SUMS-*.txt' | head -n1)"
if [[ -z "$checksum_file" ]]; then
  echo "missing checksum file in $ARTIFACT_DIR" >&2
  exit 1
fi

artifact_count="$(find "$ARTIFACT_DIR" -maxdepth 1 -type f ! -name "$(basename "$checksum_file")" | wc -l | tr -d ' ')"
if [[ "$artifact_count" -lt 1 ]]; then
  echo "no desktop artifacts found in $ARTIFACT_DIR" >&2
  exit 1
fi

while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  file_name="$(printf '%s' "$line" | awk '{print $2}')"
  if [[ ! -f "$ARTIFACT_DIR/$file_name" ]]; then
    echo "checksum references missing artifact: $file_name" >&2
    exit 1
  fi
done < "$checksum_file"

echo "desktop artifact validation passed: $ARTIFACT_DIR"
