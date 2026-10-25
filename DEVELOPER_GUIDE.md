# Dashboard Developer Guide

## Structure

- `app/`: route composition, metadata, root layout and error boundaries.
- `components/`: staff gate, formatting helpers and `ui/` primitives (buttons, fields, drawer, data list, charts, OTP input, tabs); no feature imports.
- `features/auth/`: sign-in (credentials, then emailed code), forgot/reset password and invite acceptance.
- `features/navigation/`: sidebar, top bar, mobile drawer, command palette (Ctrl/⌘K) and the nav map with permissions.
- `features/dashboard/`, `content/`, `media/`, `crm/`, `ops/`, `governance/`, `account/`: one folder per admin.md module.
- `providers/`: memory-only auth session with refresh-and-retry (`AuthProvider`), theme (`ThemeProvider`, `theme.ts`) and `useResource`.
- `services/`: `http.ts` transport and error envelope, one Zod-validated adapter per module, `permissions.ts` RBAC matrix and the tested `cvss.ts`. Components never fetch directly.
- `tests/`: desktop/mobile Playwright scenarios; unit tests are colocated with their features.
- `proxy.ts`: per-request nonce/CSP and private cache policy; no API authorization is delegated to it.
- `dev-api/`: local-only Node API used by `./run.sh` (JSON-file store, SMTP to Mailpit, uploads on local disk by default or in MinIO with `STORAGE_DRIVER=minio`). It reuses `services/content.schema.ts`, `permissions.ts`, `cvss.ts` and `ops.schema.ts` so validation and RBAC match the dashboard. It is excluded from the Docker image and is not a production backend.
- `compose.dev.yaml`: Mailpit for local development, MinIO under the `minio` profile (only with `STORAGE_DRIVER=minio`), and PostgreSQL and Redis under the `backend` profile.
- `api_doc.md`: every API endpoint with its request, response and required role. Update it whenever a contract in `services/` or `dev-api/` changes.

Public frontend, API and client portal remain separate repositories/applications. The dashboard consumes HTTP APIs and does not access PostgreSQL or host Next.js API routes.

## Routes and workflow

`/login` takes email and password, then the emailed 6-digit code. `/forgot-password`, `/reset-password/[token]` and `/invite/[token]` finish the account lifecycle. `/` is the overview. `/content/[kind]` handles services, posts, case-studies, reports and team; `/content/media` is the media library. `/crm/inquiries`, `/crm/report-downloads` and `/crm/newsletter` cover growth. `/ops/engagements`, `/ops/findings`, `/ops/retests` and `/ops/certificates` cover War-Room operations. `/governance/users` and `/governance/audit-log` are Super Admin pages. `/account` holds profile, password and sessions. `/growth` and `/engagements` redirect to their new homes.

A screen whose endpoint answers 404 or 501 shows "API module not connected". Do not replace that with sample data.

New records use version 0; responses update the optimistic version. A stale edit receives 409 and must be reloaded before retrying. Slugs become read-only after creation. Service data has its own slug, standards and subDomains array; it must match the record slug. No four-domain limit or build-time catalog whitelist exists.

Content Editors can save draft/in_review records only. Security Auditors read CMS content. The backend always enforces these permissions independently. Client Viewer is not a staff session. Featured posts are limited to two published records by backend policy. Archiving hides a record publicly without deleting its history; the list's Delete action archives after a confirmation. `on_hold` and `approved` are editorial states that stay private. Markdown previews use `components/Markdown.tsx`, which builds React elements only, drops non-web links and non-https images, and never renders raw HTML. `scheduled` currently stays hidden until an administrator explicitly publishes; no worker is running.

## Design rules

The unmodified `design/index.html` is the design authority. `app/globals.css` preserves every embedded @font-face declaration and the existing ring/dot cursor styles. Fonts are Space Grotesk, Anton and JetBrains Mono; `tailwind.config.ts` owns exact Cyenetic/CVSS colors and is loaded via Tailwind 4 @config. Use black backgrounds, orange highlights, sharp borders, mono labels and Anton headings. Keep responsive grids, keyboard labels/focus and reduced-motion alternatives. Avoid remote font requests or unrelated component libraries. Colours are CSS variables in `globals.css` with dark (default) and `[data-theme=light]` sets; use the semantic Tailwind names (`canvas`, `surface`, `ink`, `muted`, `accent`, `danger`…) rather than raw hex.

## Identity, CSP and runtime

`NEXT_PUBLIC_API_URL` is public configuration and is compiled into client assets. Set it before building; never put secrets in NEXT_PUBLIC variables. Outside production builds, image fields and the CSP also accept `http://localhost` / `http://127.0.0.1` URLs so uploads served by the local dev API (or local MinIO) preview and save; production builds accept https only.

Sign-in is email + password, then a code the API emails over SMTP ([contract](docs/AUTH_EMAIL_OTP.md)). The dashboard never creates or sends the code. The access token stays in memory; the API's HttpOnly refresh cookie restores sessions, and a 401 triggers one shared refresh and a retry. Only the theme choice uses localStorage. A pre-paint nonced script applies the theme to avoid a flash. UI gates do not protect data; every private backend request requires authorization. Put the deployed dashboard behind Cloudflare Access as an additional control.

The dynamic root layout and proxy issue per-request script nonces. Production script CSP does not allow unsafe-inline/unsafe-eval; development allows eval for tooling. Styles permit inline styles for framework/template compatibility. The CSP permits the configured API origin and embedded font data. No private staff response should be cached publicly. Production must use HTTPS.

## Test and release

`npm run check:architecture` checks folder boundaries, explicit any types, transport location and file size, then generates route types and checks TypeScript. Vitest covers the content editor and CVSS 3.1 scores against known vectors. Playwright mocks the API in `tests/mockApi.ts` and `tests/fixtures.ts` and covers sign-in with the emailed code, publishing, sign-out, every workspace without horizontal overflow, and the missing-module state. Backend tests exercise authorization/persistence separately; mocked browser tests are not a substitute.

The production build uses Webpack to match the verified frontend build path. Docker uses standalone output, a non-root user and a /login health check. CI installs locked dependencies before every check. Deployment is opt-in; read [DEPLOYMENT.md](docs/DEPLOYMENT.md). Update matching API/client schema definitions together and record changes in CHANGELOG.

## Dependency audit note (2026-10-25)

`npm audit` reports no vulnerabilities, production or development, after updating Next.js to 16.4.3 (fixes critical remote-code-execution advisories GHSA-2464-fhr4-w9xw and GHSA-673q-mjm6-r5xr, and the Server Actions denial of service GHSA-p3m5-59mp-jv5r), React to 19.3.1, Zod to 4.6.7 and the Vitest/Vite test stack to Vitest 5 / Vite 8. The earlier development-only `braces` advisory is gone from the tree.

Two tools stay one major behind on purpose: ESLint stays on 9 because `eslint-plugin-react`, `eslint-plugin-import` and `eslint-plugin-jsx-a11y` (used by `eslint-config-next`) do not support ESLint 10 yet, and TypeScript stays on 6.0 because `typescript-eslint` supports TypeScript below 6.1 only. `@types/node` stays on 22 to match the Node 22 runtime. Neither ships in the production image.
