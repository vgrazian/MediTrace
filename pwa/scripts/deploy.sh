#!/usr/bin/env bash
set -euo pipefail
# deploy.sh — Build e deploy manuale su GitHub Pages (gh-pages)
#
# PREREQUISITI:
#   - pwa/.env.production.local configurato con tutte le variabili (vedi .env.example)
#   - git authenticated con GitHub
#
# USO: bash pwa/scripts/deploy.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PWA_DIR="$ROOT_DIR/pwa"

echo "=== MediTrace Deploy ==="
echo ""

# 1. Verifica .env.production.local
if [[ ! -f "$PWA_DIR/.env.production.local" ]]; then
  echo "[error] Manca pwa/.env.production.local"
  echo "        Copia da pwa/.env.example e compila con i valori reali."
  echo "        Le variabili pubbliche sono leggibili con: gh variable list"
  exit 1
fi

# 2. Build
echo "[1/3] Build di produzione..."
cd "$PWA_DIR"
npm run build
echo ""

# 3. Commit temporaneo del dist (necessario per git subtree split)
echo "[2/3] Commit temporaneo dist..."
cd "$ROOT_DIR"
git add pwa/dist/ -f
git commit -m "build: dist $(date -u +%Y-%m-%dT%H:%M:%SZ)" || echo "[info] Nessuna modifica al dist"

# 4. Push su gh-pages
echo "[3/3] Push su gh-pages..."
git push origin "$(git subtree split --prefix pwa/dist main)":gh-pages --force
echo ""

# 5. Pulizia: rimuovi commit dist da main
git reset --soft HEAD~1
git reset HEAD pwa/dist/

echo "=== Deploy completato ==="
echo "URL: https://vgrazian.github.io/MediTrace/"
echo ""
echo "NOTA: Se vedi pagina bianca, apri in incognito o fai Cmd+Shift+R"
echo "      (il Service Worker potrebbe cachare la vecchia versione)"
