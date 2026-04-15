#!/usr/bin/env bash
set -euo pipefail

SITE_URL="${1:-}"

if [[ -z "$SITE_URL" ]]; then
  echo "Usage: smoke-pages.sh <SITE_URL>"
  exit 1
fi

normalize_url() {
  local url="$1"
  if [[ "$url" == */ ]]; then
    printf "%s" "$url"
  else
    printf "%s/" "$url"
  fi
}

assert_get() {
  local url="$1"
  local out="$2"
  curl --fail --silent --show-error --location "$url" > "$out"
}

BASE_URL="$(normalize_url "$SITE_URL")"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

INDEX_FILE="$TMP_DIR/index.html"
MANIFEST_FILE="$TMP_DIR/manifest.webmanifest"

echo "[smoke] Base URL: $BASE_URL"
assert_get "$BASE_URL" "$INDEX_FILE"

grep -q "MediTrace" "$INDEX_FILE" || { echo "[smoke] Missing app title in index"; exit 1; }
grep -q "id=\"app\"" "$INDEX_FILE" || { echo "[smoke] Missing app mount node"; exit 1; }

assert_get "${BASE_URL}manifest.webmanifest" "$MANIFEST_FILE"
grep -q '"name":"MediTrace"' "$MANIFEST_FILE" || { echo "[smoke] Manifest name mismatch"; exit 1; }

assert_get "${BASE_URL}sw.js" "$TMP_DIR/sw.js"
grep -q "self" "$TMP_DIR/sw.js" || { echo "[smoke] Service worker file appears invalid"; exit 1; }

echo "[smoke] PASS"