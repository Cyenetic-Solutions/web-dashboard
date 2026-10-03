# Architecture implementation status

These repositories establish the backend/dashboard foundations and one connected CMS workflow. They do **not** implement the entire master architecture yet. No deployment or external provider account is created by this setup.

| Architecture area | Current implementation | Still needed |
| --- | --- | --- |
| Runtime and topology | Independent Fastify API and Next.js staff dashboard; Docker and CI | Hosted PostgreSQL/Redis, TLS/proxy, Cloudflare Access and observability provisioning |
| Identity and RBAC | Server-side JWT/JWKS verification, issuer/audience/expiry/MFA checks; staff roles; explicit loopback demo | Interactive OIDC authorization-code/PKCE login, refresh/logout/revocation and staff invitation lifecycle |
| Content CMS | Validated create/read/update/archive; optimistic versions; immutable snapshots; draft/review/scheduled/published/archived statuses | Rich TipTap editor, scheduled publication worker, revision comparison/restoration and product-specific forms |
| Dynamic services | Editable domain and subdomain arrays; published catalog endpoint compatible with frontend | Frontend environment wiring and coordinated schema evolution |
| Posts | Required metadata/Markdown, maximum two published featured posts | Safe Markdown rendering integration, previews and assets |
| Case studies | Four-part structure, client moniker flag and severity counters | Redaction review workflow, private video storage/processing and signed access |
| Team | Profile metadata, designation, ordering and archive | Asset uploads and dedicated profile editor |
| Reports | Metadata and gated flag only | Private R2/S3 upload, scanning, thumbnails, expiring download tokens and lead verification |
| Audit/persistence | PostgreSQL transactions, migrations, DB-level append-only audit trigger; Redis production rate limiting | Tenant RLS before client data, scoped DB provisioning, backups, retention and offsite/tamper-evident audit export |
| Growth/CRM | Explicitly pending dashboard workspace | Inquiry intake, Turnstile, corporate email validation, Kanban, webhooks, lead/download analytics |
| Newsletter | No send or subscribe endpoint | Double opt-in, suppression, SES/Resend, BullMQ workers and deliverability setup |
| Engagements/War-Room | Explicitly pending staff workspace | Projects, tenant isolation, CVSS findings, video proof, retests, E2EE, separate client portal |
| Certificates | No verification or signing endpoint | Immutable issued/revoked registry and actual cryptographic verification |
| Testing/delivery | Unit/API tests, PostgreSQL concurrency/audit tests, responsive dashboard E2E; reusable CI and opt-in deployment | Load tests, full provider integration tests and independent security review |

The local demo uses memory and loses its records on restart. It is visibly marked and cannot bind externally or run in production. Real mode requires the configured database and MFA identity provider; there is no silent in-memory or authentication fallback. Dashboard tokens stay in tab memory and disappear on refresh. The bootstrap token form is an integration tool, not the finished staff sign-in experience.

Published CMS responses are intentionally public. Do not put confidential findings, private client identity, credentials, or executable MDX in CMS content. Case-study monikers must be selected before publication; the current metadata flag cannot automatically redact prose.

No tenant-facing persistence has been implemented. Do not add client-portal access until tenant identity, RLS policies, object isolation, and corresponding cross-tenant denial tests exist. The audit database trigger protects normal application writes, not a malicious database owner; use separate least-privilege migration/runtime roles.
