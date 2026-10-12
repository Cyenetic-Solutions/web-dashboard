#!/usr/bin/env bash
#
# run.sh — launch the Cyenetic staff dashboard (Next.js 16 / React 19).
#
# Usage:
#   ./run.sh            Start the dev server (default) on http://localhost:3001
#   ./run.sh dev        Same as above
#   ./run.sh build      Production build (Webpack)
#   ./run.sh start      Serve the production build on http://localhost:3001
#   ./run.sh prod       build + start
#
# The script installs dependencies on first run and creates .env.local from
# .env.example if it is missing. It does NOT start cyenetic-backend; sign-in
# needs that running separately (see README.md).

set -euo pipefail

cd "$(dirname "$0")"

MODE="${1:-dev}"

# --- Node version check (package.json requires >=22) -------------------------
REQUIRED_MAJOR=22
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$NODE_MAJOR" -lt "$REQUIRED_MAJOR" ]; then
    echo "WARNING: Node $(node -v) detected; this project expects Node >=${REQUIRED_MAJOR}." >&2
    echo "         Use nvm (\`nvm use\`, see .nvmrc) or install Node 22+ if the build fails." >&2
  fi
else
  echo "ERROR: node is not installed. Install Node.js >=${REQUIRED_MAJOR}." >&2
  exit 1
fi

# --- Environment file --------------------------------------------------------
if [ ! -f .env.local ]; then
  echo "Creating .env.local from .env.example ..."
  cp .env.example .env.local
fi

# --- Dependencies ------------------------------------------------------------
if [ ! -d node_modules ]; then
  echo "Installing dependencies (npm ci) ..."
  npm ci
fi

# --- Run ---------------------------------------------------------------------
case "$MODE" in
  dev)
    echo "Starting dev server on http://localhost:3001/login"
    exec npm run dev
    ;;
  build)
    exec npm run build
    ;;
  start)
    echo "Serving production build on http://localhost:3001/login"
    exec npm run start
    ;;
  prod)
    npm run build
    echo "Serving production build on http://localhost:3001/login"
    exec npm run start
    ;;
  *)
    echo "Unknown mode: $MODE" >&2
    echo "Usage: ./run.sh [dev|build|start|prod]" >&2
    exit 1
    ;;
esac
