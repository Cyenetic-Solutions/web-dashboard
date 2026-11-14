# API changes the dashboard needs

This list compares the dashboard (this repository) with `Cyenetic-Solutions/web-backend`, the API at https://api.cyenetic.com. It was written on 2026-11-14 from the five branch archives the project owner supplied. The live server itself could not be reached from the review environment, so every point below comes from reading the code, not from calling the API.

| Branch | Last change | What it is |
| --- | --- | --- |
| `main` | 2026-11-14 | Newest and most complete (92 source files). **Everything below is measured against `main`.** |
| `testing` | 2026-11-07 | Snapshot of the backend with the frontend and an old dashboard copy. Same code as `master` except CORS also allows `FRONTEND_ORIGIN`. |
| `master` | 2026-11-05 | Older layout. Its refresh cookie never works: the controller sets a random hex value as the cookie, but the service only accepts the signed token it stored, so every `/auth/refresh` fails. CORS also omits `PATCH`/`DELETE`. `main` fixed this by returning the refresh token in the body. |
| `feat-mvc-platform-modules` | 2026-10-17 | Early version of the MVC split (65 files). Superseded by `main`. |
| `development` | oldest | Content module only (16 files). Superseded. |

Each item gives the problem, where it is in the backend, and what to change. "Dashboard contract" means the shapes in `services/*.ts` and [api_doc.md](api_doc.md).

## What the dashboard already adapted to

These parts of `main` work, so the dashboard now follows them and they need **no** backend change:

- Sign-in: `challengeId` without `codeRequired`; `verify`/`refresh` return `{ accessToken, refreshToken, expiresInSeconds }`; `refresh`/`logout` take `{ refreshToken }` in the body; `me` returns display role names (`Super Admin`).
- No cookies and no `X-Requested-With` header, so the current CORS settings (`Authorization`, `Content-Type`, no credentials) are enough.
- Errors as `{ error: "message", issues: [{ path, message }] }`: field paths are shown next to the right editor field.
- CMS records saved with the older case-study shape still open in the editor.
- `POST /api/v1/admin/media?purpose=…` (purpose in the query string) and the bare `PATCH /admin/media/:id` response.
- `GET /api/v1/admin/audit-logs` rows (`{ id, actor, action, record, createdAt }`) and `verify-chain` returning `{ supported: false }`.
- `GET /api/v1/admin/account/sessions` as a bare array (revoked and expired rows are hidden).

## 1. Security and data leaks (fix first)

1. **Session lists expose refresh-token hashes.** `GET /api/v1/admin/account/sessions` and `GET /api/v1/admin/users/:id/sessions` return raw `Session` rows including `refreshTokenHash` (`account.controller.ts`, `user.admin.controller.ts` → `auth.listSessions`). Return only `{ id, userAgent, ipAddress, createdAt, lastUsedAt, current }` and leave out revoked and expired sessions.
2. **Role and status changes return the password hash.** `POST /api/v1/admin/users/:id/role` and `/status` return `auth.updateStaff(...)`, which is the full `User` row with `passwordHash` (`auth.service.ts` `updateStaff`). Map it to the same safe projection used by `GET /admin/users`.
3. **"Sign out other sessions" signs out everything.** `DELETE /api/v1/admin/account/sessions` calls `revokeAllSessions(identity.sub, identity.sub)`; the second argument should be the *current session id*, not the user id. The access token has no session id today, so add a `sid` claim when signing it and pass that. Same bug in `DELETE /admin/users/:id/sessions`, which passes the caller's user id.
4. **Content Editors can read private files and engagement data.** Media `readRoles`/`writeRoles` include `Content Editor` for every bucket (`media.controller.ts`), so an editor can list private assets, get signed URLs for finding evidence and upload `finding-video`. Deliverables `readers` also include `Content Editor` (`deliverable.controller.ts`). The dashboard's matrix (`services/permissions.ts`) gives private media and War-Room data to Super Admin and Security Auditor only. Restrict `PRIVATE` purposes and the bucket filter, and drop `Content Editor` from deliverable readers.
5. **Dashboard summary shows findings counts to Content Editors.** `GET /admin/dashboard/summary` returns every metric to every staff role. The dashboard contract allows `null` for metrics a role may not see; return `openCriticalHigh` and `activeEngagements` as `null` for Content Editor.
6. **Refresh token should move to an HttpOnly cookie (target).** Today the dashboard keeps the refresh token in tab memory, so a reload signs staff out (it deliberately does not use `localStorage`). When ready, set it as `cyenetic_refresh` with `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`, read it in `refresh`/`logout`, require `X-Requested-With: cyenetic-admin`, and register CORS with `credentials: true` for the exact dashboard origin and `allowedHeaders` including `X-Requested-With`. Reuse the token the service stored; the `master` branch shows the bug of setting a different random value. Tell the dashboard when this ships; it is a small change in `services/auth.ts`.

