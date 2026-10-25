# Changelog

## 2026-10-25

- Security: updated Next.js 16.3.8 → 16.4.3 (critical remote-code-execution and denial-of-service advisories), React 19.2.8 → 19.3.1, Zod → 4.6.7, and the test stack to Vitest 5, Vite 8, `@vitejs/plugin-react` 6, jsdom 29 and jest-dom 7. `npm audit` now reports 0 vulnerabilities. ESLint stays on 9 and TypeScript on 6.0 until Next's lint plugins support newer majors. `vitest.config.ts` is now `vitest.config.mts` for Vite 8's ESM config loader.
- `./run.sh` no longer needs MinIO. The dev API saves uploads on disk in `.dev-data/uploads` and serves them itself (private files only through 15-minute signed links). Set `STORAGE_DRIVER=minio` in `.env` to use MinIO as before; it now starts only in that case.
- Fixed in the dev API: the overview's "Recent activity" feed showed every audit entry to every role; now roles without `audit:read` see only their own actions plus CMS and CRM changes. A JSON body that is not an object (e.g. `null`) and badly encoded URLs now get 400 instead of 500.
- Added [api_doc.md](api_doc.md): every endpoint with method, request, response and required role.
- `run.sh` fixes: `./run.sh start` now starts Mailpit and the API too (before, it served only the dashboard, so nobody could sign in) and says to build first when there is no build; settings given on the command line (e.g. `STORAGE_DRIVER=minio ./run.sh`) now override `.env` instead of being ignored; the API health check no longer needs `curl`; no misleading "stopped" message when start-up fails early.
- `npm run dev:smoke` also checks private-file links, the activity-feed scoping and the new 400 responses.

## 2026-10-18

- `./run.sh` now starts the whole local stack: Mailpit and MinIO in Docker, a local dev API on :4000 and the dashboard on :3000. It creates `.env` from `.env.example` with random local secrets and prints the seeded sign-in accounts.
- Added `dev-api/`, a loopback-only API that serves the dashboard's contracts (email-code sign-in, CMS, CRM, engagements, findings, retests, media, users, audit log, account) so pages no longer fail with "API could not be reached" or "not connected". Report PDFs and certificates still return 501.
- `API_MODE=backend` runs a local `cyenetic-backend` checkout instead, with PostgreSQL and Redis.
- Dev-only: image fields and CSP accept local MinIO `http://localhost` URLs; production builds stay https-only.
- The dashboard dev and start scripts use port 3000.

## 2026-10-11

- Rebuilt the Blog, Case Studies and Team editors. Blog posts gain subtitle, cover image, publish date, a Markdown editor with toolbar, inline images and safe preview, tags, author and SEO fields. Case studies follow the new company / requirements / engagement / quotes / reviews structure with reorderable repeatable groups. Team profiles gain photo upload, department, certifications, skills, extra links and a show-on-site switch.
- Lists search every descriptive field, show thumbnails, offer Edit and Delete (archive with confirmation; published items need the title typed) and let team members be reordered. Added `on_hold` and `approved` statuses. The backend schema must be updated to match (see docs/IMPLEMENTATION_STATUS.md).
- Built the full admin.md design: responsive shell with sidebar, mobile drawer and command palette; dark and light themes; overview, content and media, CRM, War-Room operations, governance and account workspaces.
- Replaced token-entry login with email + password and a 6-digit code emailed by the API, plus forgot/reset password and invite acceptance. Documented the API and SMTP contract the backend must implement.
- Added typed Zod adapters per module, an RBAC permission matrix, refresh-and-retry session handling and a "not connected" state for missing API modules.
- Added a tested CVSS 3.1 calculator and CVSS 4.0 vector validation.
- Added browser tests for sign-in, every workspace and missing modules on desktop and mobile. Recorded design decisions in docs/DECISIONS.md.

## 2026-10-03

- Initialized independent repository with local architecture/design reference, adapted AGENTS/CLAUDE/developer/onboarding documentation and explicit implementation status.
- Added authenticated, versioned CMS integration for services, posts, case studies, report metadata and team profiles, plus published catalog reads and audit snapshots.
- Preserved catalog-driven service domains and subdomains; marked remaining CRM, engagement and delivery integrations as pending.
- Added locked test dependencies, executable architecture checks, reusable GitHub CI, opt-in SSH deployment, non-root Docker image and health checks.
- Patched runtime dependency advisories; documented the dashboard's remaining development-only lint dependency advisory.
- Verified local demo integration, unit/API tests, PostgreSQL concurrency/audit behavior, desktop/mobile browser publishing, and production builds. See docs/VALIDATION.md for repository-specific evidence.
