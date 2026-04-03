#!/usr/bin/env bash
set -euo pipefail

# MediTrace Web API smoke test (9 contract actions)
# Usage:
#   WEB_APP_URL="https://script.google.com/macros/s/XXXX/exec" API_KEY="your-key" ./smoke-test-api.sh
# Optional:
#   GUEST_ID, REMINDER_ID, DRUG_ID, THERAPY_ID, OPERATOR_ID
#   SMOKE_MODE=fixture|strict (default: fixture)

# Strip leading/trailing whitespace and carriage returns (common when copy-pasting into GitHub Secrets)
WEB_APP_URL="${WEB_APP_URL:-}"
WEB_APP_URL="${WEB_APP_URL#"${WEB_APP_URL%%[! $'\t'$'\r'$'\n']*}"}"  # ltrim
WEB_APP_URL="${WEB_APP_URL%"${WEB_APP_URL##*[! $'\t'$'\r'$'\n']}"}"  # rtrim
API_KEY="${API_KEY:-}"
API_KEY="${API_KEY#"${API_KEY%%[! $'\t'$'\r'$'\n']*}"}"
API_KEY="${API_KEY%"${API_KEY##*[! $'\t'$'\r'$'\n']}"}"
SMOKE_MODE="${SMOKE_MODE:-fixture}"

if [[ "$#" -gt 0 ]]; then
  while [[ "$#" -gt 0 ]]; do
    case "$1" in
      --mode)
        if [[ "$#" -lt 2 ]]; then
          echo "Missing value for --mode (expected: fixture|strict)" >&2
          exit 1
        fi
        SMOKE_MODE="$2"
        shift 2
        ;;
      *)
        echo "Unknown argument: $1" >&2
        echo "Usage: ./smoke-test-api.sh [--mode fixture|strict]" >&2
        exit 1
        ;;
    esac
  done
fi

if [[ "${SMOKE_MODE}" != "fixture" && "${SMOKE_MODE}" != "strict" ]]; then
  echo "Invalid SMOKE_MODE '${SMOKE_MODE}'. Allowed values: fixture, strict." >&2
  exit 1
fi

if [[ -z "${WEB_APP_URL}" || -z "${API_KEY}" ]]; then
  echo "Missing WEB_APP_URL or API_KEY."
  echo "Example: WEB_APP_URL='https://script.google.com/macros/s/XXXX/exec' API_KEY='secret' ./smoke-test-api.sh"
  exit 1
fi

if [[ "${WEB_APP_URL}" == *"XXXX"* || "${WEB_APP_URL}" == *"REPLACE_WITH"* || "${API_KEY}" == "your-api-key" || "${API_KEY}" == *"REPLACE_WITH"* ]]; then
  echo "Placeholder WEB_APP_URL/API_KEY detected." >&2
  echo "Set a real Web App URL and API key before running." >&2
  exit 1
fi

