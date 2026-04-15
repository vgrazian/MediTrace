#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/credentials.local.env"
OUTPUT_FILE="$ROOT_DIR/pwa/.env.production.local"
LOCAL_ENV_FILE="$ROOT_DIR/pwa/.env.local"
RUN_BUILD="0"
TRIGGER_DEPLOY="0"
SET_GH="0"
SYNC_LOCAL_ENV="1"

usage() {
  cat <<'EOF'
Usage: setup-production-deploy.sh [options]

Options:
  --env-file <path>      Source env file (default: credentials.local.env)
  --output-file <path>   Target file (default: pwa/.env.production.local)
  --build                Run production build after writing env file
  --set-gh               Push required Variables/Secrets to GitHub repository
  --trigger-deploy       Trigger GitHub Actions deploy workflow
  --no-sync-local-env    Do not mirror generated values to pwa/.env.local
  -h, --help             Show this help

Examples:
  bash pwa/scripts/setup-production-deploy.sh
  bash pwa/scripts/setup-production-deploy.sh --set-gh
  bash pwa/scripts/setup-production-deploy.sh --build
  bash pwa/scripts/setup-production-deploy.sh --set-gh --build --trigger-deploy
EOF
}

derive_pages_site_url() {
  local remote_url
  remote_url="$(git -C "$ROOT_DIR" remote get-url origin 2>/dev/null || true)"
  if [[ -z "$remote_url" ]]; then
    return
  fi

  local slug=""
  case "$remote_url" in
    git@github.com:*)
      slug="${remote_url#git@github.com:}"
      ;;
    https://github.com/*)
      slug="${remote_url#https://github.com/}"
      ;;
    *)
      return
      ;;
  esac

  slug="${slug%.git}"
  local owner="${slug%%/*}"
  local repo="${slug##*/}"
  if [[ -z "$owner" || -z "$repo" ]]; then
    return
  fi

  printf "https://%s.github.io/%s/" "$owner" "$repo"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[error] Missing required command: $1"
    exit 1
  fi
}

read_value_from_env_file() {
  local file="$1"
  local key="$2"
  if [[ ! -f "$file" ]]; then
    return
  fi
  awk -F= -v target="$key" '$1 == target {print substr($0, index($0, "=") + 1)}' "$file" | tail -n 1
}

resolve_value() {
  local fallback_file="$1"
  shift
  local key=""
  local value=""
  for key in "$@"; do
    value="${!key:-}"
    if [[ -n "$value" ]]; then
      echo "$value"
      return
    fi
  done
  for key in "$@"; do
    value="$(read_value_from_env_file "$fallback_file" "$key")"
    if [[ -n "$value" ]]; then
      echo "$value"
      return
    fi
  done
}

set_repo_variable() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "[skip] Variable $name empty"
    return
  fi
  gh variable set "$name" --body "$value"
  echo "[ok] Variable $name configured"
}

set_required_repo_variable() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "[error] Required variable $name is empty"
    exit 1
  fi
  gh variable set "$name" --body "$value"
  echo "[ok] Variable $name configured"
}

set_repo_secret() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "[skip] Secret $name empty"
    return
  fi
  gh secret set "$name" --body "$value"
  echo "[ok] Secret $name configured"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --output-file)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --build)
      RUN_BUILD="1"
      shift
      ;;
    --set-gh)
      SET_GH="1"
      shift
      ;;
    --trigger-deploy)
      TRIGGER_DEPLOY="1"
      shift
      ;;
    --no-sync-local-env)
      SYNC_LOCAL_ENV="0"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[error] Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[error] Env file not found: $ENV_FILE"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

VITE_BASE_URL_VALUE="${VITE_BASE_URL:-/MediTrace/}"
VITE_SUPABASE_URL_VALUE="$(resolve_value "$LOCAL_ENV_FILE" "VITE_SUPABASE_URL" "SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_URL")"
VITE_SUPABASE_PUBLISHABLE_KEY_VALUE="$(resolve_value "$LOCAL_ENV_FILE" "VITE_SUPABASE_PUBLISHABLE_KEY" "SUPABASE_PUBLISHABLE_KEY" "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")"
VITE_SUPABASE_REDIRECT_TO_VALUE="$(resolve_value "$LOCAL_ENV_FILE" "VITE_SUPABASE_REDIRECT_TO")"
VITE_VAPID_PUBLIC_KEY_VALUE="$(resolve_value "$LOCAL_ENV_FILE" "VITE_VAPID_PUBLIC_KEY")"
PAGES_SITE_URL_VALUE="$(derive_pages_site_url)"

if [[ -z "$VITE_SUPABASE_REDIRECT_TO_VALUE" && -n "$PAGES_SITE_URL_VALUE" ]]; then
  VITE_SUPABASE_REDIRECT_TO_VALUE="${PAGES_SITE_URL_VALUE%/}/#/auth/reset-password"
fi

VITE_EMERGENCY_ADMIN_ENABLED_VALUE="${VITE_EMERGENCY_ADMIN_ENABLED:-0}"
VITE_EMERGENCY_ADMIN_USERNAME_VALUE="${VITE_EMERGENCY_ADMIN_USERNAME:-${MEDITRACE_EMERGENCY_ADMIN_USERNAME:-}}"
VITE_EMERGENCY_ADMIN_PASSWORD_VALUE="${VITE_EMERGENCY_ADMIN_PASSWORD:-${MEDITRACE_EMERGENCY_ADMIN_PASSWORD:-}}"
VITE_EMERGENCY_ADMIN_EMAIL_VALUE="${VITE_EMERGENCY_ADMIN_EMAIL:-${MEDITRACE_EMERGENCY_ADMIN_EMAIL:-}}"
VITE_EMERGENCY_ADMIN_FIRST_NAME_VALUE="${VITE_EMERGENCY_ADMIN_FIRST_NAME:-Admin}"
VITE_EMERGENCY_ADMIN_LAST_NAME_VALUE="${VITE_EMERGENCY_ADMIN_LAST_NAME:-Emergenza}"
VITE_EMERGENCY_ADMIN_GITHUB_TOKEN_VALUE="${VITE_EMERGENCY_ADMIN_GITHUB_TOKEN:-${MEDITRACE_GITHUB_PAT:-}}"

