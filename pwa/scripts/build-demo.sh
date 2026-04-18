#!/bin/bash
# build-demo.sh — build demo version in dist/demo/ with demo seed enabled
set -e

# Build demo version with custom env
VITE_BASE_URL="/MediTrace/demo/" VITE_SEED_DATA=1 VITE_DEV_SEED_ACCOUNT=1 VITE_DEV_SEED_USERNAME=prova VITE_DEV_SEED_PASSWORD=Prova123! VITE_DEV_SEED_GITHUB_TOKEN=github_pat_demo_seed npm run build --prefix $(dirname $0)/..

# Move/copy build to dist/demo
mkdir -p $(dirname $0)/../dist/demo
cp -r $(dirname $0)/../dist/* $(dirname $0)/../dist/demo/