if [[ "${WEB_APP_URL}" != https://script.google.com/macros/s/*/exec ]]; then
  echo "WEB_APP_URL format looks invalid: ${WEB_APP_URL}" >&2
  echo "Expected format: https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec" >&2
  exit 1
fi

NOW_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
FROM_UTC="$(date -u -v-1H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d '1 hour ago' +"%Y-%m-%dT%H:%M:%SZ")"
TO_UTC="$(date -u -v+1H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d '1 hour' +"%Y-%m-%dT%H:%M:%SZ")"

RID_BASE="req-$(date -u +"%Y%m%d%H%M%S")-$RANDOM"
OPERATOR_ID="${OPERATOR_ID:-op-smoke-01}"
DRUG_ID="${DRUG_ID:-drug-smoke-01}"
THERAPY_ID="${THERAPY_ID:-th-smoke-01}"
GUEST_ID="${GUEST_ID:-guest-smoke-01}"
REMINDER_ID="${REMINDER_ID:-rem-smoke-01}"
STOCK_ITEM_ID="stock-smoke-01"
LAST_RESPONSE=""

print_header() {
  local title="$1"
  echo
  echo "============================================================"
  echo "$title"
  echo "============================================================"
}

call_get() {
  local label="$1"
  local query="$2"
  print_header "$label"
  perform_request "GET" "${WEB_APP_URL}?apiKey=${API_KEY}&${query}" ""
}

call_post() {
  local label="$1"
  local query="$2"
  local body="$3"
  print_header "$label"
  perform_request "POST" "${WEB_APP_URL}?${query}" "$body"
}

perform_request() {
  local method="$1"
  local url="$2"
  local body="$3"
  local response_file
  local headers_file
  response_file="$(mktemp)"
  headers_file="$(mktemp)"

  local status_and_type
  if [[ "$method" == "GET" ]]; then
    status_and_type="$(curl -sS -L -D "$headers_file" -o "$response_file" -w "%{http_code}|%{content_type}|%{url_effective}" "$url")"
  else
    status_and_type="$(curl -sS -L -D "$headers_file" -o "$response_file" -w "%{http_code}|%{content_type}|%{url_effective}" -H "Content-Type: application/json" "$url" -d "$body")"
  fi

  local http_code="${status_and_type%%|*}"
  local rest="${status_and_type#*|}"
  local content_type="${rest%%|*}"
  local effective_url="${rest#*|}"
  local response_text
  local location_header
  local allow_header
  response_text="$(cat "$response_file")"
  location_header="$(grep -i '^Location:' "$headers_file" | tail -n 1 | sed 's/^[Ll]ocation:[[:space:]]*//' | tr -d '\r' || true)"
  allow_header="$(grep -i '^Allow:' "$headers_file" | tail -n 1 | sed 's/^[Aa]llow:[[:space:]]*//' | tr -d '\r' || true)"
  rm -f "$response_file"
  rm -f "$headers_file"

  if [[ "${effective_url}" == *"accounts.google.com"* || "${location_header}" == *"accounts.google.com"* ]]; then
    echo "HTTP ${http_code} redirect to Google login detected." >&2
    echo "The Web App deployment is not publicly callable by curl with API key only." >&2
    echo "Fix: Deploy > Manage deployments > Edit Web app > Who has access: Anyone (or Anyone with Google account)." >&2
    echo "Then create a new version and re-run the smoke test." >&2
    exit 1
  fi

  if [[ "${http_code}" -lt 200 || "${http_code}" -gt 299 ]]; then
    if [[ "${method}" == "POST" && "${http_code}" == "405" && "${allow_header}" == *"GET"* && "${allow_header}" != *"POST"* ]]; then
      echo "HTTP 405: deployment accepts GET but not POST." >&2
      echo "Likely cause: current deployed version does not include doPost(e)." >&2
      echo "Fix: in Apps Script, ensure MediTraceApi.gs defines doPost(e), then create a NEW deployment version and update URL if needed." >&2
      exit 1
    fi

    echo "HTTP ${http_code}" >&2
    echo "${response_text}" >&2
    exit 1
  fi

  if [[ "${content_type}" != application/json* ]]; then
    if [[ "${response_text}" == *"Foglio non trovato:"* || "${response_text}" == *"Sheet not found:"* ]]; then
      echo "Runtime error: one or more required Google Sheets tabs are missing." >&2
      echo "Fix: run initializeCurrentWorkbookFromTemplates() from MediTraceAutomation.gs on the same bound spreadsheet." >&2
      echo "Then run applyWorkbookHardeningToCurrent() and retry the smoke test." >&2
      echo "Required tabs: CatalogoFarmaci, ConfezioniMagazzino, TerapieAttive, Movimenti, PromemoriaSomministrazioni, Operatori, SyncLog, AuditLogCentrale." >&2
      exit 1
    fi

    if [[ "${response_text}" == *"Funzione script non trovata: doGet"* || "${response_text}" == *"Script function not found: doGet"* ]]; then
      echo "Deployment reached, but doGet is missing in the deployed script version." >&2
      echo "Fix: ensure MediTraceApi.gs is in the Apps Script project, save, create a NEW version, and redeploy Web App." >&2
      exit 1
    fi

    if [[ "${response_text}" == *"Funzione script non trovata: doPost"* || "${response_text}" == *"Script function not found: doPost"* ]]; then
      echo "Deployment reached, but doPost is missing in the deployed script version." >&2
      echo "Fix: ensure MediTraceApi.gs is in the Apps Script project, save, create a NEW version, and redeploy Web App." >&2
      exit 1
    fi

    echo "Non-JSON response detected (Content-Type: ${content_type})." >&2
    echo "This usually means wrong deployment URL or deployment access settings." >&2
    echo "Response preview:" >&2
    echo "${response_text}" | head -c 600 >&2
    echo >&2
    exit 1
  fi

  if [[ "${response_text}" != \{* ]]; then
    echo "Unexpected response format (expected JSON object)." >&2
    echo "${response_text}" >&2
    exit 1
  fi

  LAST_RESPONSE="${response_text}"
  echo "${response_text}" | tee /dev/stderr >/dev/null
}

extract_first_reminder_id() {
  local response_text="$1"
  echo "${response_text}" | grep -o '"reminderId":"[^"]*"' | head -n 1 | cut -d '"' -f 4
}

# 1) GET pull
call_get "1) GET action=pull" "action=pull&since=${FROM_UTC}"

# 2) POST push
call_post "2) POST action=push" "action=push" "{
  \"apiKey\": \"${API_KEY}\",
  \"requestId\": \"${RID_BASE}-push\",
  \"deviceId\": \"android-smoke-01\",
  \"items\": [
    {
      \"entity\": \"movement\",
      \"id\": \"mov-smoke-01\",
      \"updatedAt\": \"${NOW_UTC}\",
      \"payload\": {
        \"stock_item_id\": \"${STOCK_ITEM_ID}\",
        \"drug_id\": \"${DRUG_ID}\",
        \"guest_id\": \"${GUEST_ID}\",
        \"tipo_movimento\": \"SCARICO\",
        \"quantita\": 1,
        \"unita_misura\": \"compressa\",
        \"causale\": \"smoke-test\",
        \"data_movimento\": \"${NOW_UTC}\",
        \"settimana_riferimento\": \"2026-W13\",
        \"operatore\": \"SMOKE\",
        \"source\": \"APP\"
      }
    }
  ]
}"

