#!/usr/bin/env bash
set -euo pipefail

image="cyenetic-dashboard-container-check:$$"
container="cyenetic-dashboard-container-check-$$"
context=$(mktemp -d)
cleanup() {
  local result=$?
  trap - EXIT
  if (( result != 0 )); then docker logs --tail 100 "$container" >&2 || true; fi
  docker rm -f "$container" >/dev/null 2>&1 || true
  docker image rm "$image" >/dev/null 2>&1 || true
  rm -rf -- "$context"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

git archive "${1:-HEAD}" | tar --no-same-owner --same-permissions -x -C "$context"
docker build --tag "$image" --build-arg NEXT_PUBLIC_API_URL=https://api.cyenetic.com "$context"
docker run -d --name "$container" -p 127.0.0.1:3212:3000 "$image" >/dev/null

ready=false
for ((attempt=0; attempt<60; attempt++)); do
  state=$(docker inspect --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$container")
  case "$state" in
    'running healthy') ready=true; break ;;
    'running starting') sleep 2 ;;
    *) echo "Container failed readiness: $state" >&2; exit 1 ;;
  esac
done
"$ready" || { echo 'Container readiness timed out' >&2; exit 1; }
[[ $(docker exec "$container" id -u) == 1001 ]]
curl --fail --silent --show-error --max-time 10 http://127.0.0.1:3212/login >/dev/null
docker stop --time 10 "$container" >/dev/null
[[ $(docker inspect --format '{{.State.Status}}' "$container") == exited ]]
echo 'Container passed: login route, non-root runtime, assets, and shutdown.'
