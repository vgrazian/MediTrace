#!/usr/bin/env bash
set -euo pipefail

SITE_URL="${1:-}"
ROUNDS="${2:-5}"
CONCURRENCY="${3:-4}"

if [[ -z "$SITE_URL" ]]; then
  echo "Usage: chaos-pages.sh <SITE_URL> [ROUNDS] [CONCURRENCY]"
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
assert_get "$BASE_URL" "$INDEX_FILE"

JS_ASSET="$(extract_first_match 'assets/[^\"'\'' ]+\.js' "$INDEX_FILE")"
CSS_ASSET="$(extract_first_match 'assets/[^\"'\'' ]+\.css' "$INDEX_FILE")"

[[ -n "$JS_ASSET" ]] || { echo "[chaos] Missing JS asset reference"; exit 1; }
[[ -n "$CSS_ASSET" ]] || { echo "[chaos] Missing CSS asset reference"; exit 1; }

run_round() {
  local round="$1"
  local base="$2"
  local js_asset="$3"
  local css_asset="$4"
  local stamp
  stamp="$(date +%s)-$round-$RANDOM"

  local urls=(
    "${base}?chaos=${stamp}"
    "${base}manifest.webmanifest?chaos=${stamp}"
    "${base}sw.js?chaos=${stamp}"
    "${base}${js_asset}?chaos=${stamp}"
    "${base}${css_asset}?chaos=${stamp}"
  )

  printf '%s\n' "${urls[@]}" | xargs -n 1 -P "$CONCURRENCY" -I {} sh -c 'curl --fail --silent --show-error --location "$1" > /dev/null' _ {}
  echo "[chaos] round ${round}/${ROUNDS} ok"
}

echo "[chaos] Base URL: $BASE_URL"
echo "[chaos] Rounds: $ROUNDS | Concurrency: $CONCURRENCY"

for round in $(seq 1 "$ROUNDS"); do
  run_round "$round" "$BASE_URL" "$JS_ASSET" "$CSS_ASSET"
done

echo "[chaos] PASS"
