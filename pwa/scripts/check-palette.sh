#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PATTERN="#0f766e|#115e59|#14532d|#10b981|#16a34a|#22c55e|#15803d|#dcfce7|#bbf7d0|#86efac|#4ade80"

if rg -n "$PATTERN" src public --glob '*.{css,vue,js,svg,html}'; then
  echo "\nPalette check FAILED: trovati toni verdi non consentiti nella UI."
  exit 1
fi

echo "Palette check OK: nessuna traccia verde bloccata rilevata."