# 3) GET operators_list
call_get "3) GET action=operators_list" "action=operators_list&active=true"

# 4) POST operator_upsert
call_post "4) POST action=operator_upsert" "action=operator_upsert" "{
  \"apiKey\": \"${API_KEY}\",
  \"requestId\": \"${RID_BASE}-operator\",
  \"operator\": {
    \"operatorId\": \"${OPERATOR_ID}\",
    \"operatorCode\": \"SMK\",
    \"displayName\": \"Smoke Test Operator\",
    \"active\": true,
    \"role\": \"volontario\"
  }
}"

# 5) GET reminders_due
call_get "5) GET action=reminders_due" "action=reminders_due&from=${FROM_UTC}&to=${TO_UTC}&status=DA_ESEGUIRE,POSTICIPATO"

if [[ "${SMOKE_MODE}" == "fixture" ]]; then
  # 6) POST push reminder fixture (ensures reminder_update has a target row)
  call_post "6) POST action=push (reminder fixture)" "action=push" "{
    \"apiKey\": \"${API_KEY}\",
    \"requestId\": \"${RID_BASE}-push-reminder\",
    \"deviceId\": \"android-smoke-01\",
    \"items\": [
      {
        \"entity\": \"reminder\",
        \"id\": \"${REMINDER_ID}\",
        \"updatedAt\": \"${NOW_UTC}\",
        \"payload\": {
          \"reminder_id\": \"${REMINDER_ID}\",
          \"guest_id\": \"${GUEST_ID}\",
          \"therapy_id\": \"${THERAPY_ID}\",
          \"drug_id\": \"${DRUG_ID}\",
          \"scheduled_at\": \"${NOW_UTC}\",
          \"stato\": \"DA_ESEGUIRE\",
          \"note\": \"smoke reminder fixture\",
          \"updated_at\": \"${NOW_UTC}\"
        }
      }
    ]
  }"