## 2. Hosting and email for admin.cyenetic.com

1. Set `DASHBOARD_ORIGIN=https://admin.cyenetic.com` on the production API. CORS only allows that exact origin.
2. **Public media cannot load on the dashboard.** `@fastify/helmet` defaults to `Cross-Origin-Resource-Policy: same-origin`, so `<img src="https://api.cyenetic.com/files/public/…">` is blocked on `admin.cyenetic.com` (and on `cyenetic.com`). Send `Cross-Origin-Resource-Policy: cross-origin` (or `same-site`) on `/files/public/:id`, e.g. `helmet({ crossOriginResourcePolicy: { policy: 'same-site' } })`.
3. **Reset and invite emails carry bare tokens, not links** (`container.ts` `adaptEmailService`). The dashboard pages are `/reset-password/<token>` and `/invite/<token>`. Build the link from the dashboard origin: `${DASHBOARD_ORIGIN}/reset-password/${encodeURIComponent(token)}` and `${DASHBOARD_ORIGIN}/invite/${encodeURIComponent(token)}`.
4. `login` returns `403 MFA enrollment is required before login` when `mfaRequired` is false (`auth.service.ts`). With email codes every account already gets a second factor, so this check blocks accounts for no reason; remove it or invert it.

## 3. CMS content (`/api/v1/admin/content`)

The backend schema (`models/content.model.ts`) still has the 2026-10-03 shape and is `.strict()`, so any save of a post, case study or team member from the current editors fails with `400 Unrecognized key(s)`. Copy the dashboard schema (`services/content.schema.ts`) into the backend:

- **Statuses:** add `on_hold` and `approved`. Both stay private like drafts (the public view already filters to `published`). Content Editors may save `draft`, `in_review` and `on_hold`.
- **posts:** add `cover_image` (`{ url, alt } | null`), `publish_date` (ISO date or null), `tags` (≤10 unique lowercase strings), `author`, `seo_title` (≤70), `seo_description` (≤160).
- **case-studies:** replace `sector`, `engagement`, `challenge`, `scope`, `outcome`, `findings` with `tagline`, `cover_image`, `company_quote`, `company_overview`, `company_address`, `company_size` (`1-10 | 11-50 | 51-200 | 201-1000 | 1000+ | null`), `test_types` (≤12), `requirement_markdown`, `requirement_points` (1–10), `engagement_items` (1–10 `{ title, description }`), `testimonials` (≤4 `{ quote, name, designation, company, photo }`), `reviews` (≤4 `{ name, url }`, https only). Keep reading old rows (non-strict parse) so stored records still load.
- **team:** add `image_alt`, `department`, `certifications` (≤15), `skills` (≤10), `links` (≤5 `{ label, url }`), `show_on_site` (boolean, default true). The public team view must drop members with `show_on_site: false`.
- **Image URLs:** accept `https://` only in production. Public media URLs should point at `/files/public/:id` on the API.
- **Scheduled publishing:** `dashboard.service.ts` reads `publish_date` for upcoming items, but nothing publishes `scheduled` posts. Either add the worker or keep it documented as manual.

## 4. CRM

### Inquiries (`/api/v1/admin/inquiries`)

