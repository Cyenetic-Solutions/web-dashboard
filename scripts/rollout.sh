#!/usr/bin/env bash
set -euo pipefail

# Only this project's app replicas may be touched. Preserve existing replicas until healthy.
expected_image="$1"; shift
: "${COMPOSE_PROJECT_NAME:?COMPOSE_PROJECT_NAME is required}"
[[ "$COMPOSE_PROJECT_NAME" =~ ^[a-z0-9][a-z0-9_-]*$ ]] || exit 1
compose=(docker compose "$@")
filters=(--filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME" --filter label=com.docker.compose.service=app)
existing_output=$(docker ps -aq "${filters[@]}")
existing=(); [[ -z "$existing_output" ]] || mapfile -t existing <<< "$existing_output"
old_output=$(docker ps -q "${filters[@]}")
old=(); [[ -z "$old_output" ]] || mapfile -t old <<< "$old_output"
preserve_new=false

new_ids() {
  local output candidate known found
  output=$(docker ps -aq "${filters[@]}") || return 1
  while IFS= read -r candidate; do
    [[ -n "$candidate" ]] || continue
    found=false
    for known in "${existing[@]}"; do [[ "$candidate" != "$known" ]] || found=true; done
    "$found" || printf '%s\n' "$candidate"
  done <<< "$output"
}

cleanup() {
  local result=$? output id
  trap - EXIT
  if (( result != 0 )) && ! "$preserve_new"; then
    output=$(new_ids) || output=''
    while IFS= read -r id; do
      [[ -n "$id" ]] || continue
      docker logs --tail 50 "$id" >&2 || true
      docker rm -f "$id" >/dev/null || true
    done <<< "$output"
    echo 'Rollout failed; previous replicas were preserved.' >&2
  fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

"${compose[@]}" config --quiet
"${compose[@]}" build app
# Remove only stopped app replicas, including failed candidates from earlier attempts.
for status in created exited dead; do
  stale=$(docker ps -aq "${filters[@]}" --filter "status=$status")
  if [[ -n "$stale" ]]; then
    mapfile -t stale_ids <<< "$stale"
    docker rm "${stale_ids[@]}" >/dev/null
  fi
done
"${compose[@]}" up -d --no-recreate --no-build --scale "app=$((${#old[@]} + 1))" app
output=$(new_ids)
[[ -n "$output" ]] || { echo 'Compose did not create a replacement replica' >&2; exit 1; }
mapfile -t replacements <<< "$output"

for id in "${replacements[@]}"; do
  actual_image=$(docker inspect --format '{{.Config.Image}}' "$id")
  [[ "$actual_image" == "$expected_image" ]] || { echo 'Replacement uses the wrong release image' >&2; exit 1; }
  ready=false
  for ((attempt=0; attempt<60; attempt++)); do
    state=$(docker inspect --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$id")
    case "$state" in
      'running healthy') ready=true; break ;;
      'running starting'|'created starting') sleep 2 ;;
      *) echo "Replacement is not ready: $state" >&2; exit 1 ;;
    esac
  done
  "$ready" || { echo 'Replacement health check timed out' >&2; exit 1; }
done
# Allow routing discovery, then verify it did not become unhealthy during that interval.
sleep 5
for id in "${replacements[@]}"; do
  [[ $(docker inspect --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$id") == 'running healthy' ]] || {
    echo 'Replacement became unhealthy before cutover' >&2; exit 1;
  }
done
preserve_new=true
if (( ${#old[@]} > 0 )); then
  docker stop --time 30 "${old[@]}"
  docker rm "${old[@]}"
fi
printf 'Healthy release ready: %s\n' "$expected_image"