mkdir -p "$(dirname "$OUTPUT_FILE")"

cat > "$OUTPUT_FILE" <<EOF
# Auto-generated by pwa/scripts/setup-production-deploy.sh
# Source: $ENV_FILE
# Do not commit this file.

VITE_BASE_URL=${VITE_BASE_URL_VALUE}
VITE_SUPABASE_URL=${VITE_SUPABASE_URL_VALUE}
VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY_VALUE}
VITE_SUPABASE_REDIRECT_TO=${VITE_SUPABASE_REDIRECT_TO_VALUE}
VITE_VAPID_PUBLIC_KEY=${VITE_VAPID_PUBLIC_KEY_VALUE}

VITE_EMERGENCY_ADMIN_ENABLED=${VITE_EMERGENCY_ADMIN_ENABLED_VALUE}
VITE_EMERGENCY_ADMIN_USERNAME=${VITE_EMERGENCY_ADMIN_USERNAME_VALUE}
VITE_EMERGENCY_ADMIN_PASSWORD=${VITE_EMERGENCY_ADMIN_PASSWORD_VALUE}
VITE_EMERGENCY_ADMIN_EMAIL=${VITE_EMERGENCY_ADMIN_EMAIL_VALUE}
VITE_EMERGENCY_ADMIN_FIRST_NAME=${VITE_EMERGENCY_ADMIN_FIRST_NAME_VALUE}
VITE_EMERGENCY_ADMIN_LAST_NAME=${VITE_EMERGENCY_ADMIN_LAST_NAME_VALUE}
VITE_EMERGENCY_ADMIN_GITHUB_TOKEN=${VITE_EMERGENCY_ADMIN_GITHUB_TOKEN_VALUE}
EOF

echo "[ok] Wrote $OUTPUT_FILE"
echo "[info] Emergency admin enabled: $VITE_EMERGENCY_ADMIN_ENABLED_VALUE"
echo "[info] Supabase redirect URL: ${VITE_SUPABASE_REDIRECT_TO_VALUE:-<not set>}"

if [[ "$SYNC_LOCAL_ENV" == "1" ]]; then
  cp "$OUTPUT_FILE" "$LOCAL_ENV_FILE"
  echo "[ok] Synced $LOCAL_ENV_FILE"
fi

if [[ "$SET_GH" == "1" ]]; then
  require_cmd gh
  if ! gh auth status >/dev/null 2>&1; then
    echo "[error] gh CLI is not authenticated. Run: gh auth login"
    exit 1
  fi

  echo "[info] Syncing GitHub Variables/Secrets for production deploy..."
  set_repo_variable "VITE_BASE_URL" "$VITE_BASE_URL_VALUE"
  set_required_repo_variable "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL_VALUE"
  set_required_repo_variable "VITE_SUPABASE_PUBLISHABLE_KEY" "$VITE_SUPABASE_PUBLISHABLE_KEY_VALUE"
  set_repo_variable "VITE_SUPABASE_REDIRECT_TO" "$VITE_SUPABASE_REDIRECT_TO_VALUE"
  set_repo_variable "VITE_VAPID_PUBLIC_KEY" "$VITE_VAPID_PUBLIC_KEY_VALUE"
  set_repo_variable "VITE_EMERGENCY_ADMIN_ENABLED" "$VITE_EMERGENCY_ADMIN_ENABLED_VALUE"
  set_repo_variable "VITE_EMERGENCY_ADMIN_USERNAME" "$VITE_EMERGENCY_ADMIN_USERNAME_VALUE"
  set_repo_variable "VITE_EMERGENCY_ADMIN_EMAIL" "$VITE_EMERGENCY_ADMIN_EMAIL_VALUE"
  set_repo_variable "VITE_EMERGENCY_ADMIN_FIRST_NAME" "$VITE_EMERGENCY_ADMIN_FIRST_NAME_VALUE"
  set_repo_variable "VITE_EMERGENCY_ADMIN_LAST_NAME" "$VITE_EMERGENCY_ADMIN_LAST_NAME_VALUE"
  set_repo_secret "VITE_EMERGENCY_ADMIN_PASSWORD" "$VITE_EMERGENCY_ADMIN_PASSWORD_VALUE"
  set_repo_secret "VITE_EMERGENCY_ADMIN_GITHUB_TOKEN" "$VITE_EMERGENCY_ADMIN_GITHUB_TOKEN_VALUE"
fi

if [[ "$RUN_BUILD" == "1" ]]; then
  require_cmd npm
  echo "[info] Running production build..."
  npm --prefix "$ROOT_DIR/pwa" run build
fi

if [[ "$TRIGGER_DEPLOY" == "1" ]]; then
  require_cmd gh
  if ! gh auth status >/dev/null 2>&1; then
    echo "[error] gh CLI is not authenticated. Run: gh auth login"
    exit 1
  fi
  echo "[info] Triggering workflow: Deploy PWA su GitHub Pages"
  gh workflow run ".github/workflows/deploy-pwa.yml"
  echo "[ok] Deploy workflow triggered"
fi

echo "[done] Production setup completed."