| Dashboard contract | Backend `main` | Change |
| --- | --- | --- |
| `{ data: … }` on every response | Bare objects and arrays | Wrap in `{ data }` (or tell us to read bare; the dashboard can adapt) |
| Statuses `NEW … LOST` | `new … lost` | Accept and return upper case, or agree on lower case and the dashboard maps |
| `source`: `CONTACT_FORM`, `ESTIMATOR`, `MANUAL` | `contact`, `estimator`, `manual` | Same |
| `POST /admin/inquiries` body `{ fullName, workEmail, company?, scopeDetails? }` | `{ full_name, work_email, … }` snake case, strict | Accept camelCase like every other admin route |
| `PATCH /admin/inquiries/:id` `{ dealValue, currency }` | Missing | Add it |
| Notes `{ id, body, authorName, createdAt }` | `{ id, inquiryId, body, authorId, createdAt }` | Return the author's name |
| `assignedTo { id, fullName }` | Always `null` | Fill from `assigned_to` |
| Optional `phone`, `sector`, `serviceDomain`, `budgetRange`, `desiredStartDate`, `preferredContact`, `estimatorPayload` | Not stored | Add to intake and the table when the public form sends them |

**Bug:** `kanban_position` is a PostgreSQL `integer` (`migrations/0003_dashboard.sql`) but new rows store `Date.now()` (about 1.7 × 10¹²), which overflows `integer` and makes every inquiry insert fail on PostgreSQL. The move endpoint also requires an integer, while the dashboard places a card between two others with a fractional midpoint (`positionBetween`). Change the column to `double precision` (or `numeric`), accept any finite number in `inquiryMove`, and seed new rows with a large spacing (e.g. max position + 1024).

The public intake also stores `ipAddress` and returns it on admin reads; keep it out of the admin response unless it is needed.

### Report downloads (leads)

- **Path:** dashboard calls `/api/v1/admin/report-leads` and `/api/v1/admin/report-leads/domains`; backend serves `/api/v1/admin/reports/leads` and `/api/v1/admin/reports/leads/domains`. Add the `report-leads` paths (keep the old ones as aliases if anything else uses them).
- **List shape:** dashboard expects a paginated `{ data, meta }` of `{ id, fullName, email, companyName, emailDomain, isCorporate, reportTitle, downloadedAt }`; backend returns a bare array of `{ id, reportSlug, email, fullName, company, ipAddress, createdAt }`. Add `emailDomain`, `isCorporate` (same check as `disposable-email.ts`), `reportTitle` (from the report record), rename `company` and `createdAt`, and honour `from`, `page` and `pageSize`.
- **Domains:** shape matches, but wrap it as `{ data: [...] }`.
- `from`: the dashboard sends a plain date (`2026-10-15`), but `reportLeadQuery` only accepts a date-time with offset, so `/domains` and the CSV export answer 400. Accept `z.iso.date()` as well.

### Newsletter (`/api/v1/admin/newsletter`)

- Statuses: dashboard uses `PENDING`, `CONFIRMED`, `UNSUBSCRIBED`, `BOUNCED`; backend has lower case and no `bounced`. The strict list query rejects the dashboard's upper-case filter with 400.
- Subscriber: dashboard expects `subscribedAt`; backend sends `createdAt`. `fullName`, `tags`, `source`, `confirmedAt` match.
- `POST` and `PATCH` return the bare subscriber; wrap in `{ data }`.
- Manual add: the dashboard treats staff-added subscribers as `CONFIRMED`; check `createAdmin` does the same and records who attested consent.

## 5. Governance

### Users (`/api/v1/admin/users`)

- Status values: dashboard sends and expects `INVITED`, `ACTIVE`, `SUSPENDED`; backend uses lower case and the strict query rejects the dashboard's filter.
- `POST /admin/users` returns nothing (`inviteStaff` is `void`). Return `{ data: user }` for the invited account, with `status: 'invited'`.
- `POST /admin/users/:id/role|status` must return `{ data: safeUser }` (see 1.2).
- `POST /admin/users/:id/invite/resend` is missing; the dashboard's "Resend invite" calls it.
- Suspending a user should revoke all of that user's sessions in the same transaction.

