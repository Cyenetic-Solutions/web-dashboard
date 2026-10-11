# Cyenetic Dashboard

Independent staff dashboard foundation for `admin.cyenetic.com`, using the public site's exact embedded fonts, colors and cursor template. Built with Next.js 16, React 19, strict TypeScript and Tailwind 4.

The dashboard follows `admin.md` and the master architecture: overview, content and media, CRM (inquiry Kanban, report-download leads, newsletter), War-Room operations (engagements, CVSS findings, retests, deliverables, certificates), governance (staff, permissions, audit log) and account settings, in dark and light themes. Staff sign in with email and password, then a 6-digit code emailed by the API. This is not the separate client War-Room portal.

Only the CMS slice works end to end with today's backend. Every other screen calls a typed API contract and says "API module not connected" until the backend serves it. See [implementation status](docs/IMPLEMENTATION_STATUS.md) and the [email code contract](docs/AUTH_EMAIL_OTP.md).

## Run locally

Requires Node.js 22 and npm. Start `cyenetic-backend` using its README, then:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3001/login`. Select **Use local demo** and enter the backend's `DEMO_LOGIN_KEY` from its `.env` (the example is `local-demo-change-this-key`). Create a service record, set its payload slug to match the record slug, and publish as the demo administrator. The backend public catalog now exposes it. Data in demo mode disappears when the API restarts.

Real sign-in needs the backend's email-code endpoints and SMTP settings described in [AUTH_EMAIL_OTP.md](docs/AUTH_EMAIL_OTP.md); they are not implemented in the API yet. Access tokens stay in tab memory. Production builds disable the demo control.

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

See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md), [implementation status](docs/IMPLEMENTATION_STATUS.md), [deployment](docs/DEPLOYMENT.md), [validation record](docs/VALIDATION.md), [architecture](Cyenetic_Master_Architecture.md), and [agent rules](AGENTS.md). Design choices are recorded in [DECISIONS.md](docs/DECISIONS.md).
