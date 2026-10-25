#!/usr/bin/env bash
#
# run.sh — start the whole Cyenetic admin stack on your machine.
#
#   ./run.sh            Mailpit (Docker), the API on :4000 and the dashboard on :3000.
#                       Uploads are saved on disk in .dev-data/uploads. Set STORAGE_DRIVER=minio in .env to use MinIO instead.
#   ./run.sh stop       Stop the Docker services (data is kept)
#   ./run.sh reset      Stop everything and delete local data (dev API records, uploads, MinIO files, mail)
#   ./run.sh build      Production build of the dashboard (Webpack)
#   ./run.sh start      Serve that production build on :3000 (API and services still need ./run.sh)
#
# Settings live in .env (created from .env.example on first run). Sign-in accounts are the
# DEV_*_EMAIL / DEV_*_PASSWORD values there; sign-in codes arrive in Mailpit at http://localhost:8025.

set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(pwd)"
MODE="${1:-dev}"

say()  { printf '\033[1;33m[run]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[run] %s\033[0m\n' "$*" >&2; exit 1; }

# --- Node --------------------------------------------------------------------
command -v node >/dev/null 2>&1 || fail "Node.js 22+ is required (see .nvmrc)."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 22 ] || fail "Node $(node -v) found; this project needs Node 22+ (try: nvm use)."

# --- .env --------------------------------------------------------------------
if [ ! -f .env ]; then
  say "Creating .env from .env.example"
  cp .env.example .env
fi
# Replace placeholder secrets with random values (only the ones still set to the placeholder).
node -e '
  const fs = require("fs"); const crypto = require("crypto");
  const text = fs.readFileSync(".env", "utf8");
  const next = text.replace(/^([A-Z0-9_]+)=generate-on-first-run$/gm, (_, key) => `${key}=${crypto.randomBytes(24).toString("hex")}`);
  if (next !== text) { fs.writeFileSync(".env", next); console.log("[run] Generated local secrets in .env"); }
'
set -a
# shellcheck disable=SC1091
. ./.env
set +a
PORT="${PORT:-3000}"
DEV_API_PORT="${DEV_API_PORT:-4000}"
API_MODE="${API_MODE:-devapi}"
STORAGE_DRIVER="${STORAGE_DRIVER:-local}"
case "$STORAGE_DRIVER" in local|minio) ;; *) fail "STORAGE_DRIVER must be local or minio (it is '$STORAGE_DRIVER')." ;; esac
export STORAGE_DRIVER

# --- Dependencies --------------------------------------------------------------
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  say "Installing dependencies (npm ci)"
  npm ci
fi

compose() {
  if docker compose version >/dev/null 2>&1; then docker compose -f compose.dev.yaml "$@";
  elif command -v docker-compose >/dev/null 2>&1; then docker-compose -f compose.dev.yaml "$@";
  else fail "Docker Compose is required for Mailpit. Install Docker Desktop (or set SKIP_DOCKER=1 if you run Mailpit yourself)."; fi
}
profiles() {
  if [ "$STORAGE_DRIVER" = "minio" ]; then printf '%s ' --profile minio; fi
  if [ "$API_MODE" = "backend" ]; then printf '%s ' --profile backend; fi
}

case "$MODE" in
  stop)  compose --profile minio --profile backend down; say "Docker services stopped. Data is kept."; exit 0 ;;
  reset) compose --profile minio --profile backend down -v; rm -rf .dev-data; say "Local data deleted."; exit 0 ;;
  build) exec node node_modules/next/dist/bin/next build --webpack ;;
  start) exec node node_modules/next/dist/bin/next start --port "$PORT" ;;
  dev) ;;
  *) fail "Unknown mode '$MODE'. Use: ./run.sh [dev|stop|reset|build|start]" ;;
esac

port_busy() { node -e 'const s=require("net").createServer();s.once("error",()=>process.exit(0));s.once("listening",()=>s.close(()=>process.exit(1)));s.listen(Number(process.argv[1]),"127.0.0.1")' "$1"; }
for p in "$PORT" "$DEV_API_PORT"; do
  if port_busy "$p"; then fail "Port $p is already in use. Stop whatever is using it (or change PORT / DEV_API_PORT in .env)."; fi
done

