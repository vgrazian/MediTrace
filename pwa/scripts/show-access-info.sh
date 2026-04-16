#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CREDENTIALS_FILE="$ROOT_DIR/credentials.local.env"
LOCAL_ENV_FILE="$ROOT_DIR/pwa/.env.local"

extract_value() {
  local file="$1"
  local key="$2"
  local value
  if [[ ! -f "$file" ]]; then
    return
  fi
  value="$(awk -F= -v target="$key" '$1 == target {print substr($0, index($0, "=") + 1)}' "$file" | tail -n 1)"
  # Strip wrapping double quotes often used in .env values.
  if [[ "$value" == '"'*'"' ]]; then
    value="${value#\"}"
    value="${value%\"}"
  fi
  printf '%s' "$value"
}

base_url="$(extract_value "$LOCAL_ENV_FILE" "VITE_BASE_URL")"
if [[ -z "$base_url" ]]; then
  base_url="/MediTrace/"
fi

prod_url="https://vgrazian.github.io${base_url}#/"

admin_user="$(extract_value "$LOCAL_ENV_FILE" "VITE_EMERGENCY_ADMIN_USERNAME")"
admin_pass="$(extract_value "$LOCAL_ENV_FILE" "VITE_EMERGENCY_ADMIN_PASSWORD")"
if [[ -z "$admin_user" ]]; then
  admin_user="$(extract_value "$CREDENTIALS_FILE" "MEDITRACE_EMERGENCY_ADMIN_USERNAME")"
fi
if [[ -z "$admin_pass" ]]; then
  admin_pass="$(extract_value "$CREDENTIALS_FILE" "MEDITRACE_EMERGENCY_ADMIN_PASSWORD")"
fi

default_admin_user="$(extract_value "$CREDENTIALS_FILE" "MEDITRACE_DEFAULT_ADMIN_USERNAME")"
default_admin_pass="$(extract_value "$CREDENTIALS_FILE" "MEDITRACE_DEFAULT_ADMIN_PASSWORD")"

printf "\nMediTrace Access Info\n"
printf '%s\n' '===================='
printf "App URL (production): %s\n" "$prod_url"
printf "\n"
printf "Primary emergency account (local/ops)\n"
printf '%s\n' '-----------------------------------'
printf "username: %s\n" "${admin_user:-N/A}"
printf "password: %s\n" "${admin_pass:-N/A}"
printf "\n"
printf "Default online users (current provisioning)\n"
printf '%s\n' '-------------------------------------'
printf "admin      -> username: %s | password: %s\n" "${default_admin_user:-N/A}" "${default_admin_pass:-N/A}"

for i in 1 2 3 4 5; do
  user="$(extract_value "$CREDENTIALS_FILE" "MEDITRACE_DEFAULT_OPERATOR${i}_USERNAME")"
  pass="$(extract_value "$CREDENTIALS_FILE" "MEDITRACE_DEFAULT_OPERATOR${i}_PASSWORD")"
  printf "operatore%s -> username: %s | password: %s\n" "$i" "${user:-N/A}" "${pass:-N/A}"
done

printf "\nLocal files used\n"
printf '%s\n' '----------------'
printf '%s\n' "- $LOCAL_ENV_FILE"
printf '%s\n' "- $CREDENTIALS_FILE"
printf "\n"
