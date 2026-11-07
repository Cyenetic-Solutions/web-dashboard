#!/usr/bin/env bash
set -euo pipefail
umask 077

# deploy-config.sh is prepended over stdin by deploy.sh.
DEPLOY_PATH="$1"; COMPOSE_FILE="$2"; COMPOSE_PROJECT_NAME="$3"
APP_IMAGE_NAME="$4"; COMMIT_SHA="$5"; RELEASE_SUFFIX="$6"
NEXT_PUBLIC_API_URL="$7"
validate_release_config
validate_dashboard_config
export COMPOSE_PROJECT_NAME APP_IMAGE_NAME
export APP_IMAGE_TAG="$COMMIT_SHA" NEXT_PUBLIC_API_URL
release_id="$COMMIT_SHA-$RELEASE_SUFFIX"
archive="/tmp/cyenetic-$COMPOSE_PROJECT_NAME-$release_id.tar.gz"
trap 'rm -f -- "$archive"' EXIT
[[ ! -L "$DEPLOY_PATH" ]] || { echo 'Deployment root must not be a symlink' >&2; exit 1; }
mkdir -p "$DEPLOY_PATH"
[[ -w "$DEPLOY_PATH" ]] || { echo 'Deployment root is not writable by VPS_USER' >&2; exit 1; }
exec 9>"$DEPLOY_PATH/.deploy.lock"
flock -n 9 || { echo 'Another deployment is already running' >&2; exit 1; }
[[ ! -e "$DEPLOY_PATH/current" || -L "$DEPLOY_PATH/current" ]] || {
  echo 'current must be a release symlink, not a directory or file' >&2; exit 1;
}
docker info >/dev/null
docker compose version >/dev/null
docker network inspect traefik-proxy >/dev/null
release_dir="$DEPLOY_PATH/releases/$release_id"
mkdir -p "$DEPLOY_PATH/releases"
mkdir "$release_dir"
tar --no-same-owner --same-permissions -xzf "$archive" -C "$release_dir"
[[ -f "$release_dir/$COMPOSE_FILE" && -f "$release_dir/scripts/rollout.sh" ]] || {
  echo 'Release archive is missing deployment files' >&2; exit 1;
}
# The existing root and dotenv files stay intact. Runtime values are never baked into images.
compose_args=(--project-name "$COMPOSE_PROJECT_NAME")
for file in "$DEPLOY_PATH/.env" "$DEPLOY_PATH/.env.production"; do
  if [[ -e "$file" ]]; then
    [[ -r "$file" ]] || { echo 'Runtime environment file is unreadable' >&2; exit 1; }
    compose_args+=(--env-file "$file")
  fi
done
printf 'APP_IMAGE_NAME=%s\nAPP_IMAGE_TAG=%s\nCOMPOSE_PROJECT_NAME=%s\nNEXT_PUBLIC_API_URL=%s\n' \
  "$APP_IMAGE_NAME" "$COMMIT_SHA" "$COMPOSE_PROJECT_NAME" "$NEXT_PUBLIC_API_URL" > "$release_dir/.deploy.env"
compose_args+=(--env-file "$release_dir/.deploy.env" -f "$release_dir/$COMPOSE_FILE")
bash "$release_dir/scripts/rollout.sh" "$APP_IMAGE_NAME:$COMMIT_SHA" "${compose_args[@]}"
ln -s "releases/$release_id" "$DEPLOY_PATH/.current-$release_id"
mv -Tf "$DEPLOY_PATH/.current-$release_id" "$DEPLOY_PATH/current"
# Keep previous source/image releases for recovery; never prune unrelated projects.