### Audit log (`/api/v1/admin/audit-logs`)

- Rows only carry `{ id, actor, action, record, createdAt }`. Add `actorEmail` (or name), `resourceType`, `resourceId`, a readable `summary` and `ipAddress`, and record sign-ins, exports and private file access, not only CMS writes.
- Filtering runs after `audit.list(pageSize)`, so filters and `page` only search the newest `pageSize` rows. `resourceType` matches `action.startsWith(type + '_')`, but CMS actions use dots. Move filtering and pagination into the SQL query.
- `verify-chain` returns `{ supported: false }`; the table has no hash chain. Add `prev_hash`/`hash` columns and return `{ valid, checked, firstBrokenId }` when implemented.
- `GET /admin/dashboard/activity` builds `summary` from `JSON.stringify(record).slice(0, 200)`, which shows raw JSON on the overview. Use the same readable summary as the audit log, and `actorName` instead of the user id.

## 6. War-Room (engagements, findings, retests, deliverables, certificates)

The backend has the staff write endpoints and the client-portal reads, but not the staff read endpoints the dashboard is built on, and the field names differ. Until these exist the dashboard shows "API module not connected" for these screens.

| Dashboard calls | Backend `main` |
| --- | --- |
| `GET /admin/engagements` (filters, paginated), `GET /admin/engagements/:id` | Missing (only `GET /portal/engagements…`) |
| `POST /admin/engagements` camelCase `{ projectName, clientOrganization, auditType, testingMode, startDate, endDate?, rulesOfEngagement? }` | Exists, snake case `{ project_name, client_user_id, audit_type, start_date, lead_auditor }` |
| `POST /admin/engagements/:id/status` | `PUT` |
| `PATCH /admin/engagements/:id/milestones/:milestoneId` | Missing (no milestones) |
| `GET /admin/findings`, `GET /admin/findings/:id` | Missing |
| `POST /admin/engagements/:id/findings`, `PATCH /admin/findings/:id` | `POST` exists; update is `PUT` |
| `POST /admin/findings/:id/verify` | Missing |
| `GET /admin/retests`, `GET/POST /admin/findings/:id/retests`, `PATCH /admin/retests/:id` | Only `PUT /admin/retests/:id`; requests come from the portal |
| `POST /admin/engagements/:id/certificate`, `POST /admin/certificates/:id/revoke` | `POST /admin/certificates`, revoke by `:code` |
| Deliverables list/generate/finalize | Paths match and use `{ data }` |

Enum differences to settle: engagement statuses (dashboard `PLANNED, ACTIVE, REPORTING, RETESTING, COMPLETED, ON_HOLD, CANCELLED` vs backend `scoping, active, reporting, retest, closed`), finding severities (`CRITICAL…INFO` vs lower case), finding statuses (dashboard `DRAFT, OPEN, IN_REMEDIATION, READY_FOR_RETEST, FIXED_VERIFIED, RISK_ACCEPTED, FALSE_POSITIVE` vs backend `open, retest_requested, retest_in_progress, resolved, accepted_risk`) and retest statuses (dashboard adds `SCHEDULED` and `CANCELLED`). The overview charts already read the backend's lower-case values. The dashboard's finding also carries `referenceCode`, `cvssVersion`, `cweId`, `references`, `isVerified` and `retestStatus`, which the backend does not store. See [api_doc.md](api_doc.md) and `services/ops.schema.ts` for the full dashboard contract; agree on one enum spelling before building these routes.

## 7. Error envelope (nice to have)

The dashboard now reads `{ error: "message", issues }`, so this is not blocking. A structured envelope would still let it show precise messages without guessing from the status code:

```json
{ "error": { "code": "VERSION_CONFLICT", "message": "Record changed; reload before saving", "details": { "fieldErrors": { "title": ["Required"] } }, "requestId": "…" } }
```

The generic handler in `app.ts` also turns every non-`HttpError` 4xx into `"Request rejected"`, which hides useful messages such as Fastify's `413` body-too-large; pass those messages through.
