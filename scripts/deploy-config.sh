#!/usr/bin/env bash

# Shared validation runs before transport and again on the VPS. Never source dotenv files.
validate_release_config() {
  [[ "$DEPLOY_PATH" =~ ^/opt/web/[A-Za-z0-9_-][A-Za-z0-9._-]*$ ]] &&
    [[ "${DEPLOY_PATH##*/}" != "." && "${DEPLOY_PATH##*/}" != ".." ]] || {
    echo 'DEPLOY_PATH must be one safe directory below /opt/web' >&2; return 1;
  }
  [[ "$COMPOSE_FILE" =~ ^[A-Za-z0-9_-][A-Za-z0-9._-]*\.ya?ml$ ]] || {
    echo 'COMPOSE_FILE must be a safe YAML filename' >&2; return 1;
  }
  [[ "$COMPOSE_PROJECT_NAME" =~ ^[a-z0-9][a-z0-9_-]*$ ]] || {
    echo 'Invalid COMPOSE_PROJECT_NAME' >&2; return 1;
  }
  [[ "$APP_IMAGE_NAME" =~ ^[a-z0-9]+(([.]|_|__|-+)[a-z0-9]+)*$ ]] || {
    echo 'Invalid APP_IMAGE_NAME' >&2; return 1;
  }
  [[ "$COMMIT_SHA" =~ ^[0-9a-f]{40}$ && "$RELEASE_SUFFIX" =~ ^[0-9]+-[0-9]+$ ]] || {
    echo 'Invalid commit or release attempt identifier' >&2; return 1;
  }
}

validate_ssh_config() {
  [[ "$VPS_USER" =~ ^[A-Za-z0-9_][A-Za-z0-9_-]*$ ]] || {
    echo 'Invalid VPS_USER' >&2; return 1;
  }
  [[ "$VPS_HOST" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*$ || "$VPS_HOST" =~ ^[0-9a-fA-F:]+:[0-9a-fA-F:]+$ ]] || {
    echo 'VPS_HOST must be a hostname, IPv4 address, or unbracketed IPv6 address' >&2; return 1;
  }
  [[ "$VPS_PORT" =~ ^[0-9]{1,5}$ ]] && (( 10#$VPS_PORT > 0 && 10#$VPS_PORT <= 65535 )) || {
    echo 'VPS_PORT must be between 1 and 65535' >&2; return 1;
  }
  [[ -s "$SSH_KEY_FILE" && -s "$SSH_KNOWN_HOSTS_FILE" ]] || {
    echo 'Deployment SSH key and known-hosts file must both be supplied' >&2; return 1;
  }
}

validate_dashboard_config() {
  case "$NEXT_PUBLIC_API_URL" in
    https://?*) ;;
    *) echo 'NEXT_PUBLIC_API_URL must be an HTTPS URL' >&2; return 1 ;;
  esac
  case "$NEXT_PUBLIC_API_URL" in
    *[!A-Za-z0-9:/.?\&=_+-]*) echo 'NEXT_PUBLIC_API_URL contains unsafe characters' >&2; return 1 ;;
  esac
  [[ "$NEXT_PUBLIC_API_URL" != */../* && "$NEXT_PUBLIC_API_URL" != *$'\n'* ]] || {
    echo 'NEXT_PUBLIC_API_URL must be a safe HTTPS URL' >&2; return 1;
  }
}
