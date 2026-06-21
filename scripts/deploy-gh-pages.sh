#!/bin/bash
# Deploy MediTrace to GitHub Pages (gh-pages branch)
# Usage: ./scripts/deploy-gh-pages.sh

set -euo pipefail
cd "$(dirname "$0")/.."

echo "🔨 Building with base=/MediTrace/..."
VITE_BASE_URL=/MediTrace/ npx vite build

echo "📦 Syncing dist/ to gh-pages root..."
cp pwa/dist/index.html index.html
cp pwa/dist/manifest.webmanifest manifest.webmanifest
cp pwa/dist/sw.js sw.js
cp pwa/dist/favicon.svg favicon.svg
cp -r pwa/dist/assets/* assets/
cp -r pwa/dist/icons/* icons/ 2>/dev/null || true
cp pwa/dist/workbox-*.js . 2>/dev/null || true

echo "✅ Build synced. Ready to commit and push."
echo "   Run: git add -A && git commit -m 'deploy: ...' && git push origin gh-pages"
