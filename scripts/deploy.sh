#!/usr/bin/env bash
set -euo pipefail
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source "$script_dir/deploy-config.sh"
: "${RUNNER_TEMP:?RUNNER_TEMP is required}" "${COMMIT_SHA:?COMMIT_SHA is required}"
RELEASE_SUFFIX="${GITHUB_RUN_ID:?GITHUB_RUN_ID is required}-${GITHUB_RUN_ATTEMPT:?GITHUB_RUN_ATTEMPT is required}"
SSH_KEY_FILE="$RUNNER_TEMP/cyenetic-ssh/id_ed25519"
SSH_KNOWN_HOSTS_FILE="$RUNNER_TEMP/cyenetic-ssh/known_hosts"
validate_release_config
validate_ssh_config
validate_dashboard_config
[[ $(git rev-parse HEAD) == "$COMMIT_SHA" ]] || { echo 'Checkout must match the tested commit' >&2; exit 1; }
ssh-keygen -y -P '' -f "$SSH_KEY_FILE" >/dev/null
release_id="$COMMIT_SHA-$RELEASE_SUFFIX"
local_archive="$RUNNER_TEMP/release-$release_id.tar.gz"
remote_archive="/tmp/cyenetic-$COMPOSE_PROJECT_NAME-$release_id.tar.gz"
trap 'rm -f -- "$local_archive"' EXIT
git archive --format=tar.gz --output="$local_archive" "$COMMIT_SHA"
ssh_options=(-F /dev/null -i "$SSH_KEY_FILE" -o BatchMode=yes -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$SSH_KNOWN_HOSTS_FILE")
scp_host="$VPS_HOST"
[[ "$scp_host" != *:* ]] || scp_host="[$scp_host]"
scp "${ssh_options[@]}" -P "$VPS_PORT" "$local_archive" "$VPS_USER@$scp_host:$remote_archive"
args=("$DEPLOY_PATH" "$COMPOSE_FILE" "$COMPOSE_PROJECT_NAME" "$APP_IMAGE_NAME" "$COMMIT_SHA" "$RELEASE_SUFFIX" "$NEXT_PUBLIC_API_URL")
printf -v remote_args ' %q' "${args[@]}"
# Pass data as positional arguments, avoiding nested interpolation of a remote shell program.
cat "$script_dir/deploy-config.sh" "$script_dir/deploy-remote.sh" |
  ssh "${ssh_options[@]}" -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "bash -s --$remote_args"
