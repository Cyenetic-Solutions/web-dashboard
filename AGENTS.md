# Cyenetic Dashboard — Agent Instructions

## Sources of truth

Read [CLAUDE.md](CLAUDE.md), [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md), and the local [master architecture](Cyenetic_Master_Architecture.md). The architecture describes the target platform; [implementation status](docs/IMPLEMENTATION_STATUS.md) describes the implemented boundary. Explicit user instructions take precedence.

[design/index.html](design/index.html) is the exact public frontend design reference. The dashboard must preserve its typography, sharp geometry, orange/black/white palette, motion, and responsive principles. Do not import another UI template. Backend changes must preserve its API contracts, not introduce presentation code.

The user superseded the architecture's fixed four-service/deep-route model: service domains and their subdomains are catalog records, not a fixed enum. The public frontend currently uses `/services` and `/services/[slug]`. Adding a published domain must not require a code deployment.

## Scope and boundaries

- This independent repository owns the staff dashboard at admin.cyenetic.com. Keep public marketing, staff administration, API, and client portal isolated.
- Use Node.js 22, strict TypeScript, npm and the committed lockfile. Use the installed Next.js 16 App Router, React 19 and Tailwind 4. Read relevant installed Next.js documentation before routing, rendering or caching changes.
- app/ composes routes; components/ is generic; features/ owns domain UI; providers/ owns context; services/ owns external transport and validated contracts. No database or app/api routes. No imports between top-level feature domains; generic components must not import features.
- No explicit `any`, `@ts-ignore`, or unchecked type assertions. Exported contracts need concise JSDoc. Target under 200 lines per handwritten TypeScript file; hard ceiling 250.
- Introduce directories when used; do not create empty placeholders. Keep external calls behind typed adapters. Validate untrusted data at runtime.

## Security and design

- API authorization is mandatory; hiding dashboard controls is not authorization. Verify signed access tokens, issuer, audience, expiry, role and MFA. Never trust role headers or browser-stored roles.
- Demo access is explicitly local-only and cannot run in production. Never commit credentials, private keys, customer evidence, or production `.env` files.
- Keep audit entries append-only and mutation/audit writes atomic. Preserve optimistic version checks. Do not expose draft content or private file URLs through public endpoints.
- Keep exact embedded fonts and cursor behavior from the reference. Use Space Grotesk for body, Anton for display, JetBrains Mono for data; maintain visible keyboard focus, accessible labels and reduced-motion support.
- Do not claim mocks, metadata-only reports, or pending workspaces are production services. Follow the implementation status document.

## Verification and delivery

Run `npm run lint`, `npm run check:architecture`, `npm run test:run`, `npm run test:e2e`, and `npm run build` for relevant changes. Browser tests exercise desktop and mobile; install Chromium with `npx playwright install chromium`. Production dependency audit is a CI gate. Use meaningful behavior tests, not tautological snapshots.

Keep README, developer guide, CHANGELOG and deployment instructions current. CI and deployment follow the frontend pattern, with real dependencies, checks and Docker health checks. Production deployment stays opt-in until its external prerequisites are configured. Do not send external messages, deploy or push without user authorization.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
