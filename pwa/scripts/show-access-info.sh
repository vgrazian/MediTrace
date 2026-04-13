#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CREDENTIALS_FILE="$ROOT_DIR/credentials.local.env"
LOCAL_ENV_FILE="$ROOT_DIR/pwa/.env.local"

extract_value() {
  local file="$1"
  local key="$2"
  if [[ ! -f "$file" ]]; then
    return
  fi
  awk -F= -v target="$key" '$1 == target {print substr($0, index($0, "=") + 1)}' "$file" | tail -n 1
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

printf "\nMediTrace Access Info\n"
printf '%s\n' '===================='
printf "App URL (production): %s\n" "$prod_url"
printf "\n"
printf "Primary account\n"
printf '%s\n' '---------------'
printf "username: %s\n" "${admin_user:-N/A}"
printf "password: %s\n" "${admin_pass:-N/A}"
printf "\n"
printf "Demo operators (from credentials.local.env)\n"
printf '%s\n' '-------------------------------------------'

found_demo="0"
for key in \
  MEDITRACE_DEMO_OPERATOR_ROSA \
  MEDITRACE_DEMO_OPERATOR_MARGHERITA \
  MEDITRACE_DEMO_OPERATOR_GIGLIO; do
  user="$(extract_value "$CREDENTIALS_FILE" "${key}_USERNAME")"
  pass="$(extract_value "$CREDENTIALS_FILE" "${key}_PASSWORD")"
  if [[ -n "$user" || -n "$pass" ]]; then
    printf "%s -> username: %s | password: %s\n" "$key" "${user:-N/A}" "${pass:-N/A}"
    found_demo="1"
  fi
done

if [[ "$found_demo" == "0" ]]; then
  printf "No demo operator credentials found in %s\n" "$CREDENTIALS_FILE"
fi

printf "\nLocal files used\n"
printf '%s\n' '----------------'
printf '%s\n' "- $LOCAL_ENV_FILE"
printf '%s\n' "- $CREDENTIALS_FILE"
printf "\n"