# --- Docker services -----------------------------------------------------------
if [ "${SKIP_DOCKER:-0}" != "1" ]; then
  command -v docker >/dev/null 2>&1 || fail "Docker is required for Mailpit (the inbox for sign-in codes). Install Docker Desktop and start it."
  docker info >/dev/null 2>&1 || fail "Docker is installed but not running. Start Docker Desktop, then run ./run.sh again."
  say "Starting Docker services: Mailpit$( [ "$STORAGE_DRIVER" = minio ] && echo ', MinIO')$( [ "$API_MODE" = backend ] && echo ', PostgreSQL, Redis')"
  # shellcheck disable=SC2046
  compose $(profiles) up -d --wait
fi

# --- API -----------------------------------------------------------------------
PIDS=()
cleanup() {
  trap - EXIT INT TERM
  for pid in "${PIDS[@]:-}"; do [ -n "$pid" ] && kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
  say "Stopped the API and dashboard. Docker services keep running; use ./run.sh stop to stop them."
}
trap cleanup EXIT INT TERM

if [ "$API_MODE" = "backend" ]; then
  [ -d "$BACKEND_DIR" ] || fail "API_MODE=backend but BACKEND_DIR=$BACKEND_DIR does not exist. Clone cyenetic-backend there or set API_MODE=devapi."
  export DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT:-5432}/${POSTGRES_DB}"
  export REDIS_URL="redis://127.0.0.1:${REDIS_PORT:-6379}"
  export CORS_ORIGIN="$DASHBOARD_URL" CORS_ORIGINS="$DASHBOARD_URL"
  say "Starting cyenetic-backend from $BACKEND_DIR on :$DEV_API_PORT ($BACKEND_CMD)"
  ( cd "$BACKEND_DIR" && { [ -d node_modules ] || npm ci; } && PORT="$DEV_API_PORT" exec bash -c "$BACKEND_CMD" ) &
  PIDS+=("$!")
  say "Note: seed the DEV_* accounts into the backend database with its own seed script; run.sh cannot do that for an external repo."
else
  say "Starting the local dev API on :$DEV_API_PORT"
  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --disable-warning=ExperimentalWarning dev-api/server.mjs &
  PIDS+=("$!")
fi

for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${DEV_API_PORT}/health" >/dev/null 2>&1; then break; fi
  kill -0 "${PIDS[0]}" 2>/dev/null || fail "The API exited during start-up. See the log above."
  sleep 0.5
done
curl -fsS "http://127.0.0.1:${DEV_API_PORT}/health" >/dev/null 2>&1 || say "The API did not answer /health yet; continuing."

# --- Dashboard -----------------------------------------------------------------
say "Starting the dashboard on :$PORT"
NODE_OPTIONS="${NODE_OPTIONS:-} --disable-warning=MODULE_TYPELESS_PACKAGE_JSON" node node_modules/next/dist/bin/next dev --port "$PORT" &
PIDS+=("$!")

cat <<EOF

  Dashboard   ${DASHBOARD_URL}/login
  API         http://localhost:${DEV_API_PORT}
  Mail inbox  http://localhost:${MAILPIT_UI_PORT:-8025}   (sign-in codes arrive here)
  Uploads     $( [ "$STORAGE_DRIVER" = minio ] && echo "MinIO console http://localhost:${MINIO_CONSOLE_PORT:-9001} (user ${S3_ACCESS_KEY}, password = S3_SECRET_KEY in .env)" || echo "saved on disk in .dev-data/uploads (STORAGE_DRIVER=minio to use MinIO)")

  Sign in as  ${DEV_ADMIN_EMAIL} / ${DEV_ADMIN_PASSWORD}   (Super Admin)
              ${DEV_EDITOR_EMAIL} / ${DEV_EDITOR_PASSWORD}   (Content Editor)
              ${DEV_AUDITOR_EMAIL} / ${DEV_AUDITOR_PASSWORD}   (Security Auditor)

  Press Ctrl+C to stop.

EOF

# Exit (and stop the other process) as soon as either the API or the dashboard stops.
# A polling loop instead of `wait -n`, which the bash 3.2 shipped with macOS does not support.
while kill -0 "${PIDS[0]}" 2>/dev/null && kill -0 "${PIDS[1]}" 2>/dev/null; do sleep 1; done
