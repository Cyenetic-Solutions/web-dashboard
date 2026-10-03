# Cyenetic Dashboard

Independent staff dashboard foundation for `admin.cyenetic.com`, using the public site's exact embedded fonts, colors and cursor template. Built with Next.js 16, React 19, strict TypeScript and Tailwind 4.

The connected workflow is a schema-validated CMS for dynamic services, posts, case studies, report metadata and team profiles, with server-enforced permissions and an audit viewer. CRM and engagement workspaces explicitly show their pending status. This is not the separate client War-Room portal.

## Run locally

Requires Node.js 22 and npm. Start `cyenetic-backend` using its README, then:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3001/login`. Select **Use local demo** and enter the backend's `DEMO_LOGIN_KEY` from its `.env` (the example is `local-demo-change-this-key`). Create a service record, set its payload slug to match the record slug, and publish as the demo administrator. The backend public catalog now exposes it. Data in demo mode disappears when the API restarts.

For real mode, configure an MFA identity provider on the backend and connect a short-lived RS256 access token. Interactive OIDC sign-in is pending. The bootstrap credential form stores tokens only in tab memory; refreshing or signing out clears the UI session. Production builds disable the demo control.

## Checks

```sh
npm run lint
npm run check:architecture
npm run test:run
npx playwright install chromium
npm run test:e2e
npm run build
npm audit --omit=dev --audit-level=high
```

Playwright starts its own server on port 3101 and tests desktop/mobile publishing and logout against a mocked API boundary. Backend authorization and PostgreSQL behavior are tested in the API repository.

See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md), [implementation status](docs/IMPLEMENTATION_STATUS.md), [deployment](docs/DEPLOYMENT.md), [validation record](docs/VALIDATION.md), [architecture](Cyenetic_Master_Architecture.md), and [agent rules](AGENTS.md). The CMS currently uses a technical JSON payload editor. Rich editing, uploads, CRM, newsletter and engagement operations remain implementation work.
