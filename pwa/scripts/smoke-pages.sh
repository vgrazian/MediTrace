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

extract_first_match() {
  local pattern="$1"
  local file="$2"
  grep -Eo "$pattern" "$file" | head -n 1
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

JS_ASSET="$(extract_first_match 'assets/[^\"'\'' ]+\.js' "$INDEX_FILE")"
CSS_ASSET="$(extract_first_match 'assets/[^\"'\'' ]+\.css' "$INDEX_FILE")"

[[ -n "$JS_ASSET" ]] || { echo "[smoke] Missing JS asset reference in index"; exit 1; }
[[ -n "$CSS_ASSET" ]] || { echo "[smoke] Missing CSS asset reference in index"; exit 1; }

assert_get "${BASE_URL}${JS_ASSET}" "$TMP_DIR/app.js"
assert_get "${BASE_URL}${CSS_ASSET}" "$TMP_DIR/app.css"

grep -q "/residenze" "$TMP_DIR/app.js" || { echo "[smoke] Residenze route missing in app bundle"; exit 1; }
grep -q "Residenza operativa" "$TMP_DIR/app.js" || { echo "[smoke] Promemoria residenza filter UI missing in app bundle"; exit 1; }
if grep -q "service_role" "$TMP_DIR/app.js"; then
  echo "[smoke] Service role key should never appear in public bundle"
  exit 1
fi

assert_get "${BASE_URL}manifest.webmanifest" "$MANIFEST_FILE"
grep -q '"name":"MediTrace"' "$MANIFEST_FILE" || { echo "[smoke] Manifest name mismatch"; exit 1; }

assert_get "${BASE_URL}sw.js" "$TMP_DIR/sw.js"
grep -q "self" "$TMP_DIR/sw.js" || { echo "[smoke] Service worker file appears invalid"; exit 1; }

echo "[smoke] PASS"