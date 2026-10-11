# Architecture implementation status

These repositories establish the backend/dashboard foundations and one connected CMS workflow. They do **not** implement the entire master architecture yet. No deployment or external provider account is created by this setup.

| Architecture area | Current implementation | Still needed |
| --- | --- | --- |
| Runtime and topology | Independent Fastify API and Next.js staff dashboard; Docker and CI | Hosted PostgreSQL/Redis, TLS/proxy, Cloudflare Access and observability provisioning |
| Identity and RBAC | Server-side JWT/JWKS verification, issuer/audience/expiry/MFA checks; staff roles; explicit loopback demo. Dashboard: email + password then emailed 6-digit code screens, refresh-cookie session restore, forgot/reset password, invite acceptance, permission matrix | API endpoints for password login, SMTP code delivery, refresh rotation, logout, reset and invites ([contract](AUTH_EMAIL_OTP.md)); passkeys |
| Content CMS | Validated create/read/update/archive; optimistic versions; immutable snapshots; draft/review/scheduled/published/archived statuses | Rich TipTap editor, scheduled publication worker, revision comparison/restoration and product-specific forms |
| Dynamic services | Editable domain and subdomain arrays; published catalog endpoint compatible with frontend | Frontend environment wiring and coordinated schema evolution |
| Posts | Required metadata/Markdown, maximum two published featured posts | Safe Markdown rendering integration, previews and assets |
| Case studies | Four-part structure, client moniker flag and severity counters | Redaction review workflow, private video storage/processing and signed access |
| Team | Profile metadata, designation, ordering and archive | Asset uploads and dedicated profile editor |
| Reports | Metadata and gated flag only | Private R2/S3 upload, scanning, thumbnails, expiring download tokens and lead verification |
| Audit/persistence | PostgreSQL transactions, migrations, DB-level append-only audit trigger; Redis production rate limiting | Tenant RLS before client data, scoped DB provisioning, backups, retention and offsite/tamper-evident audit export |
| Growth/CRM | Dashboard: inquiry Kanban with drag, keyboard moves, notes and conversion; report-download leads by domain; newsletter subscriber list and export | All `/admin/inquiries`, `/admin/report-leads` and `/admin/newsletter` API endpoints; inquiry intake, Turnstile, corporate email validation, webhooks |
| Newsletter | No send or subscribe endpoint; dashboard list/export screens only | Double opt-in, suppression, SES/Resend, BullMQ workers and deliverability setup |
| Engagements/War-Room | Dashboard: engagements, findings matrix and heatmap, CVSS 3.1 calculator (unit-tested), finding editor, retest queue, deliverables panel | All `/admin/engagements`, `/admin/findings`, `/admin/retests` and deliverable API endpoints; Projects, tenant isolation, CVSS findings, video proof, retests, E2EE, separate client portal |
| Certificates | No verification or signing endpoint; dashboard issue/revoke screens call the API only | Immutable issued/revoked registry and actual cryptographic verification |
| Testing/delivery | Unit/API tests, PostgreSQL concurrency/audit tests; dashboard CVSS and editor unit tests and desktop/mobile E2E for sign-in, publishing and every workspace; reusable CI and opt-in deployment | Load tests, full provider integration tests and independent security review |

The local demo uses memory and loses its records on restart. It is visibly marked and cannot bind externally or run in production. Real mode requires the configured database and MFA identity provider; there is no silent in-memory or authentication fallback. Dashboard access tokens stay in tab memory; a reload restores the session only through the API's HttpOnly refresh cookie once that endpoint exists.

## Dashboard screens waiting on the API

The dashboard now has screens for every admin.md module: overview, content and media, CRM, War-Room operations, governance and account. Most of them call endpoints that `cyenetic-backend` does not serve yet. Those screens show "API module not connected" instead of sample data. Only the CMS records, published catalog and legacy audit view work end to end today. Media upload, staff management, sessions, the dashboard summary and audit chain verification also need their API modules. See [DECISIONS.md](DECISIONS.md).

Published CMS responses are intentionally public. Do not put confidential findings, private client identity, credentials, or executable MDX in CMS content. Case-study monikers must be selected before publication; the current metadata flag cannot automatically redact prose.

No tenant-facing persistence has been implemented. Do not add client-portal access until tenant identity, RLS policies, object isolation, and corresponding cross-tenant denial tests exist. The audit database trigger protects normal application writes, not a malicious database owner; use separate least-privilege migration/runtime roles.
