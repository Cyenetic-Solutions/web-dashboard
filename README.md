# Cyenetic Dashboard

Independent staff dashboard foundation for `admin.cyenetic.com`, using the public site's exact embedded fonts, colors and cursor template. Built with Next.js 16, React 19, strict TypeScript and Tailwind 4.

The dashboard follows `admin.md` and the master architecture: overview, content and media, CRM (inquiry Kanban, report-download leads, newsletter), War-Room operations (engagements, CVSS findings, retests, deliverables, certificates), governance (staff, permissions, audit log) and account settings, in dark and light themes. Staff sign in with email and password, then a 6-digit code emailed by the API. This is not the separate client War-Room portal.

Only the CMS slice works end to end with today's backend. Every other screen calls a typed API contract and says "API module not connected" until the backend serves it. See [implementation status](docs/IMPLEMENTATION_STATUS.md) and the [email code contract](docs/AUTH_EMAIL_OTP.md).

## Run locally

Requires Node.js 22 and Docker (Docker Desktop on macOS/Windows; only Mailpit runs in Docker). One command starts everything:

```sh
./run.sh
```

| Service | Address | What it is |
| --- | --- | --- |
| Dashboard | http://localhost:3000/login | This Next.js app |
| API | http://localhost:4000 | The bundled local dev API in `dev-api/` |
| Mailpit | http://localhost:8025 | Catches every email; sign-in codes, invites and reset links land here |
| Uploads | `.dev-data/uploads/` | Uploaded files are saved on disk and served by the dev API. Optional: set `STORAGE_DRIVER=minio` in `.env` to use MinIO instead (console http://localhost:9001, user `cyenetic`, password `S3_SECRET_KEY` in `.env`) |

On first run the script copies `.env.example` to `.env`, fills in random local secrets and installs dependencies. Sign in with one of the seeded accounts from `.env`:

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `admin@cyenetic.local` | `Cyenetic-Admin-2026!` |
| Content Editor | `editor@cyenetic.local` | `Cyenetic-Editor-2026!` |
| Security Auditor | `auditor@cyenetic.local` | `Cyenetic-Auditor-2026!` |

Then open Mailpit, read the 6-digit code and type it in. Change the `DEV_*` values in `.env` and restart to use other accounts. Any `.env` setting can also be given for one run on the command line, e.g. `STORAGE_DRIVER=minio ./run.sh`. `./run.sh stop` stops the Docker services, `./run.sh reset` also deletes local data, and `npm run dev:smoke` checks a running stack end to end. `./run.sh build` makes a production build and `./run.sh start` runs the same stack with that build instead of the dev server.

The dev API is **not** `cyenetic-backend`. It exists so the whole dashboard works on one machine: it keeps records in `.dev-data/store.json`, sends real email to Mailpit, stores uploaded files on local disk (or MinIO with `STORAGE_DRIVER=minio`), binds to 127.0.0.1 only and refuses to start with `NODE_ENV=production`. Report PDFs and certificates are not implemented there, so those screens still say "API module not connected". To use a real `cyenetic-backend` checkout instead, set `API_MODE=backend` and `BACKEND_DIR` in `.env`; `run.sh` then also starts PostgreSQL and Redis and passes their URLs, SMTP and S3 settings to it. Seeding accounts into that backend is up to its own scripts.

## Checks

```sh
npm run lint
npm run check:architecture
npm run test:run
npm run test:e2e
npm run build
npm audit --omit=dev --audit-level=high
```

Playwright starts its own server on port 3101 and tests sign-in with the emailed code, publishing, every workspace and the missing-module state on desktop and mobile, against a mocked API boundary. If Chromium is preinstalled elsewhere, set `PLAYWRIGHT_CHROMIUM_PATH`; otherwise run `npx playwright install chromium` once. Backend authorization and PostgreSQL behavior are tested in the API repository.

Every endpoint, request, response and required role is listed in [api_doc.md](api_doc.md).

See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md), [implementation status](docs/IMPLEMENTATION_STATUS.md), [deployment](docs/DEPLOYMENT.md), [validation record](docs/VALIDATION.md), [architecture](Cyenetic_Master_Architecture.md), and [agent rules](AGENTS.md). Design choices are recorded in [DECISIONS.md](docs/DECISIONS.md).
