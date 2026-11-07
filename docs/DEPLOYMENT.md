# Dashboard Deployment

Adapted from the frontend's reusable CI + main-branch SSH archive deployment. Nothing is deployed by repository creation.

## GitHub configuration

- Main pushes run `.github/workflows/deploy.yml`, which calls the reusable nextjs.yml CI workflow. Pull requests and test/development branches run CI directly.
- Architecture, real tests, production dependency audit, and build must pass. Every job installs locked dependencies before running commands.
- Set repository variable `ENABLE_DEPLOYMENT=true` only after provisioning the target. Configure the `production` environment and any required reviewers.
- Secrets: `VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_SSH_PRIVATE_KEY`, `VPS_KNOWN_HOSTS`. Use an independently pinned SSH host key; never disable host checking.
- Variables: `DEPLOY_PATH` (default `/opt/web/dashboard`), `COMPOSE_FILE=compose.yaml`, `COMPOSE_PROJECT_NAME=cyenetic-dashboard`, `APP_IMAGE_NAME=cyenetic-dashboard`. `NEXT_PUBLIC_API_URL` is a public build-time API origin, default https://api.cyenetic.com. Changing it requires rebuilding.

## VPS prerequisites

The deployment user must own the chosen directory under `/opt/web` and access Docker without sudo. Provision the external `traefik-proxy` network shared with Traefik and the existing TLS resolver. Configure DNS for `admin.cyenetic.com`. No application host port is published. Keep dashboard access behind Cloudflare Access; TLS/HSTS are edge responsibilities.

The image compiles with demo login disabled. The API URL is public configuration, never a secret. Configure the identity provider before staff access; token-entry bootstrap is supplied, not a full OIDC redirect flow.

## Release behavior and recovery

The workflow packages the exact checked-out commit, validates the release settings, transfers it over pinned SSH, and stages it in a versioned release directory. Runtime `.env` files remain outside the release directory. The configured `NEXT_PUBLIC_API_URL` is passed only to the image build. Compose builds a replacement replica while keeping healthy replicas in service; cutover occurs only after the replacement passes its Docker health check. Failed candidates are removed while old replicas remain available. Do not prune shared-host images globally.

There is no automatic database rollback. On failure old replicas are retained until replacement health succeeds; restore application code by a tested revert and redeploy. Review migrations for backward compatibility across overlapping replicas. Monitor logs without emitting tokens, environment secrets, or sensitive document bodies.
