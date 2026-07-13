#!/bin/bash
# MediTrace deploy script — builds, commits, pushes to gh-pages, cleans up
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PWA_DIR="$PROJECT_DIR/pwa"

echo "🔨 Building PWA..."
cd "$PWA_DIR"
VITE_BASE_URL=/MediTrace/ npm run build

echo "📦 Committing and pushing..."
cd "$PROJECT_DIR"
git add pwa/dist/ -f
git commit -m "build: dist $(date -u +%Y-%m-%dT%H:%M:%SZ)" || echo "Nothing to commit"

echo "🚀 Deploying to gh-pages..."
git push origin "$(git subtree split --prefix pwa/dist main)":gh-pages --force

echo "🧹 Cleaning up..."
git reset --soft HEAD~1 2>/dev/null || true
git reset HEAD pwa/dist/ 2>/dev/null || true
git checkout -- pwa/dist/ 2>/dev/null || true
git clean -fd pwa/dist/ 2>/dev/null || true

echo "✅ Deploy complete!"