else
  REMINDER_FROM_DUE="$(extract_first_reminder_id "${LAST_RESPONSE}" || true)"
  if [[ -n "${REMINDER_FROM_DUE}" ]]; then
    REMINDER_ID="${REMINDER_FROM_DUE}"
    echo "Strict mode: using existing due reminder '${REMINDER_ID}' from action=reminders_due." >&2
  else
    echo "Strict mode: no due reminder found in action=reminders_due result." >&2
    echo "Set REMINDER_ID to an existing row or run with SMOKE_MODE=fixture." >&2
    exit 1
  fi
fi

if [[ "${SMOKE_MODE}" == "fixture" ]]; then
  REMINDER_UPDATE_STEP_LABEL="7"
  THERAPY_STEP_LABEL="8"
  DRUG_STEP_LABEL="9"
  AUDIT_STEP_LABEL="10"
else
  REMINDER_UPDATE_STEP_LABEL="6"
  THERAPY_STEP_LABEL="7"
  DRUG_STEP_LABEL="8"
  AUDIT_STEP_LABEL="9"
fi

# reminder_update
call_post "${REMINDER_UPDATE_STEP_LABEL}) POST action=reminder_update" "action=reminder_update" "{
  \"apiKey\": \"${API_KEY}\",
  \"requestId\": \"${RID_BASE}-reminder\",
  \"operator\": \"SMK\",
  \"operatorId\": \"${OPERATOR_ID}\",
  \"reminder\": {
    \"reminderId\": \"${REMINDER_ID}\",
    \"status\": \"POSTICIPATO\",
    \"executedAt\": \"${NOW_UTC}\",
    \"note\": \"smoke test\"
  }
}"

# therapy_upsert
call_post "${THERAPY_STEP_LABEL}) POST action=therapy_upsert" "action=therapy_upsert" "{
  \"apiKey\": \"${API_KEY}\",
  \"requestId\": \"${RID_BASE}-therapy\",
  \"operator\": \"SMK\",
  \"operatorId\": \"${OPERATOR_ID}\",
  \"therapy\": {
    \"therapyId\": \"${THERAPY_ID}\",
    \"guestId\": \"${GUEST_ID}\",
    \"drugId\": \"${DRUG_ID}\",
    \"dosePerAdministration\": \"1\",
    \"unitDose\": \"compressa\",
    \"administrationsPerDay\": 2,
    \"weeklyAverage\": 14,
    \"startDate\": \"2026-03-01\",
    \"endDate\": null,
    \"active\": true,
    \"notes\": \"smoke test upsert\"
  }
}"

# drug_upsert
call_post "${DRUG_STEP_LABEL}) POST action=drug_upsert" "action=drug_upsert" "{
  \"apiKey\": \"${API_KEY}\",
  \"requestId\": \"${RID_BASE}-drug\",
  \"operator\": \"SMK\",
  \"operatorId\": \"${OPERATOR_ID}\",
  \"drug\": {
    \"drugId\": \"${DRUG_ID}\",
      \"action\": \"SYNC_EVENT\",
    \"classeTerapeutica\": \"Generico\",
    \"defaultMinStock\": 10,
    \"supplier\": \"Deposito\",
    \"notes\": \"smoke test\"
  }
}"

# audit_log
call_post "${AUDIT_STEP_LABEL}) POST action=audit_log" "action=audit_log" "{
  \"apiKey\": \"${API_KEY}\",
  \"requestId\": \"${RID_BASE}-audit\",
  \"operator\": \"SMK\",
  \"operatorId\": \"${OPERATOR_ID}\",
  \"deviceId\": \"android-smoke-01\",
  \"audit\": {
    \"action\": \"SYNC_EVENT\",
    \"entityType\": \"SmokeTest\",
    \"entityId\": \"audit-smoke-01\",
    \"patientId\": \"${GUEST_ID}\",
    \"before\": {
      \"status\": \"before\"
    },
    \"after\": {
      \"status\": \"after\"
    },
    \"outcome\": \"OK\",
    \"source\": \"APP\"
  }
}"

echo
print_header "Smoke test completed"
