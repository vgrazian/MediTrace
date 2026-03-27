#!/usr/bin/env bash
set -euo pipefail

# Wrapper for smoke-test-api.sh.
# Supports 3 input modes (priority order):
# 1) --url and --key arguments
# 2) WEB_APP_URL / API_KEY environment variables
# 3) values from ../../../credentials.local.env
# 4) Defaults below (edit once and run)

DEFAULT_WEB_APP_URL="https://script.google.com/macros/s/REPLACE_WITH_DEPLOYMENT_ID/exec"
DEFAULT_API_KEY="REPLACE_WITH_API_KEY"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CREDENTIALS_FILE="$PROJECT_ROOT/credentials.local.env"

if [[ -f "$CREDENTIALS_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CREDENTIALS_FILE"
fi

WEB_APP_URL="${WEB_APP_URL:-${MEDITRACE_WEB_APP_URL:-$DEFAULT_WEB_APP_URL}}"
API_KEY="${API_KEY:-${MEDITRACE_API_KEY:-$DEFAULT_API_KEY}}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)
      WEB_APP_URL="${2:-}"
      shift 2
      ;;
    --key)
      API_KEY="${2:-}"
      shift 2
      ;;
    -h|--help)
      cat <<'EOF'
Usage:
  ./run-smoke-test.sh
  ./run-smoke-test.sh --url "https://script.google.com/macros/s/XXXX/exec" --key "secret"
  WEB_APP_URL="https://..." API_KEY="secret" ./run-smoke-test.sh

Optional passthrough vars supported by smoke-test-api.sh:
  OPERATOR_ID, DRUG_ID, THERAPY_ID, GUEST_ID, REMINDER_ID
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Run with --help for usage." >&2
      exit 1
      ;;
  esac
done

if [[ -z "$WEB_APP_URL" || -z "$API_KEY" ]]; then
  echo "WEB_APP_URL and API_KEY are required." >&2
  exit 1
fi

if [[ "$WEB_APP_URL" == "$DEFAULT_WEB_APP_URL" || "$API_KEY" == "$DEFAULT_API_KEY" ]]; then
  echo "Please set WEB_APP_URL and API_KEY before running." >&2
  echo "Either edit defaults in run-smoke-test.sh, pass --url/--key, or export env vars." >&2
  exit 1
fi

if [[ "$WEB_APP_URL" == *"XXXX"* || "$WEB_APP_URL" == *"REPLACE_WITH"* || "$API_KEY" == "your-api-key" || "$API_KEY" == *"REPLACE_WITH"* ]]; then
  echo "Placeholder WEB_APP_URL/API_KEY detected." >&2
  echo "Pass real values for --url and --key." >&2
  exit 1
fi

if [[ "$WEB_APP_URL" != https://script.google.com/macros/s/*/exec ]]; then
  echo "Invalid WEB_APP_URL format: $WEB_APP_URL" >&2
  echo "Expected: https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec" >&2
  exit 1
fi

WEB_APP_URL="$WEB_APP_URL" API_KEY="$API_KEY" "$SCRIPT_DIR/smoke-test-api.sh"
