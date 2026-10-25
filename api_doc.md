# Cyenetic Admin API reference

Every HTTP endpoint the Cyenetic staff dashboard uses: method, path, who may call it, what to send and what comes back.

**What this documents.** The contract is defined by the dashboard's typed adapters in `services/` and implemented today by the local dev API in `dev-api/` (started by `./run.sh`). The production `cyenetic-backend` must serve the same contract, but it does not serve most of these endpoints yet; see [Implementation status](#implementation-status). Where the dev API's behaviour is a local-only choice (storage, mail), that is said next to the endpoint.

- Base URL: `NEXT_PUBLIC_API_URL` (local: `http://localhost:4000`)
- All paths below are relative to that base.
- Request and response bodies are JSON (`Content-Type: application/json`) unless stated otherwise.
- Dates are ISO 8601 strings (`2026-10-25T17:36:00.000Z`); date-only fields use `YYYY-MM-DD`.

## Contents

1. [Conventions](#conventions): authentication, envelopes, errors, pagination
2. [Roles and permissions](#roles-and-permissions)
3. [Health](#health)
4. [Authentication](#authentication) `/api/v1/auth`
5. [Account](#account) `/api/v1/admin/account`
6. [Dashboard overview](#dashboard-overview) `/api/v1/admin/dashboard`
7. [Content (CMS)](#content-cms) `/api/v1/admin/content`
8. [Media](#media) `/api/v1/admin/media` and `/files`
9. [CRM: inquiries](#crm-inquiries) `/api/v1/admin/inquiries`
10. [CRM: report-download leads](#crm-report-download-leads) `/api/v1/admin/report-leads`
11. [CRM: newsletter](#crm-newsletter) `/api/v1/admin/newsletter`
12. [War-Room: engagements](#war-room-engagements) `/api/v1/admin/engagements`
13. [War-Room: findings](#war-room-findings) `/api/v1/admin/findings`
14. [War-Room: retests](#war-room-retests) `/api/v1/admin/retests`
15. [War-Room: deliverables and certificates](#war-room-deliverables-and-certificates) (not implemented)
16. [Governance: users](#governance-users) `/api/v1/admin/users`
17. [Governance: audit log](#governance-audit-log) `/api/v1/admin/audit-logs`
18. [Implementation status](#implementation-status)

---

## Conventions

### Authentication

Staff sign in with email and password, then a 6-digit code that the API emails ([full contract](docs/AUTH_EMAIL_OTP.md)). A successful sign-in returns a short-lived **access token** (15 minutes in the dev API) and sets an HttpOnly **refresh cookie**.

| Credential | How it is sent | Used by |
| --- | --- | --- |
| Access token | `Authorization: Bearer <accessToken>` | Every `/api/v1/admin/*` endpoint and `GET /api/v1/auth/me` |
| Refresh cookie `cyenetic_refresh` | Cookie, `HttpOnly; SameSite=Strict; Path=/api/v1/auth` (plus `Secure` in production) | `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` |
| CSRF header | `X-Requested-With: cyenetic-admin` | Required on the two cookie endpoints above |

The dashboard keeps the access token in memory only. When any request answers `401`, it calls `/auth/refresh` once and retries.

"Signed in" in the tables below means any active staff account with a valid access token, whatever its role.

### CORS

Only the dashboard origin (`DASHBOARD_URL`, or the comma-separated `CORS_ORIGINS`) receives CORS headers, with `Access-Control-Allow-Credentials: true`. Allowed headers: `authorization, content-type, x-requested-with`. Allowed methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.

### Response envelopes

| Kind | Shape |
| --- | --- |
| Single resource | `{ "data": { ... } }` |
| Paginated list | `{ "data": [ ... ], "meta": { "page": 1, "pageSize": 50, "total": 120, "totalPages": 3 } }` |
| Plain list | `{ "data": [ ... ] }` |
| No content | `204` with an empty body |
| CSV export | `200`, `Content-Type: text/csv; charset=utf-8` |

A few older endpoints return the object or array without `data`. Each one is marked **bare** below: the auth token/challenge responses and the CMS content endpoints.

### Errors

Every error uses one envelope:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Some fields are invalid.", "details": { "fieldErrors": { "title": ["Required"] } }, "requestId": "6f1c…" } }
```

`details` is present only for validation errors. `requestId` matches the API log line.

| Status | `code` | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Body or query is invalid. The body must be a JSON object; badly encoded URLs are also 400 |
| 401 | `UNAUTHENTICATED` | Missing, expired or revoked access token / refresh cookie |
| 401 | `invalid_credentials`, `invalid_code` | Sign-in failures (see [Authentication](#authentication)) |
| 403 | `FORBIDDEN` | The role lacks the permission |
| 403 | `CSRF` | `X-Requested-With: cyenetic-admin` missing on a cookie endpoint |
| 404 | `NOT_FOUND` | Unknown route or record, or a record outside the caller's scope |
| 405 | `METHOD_NOT_ALLOWED` | Path exists with another method |
| 409 | `VERSION_CONFLICT`, `EMAIL_TAKEN` | Stale CMS version, duplicate user email |
| 410 | `code_expired`, `LINK_EXPIRED` | Expired sign-in challenge or emailed link |
| 413 | `PAYLOAD_TOO_LARGE` | JSON body over 2 MB, or an upload over its limit |
| 415 | `UNSUPPORTED_TYPE` | Upload bytes are not an allowed type for its purpose |
| 429 | `RATE_LIMITED`, `too_many_attempts` | Too many attempts |
| 501 | `NOT_IMPLEMENTED` | Module not available on this API |
| 503 | `delivery_failed`, `STORAGE_UNAVAILABLE` | Mail server or file storage unreachable |
| 500 | `INTERNAL` | Unexpected error; see the API log for `requestId` |

The dashboard shows "API module not connected" for any `404` or `501` from a module endpoint instead of sample data.

### Pagination and filters

Paginated endpoints accept `page` (default 1) and `pageSize` (default 50, max 200). `q` is a case-insensitive text search across the fields listed for each endpoint. Unknown query parameters are ignored.

---

## Roles and permissions

The API stores role enums; the dashboard shows display names.

| API role | Display name |
| --- | --- |
| `SUPER_ADMIN` | Super Admin |
| `SECURITY_AUDITOR` | Security Auditor |
| `CONTENT_EDITOR` | Content Editor |

Permissions come from one matrix shared by the dashboard and the dev API (`services/permissions.ts`). The API always enforces them; hiding a button in the dashboard is not authorization.

| Permission | Super Admin | Security Auditor | Content Editor |
| --- | :-: | :-: | :-: |
| `dashboard:view` | ✓ | ✓ | ✓ |
| `content:read` | ✓ | ✓ | ✓ |
| `content:write` (save draft / in review / on hold) | ✓ | | ✓ |
| `content:publish` (any other status) | ✓ | | |
| `team:write` | ✓ | | ✓ |
| `media:write` | ✓ | ✓ | ✓ |
| `crm:read` | ✓ | ✓ | ✓ |
| `crm:write` | ✓ | | ✓ |
| `crm:export` | ✓ | | ✓ |
| `engagements:read` | ✓ | ✓ | |
| `engagements:write` | ✓ | ✓ | |
| `findings:read` | ✓ | ✓ | |
| `findings:write` | ✓ | ✓ | |
| `retests:request` | ✓ | ✓ | |
| `retests:resolve` | ✓ | ✓ | |
| `deliverables:generate` | ✓ | ✓ | |
| `deliverables:download` | ✓ | ✓ | |
| `certificates:issue` | ✓ | | |
| `users:manage` | ✓ | | |
| `audit:read` | ✓ | | |

**Engagement scoping.** A Security Auditor only sees engagements they lead or are a member of, and the findings and retests under them. Anything else answers `404`, not `403`, so its existence is not revealed. Super Admin sees everything.

**Private files.** Files in the private bucket (report PDFs, finding videos and evidence) need `findings:read` in addition to `media:write`.

---

## Health

| Method | Path | Roles | Response |
| --- | --- | --- | --- |
| GET | `/health` | Public | `200 { "status": "ok", "service": "cyenetic-dev-api" }` |

---

## Authentication

All under `/api/v1/auth`. Rate limits (10 per 15 minutes each): sign-in per IP and per email, code resend per account, forgot-password per IP.

### POST `/api/v1/auth/login`

Step 1 of sign-in. Checks the password and emails a 6-digit code. **Roles:** public.

Request:

```json
{ "email": "admin@cyenetic.local", "password": "…" }
```

Response `200` (**bare**):

```json
{ "codeRequired": true, "challengeId": "opaque-random-id", "maskedEmail": "a***@cyenetic.local",
  "expiresAt": "2026-10-25T17:46:00.000Z", "resendAvailableAt": "2026-10-25T17:36:30.000Z" }
```

Errors: `401 invalid_credentials` (same message for unknown email, wrong password or inactive account), `429 RATE_LIMITED`, `503 delivery_failed` (code could not be emailed; no usable challenge is created).

### POST `/api/v1/auth/login/verify`

Step 2. Exchanges the emailed code for an access token and sets the refresh cookie. **Roles:** public (needs a live challenge). Send with `credentials: include`.

Request: `{ "challengeId": "…", "code": "123456" }`

Response `200` (**bare**): `{ "accessToken": "…", "expiresInSeconds": 900 }` plus `Set-Cookie: cyenetic_refresh=…`

Errors: `401 invalid_code` (retry allowed), `410 code_expired`, `429 too_many_attempts` (after 5 wrong codes the challenge is void; start again). Codes expire after 10 minutes and are single use.

### POST `/api/v1/auth/login/resend`

Emails a new code for the same challenge and invalidates the old code. **Roles:** public.

Request: `{ "challengeId": "…" }` · Response `200`: same shape as `/login`.

Errors: `410 code_expired` (unknown challenge), `429 RATE_LIMITED` (before `resendAvailableAt`, 30 seconds after the last send), `503 delivery_failed`.

### POST `/api/v1/auth/refresh`

Issues a new access token from the refresh cookie and rotates the cookie. **Roles:** cookie holder. Requires `X-Requested-With: cyenetic-admin`.

Request: no body. · Response `200` (**bare**): `{ "accessToken": "…", "expiresInSeconds": 900 }`

Errors: `401 UNAUTHENTICATED` (no session; the dashboard treats this as signed out), `403 CSRF`. Sessions expire after 7 days without use.

### POST `/api/v1/auth/logout`

Revokes the current session and clears the cookie. **Roles:** cookie holder. Requires `X-Requested-With: cyenetic-admin`.

Request: no body. · Response `204`.

### GET `/api/v1/auth/me`

**Roles:** signed in.

Response `200`: `{ "data": { "id": "uuid", "role": "SUPER_ADMIN", "email": "admin@cyenetic.local", "fullName": "Dev Super Admin" } }`

### POST `/api/v1/auth/password/forgot`

Emails a reset link (valid 60 minutes) when the account exists. Always answers the same way to avoid revealing accounts. **Roles:** public.

Request: `{ "email": "…" }` · Response `202`: `{ "data": { "accepted": true } }`

### POST `/api/v1/auth/password/reset`

Sets a new password from the emailed link and signs out every session of that account. **Roles:** public (needs the link token).

Request: `{ "token": "from-the-link", "password": "at least 12 characters" }` · Response `204`.

Errors: `400 VALIDATION_ERROR` (password shorter than 12 or longer than 256), `410 LINK_EXPIRED` (invalid, used or expired link).

### POST `/api/v1/auth/invite/accept`

Activates an invited account with its first password (link valid 48 hours). **Roles:** public (needs the invite token).

Request: `{ "token": "from-the-invite", "password": "…" }` · Response `204`. Errors as for `/password/reset`.

---

## Account

The signed-in person's own profile, password and sessions. **Roles:** signed in (any role). Base: `/api/v1/admin/account`.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/sessions` | none | `{ data: Session[] }` (active sessions, newest first) |
| DELETE | `/sessions` | none | `204`; signs out every other session, keeps the current one |
| DELETE | `/sessions/:id` | none | `204`; `404` if not one of your active sessions |
| PATCH | `/profile` | `{ fullName }` (1–120 characters) | `204` |
| POST | `/password` | `{ currentPassword, newPassword }` (new: 12–256 characters) | `204`; other sessions are signed out. `400` with `fieldErrors.currentPassword` when the current password is wrong |

`Session`:

```json
{ "id": "uuid", "userAgent": "Mozilla/5.0 …", "ipAddress": "127.0.0.1", "lastUsedAt": "…", "createdAt": "…", "current": true }
```

---

## Dashboard overview

Base: `/api/v1/admin/dashboard`. **Roles:** signed in. Each value is filtered by the caller's permissions: a metric the role may not see is `null` (or an empty array).

### GET `/summary`

```json
{ "data": { "openInquiries": 4, "activeEngagements": 2, "openCriticalHigh": 3, "downloads30d": 18,
  "downloadsDeltaPct": 12, "publishedPosts": 7, "confirmedSubscribers": 140 } }
```

| Field | Needs |
| --- | --- |
| `openInquiries` (NEW, SCOPING_CALL, RFP_REVIEW, PROPOSAL_SENT) | `crm:read` |
| `activeEngagements` (ACTIVE, REPORTING, RETESTING) | `engagements:read` |
| `openCriticalHigh` (open CRITICAL + HIGH findings) | `findings:read` |
| `downloads30d`, `downloadsDeltaPct` (vs the previous 30 days; `null` when there is nothing to compare) | `crm:read` |
| `publishedPosts` | `content:read` |
| `confirmedSubscribers` | `crm:read` |

### GET `/charts?range=30d`

```json
{ "data": {
  "pipeline": [{ "status": "NEW", "count": 2 }],
  "downloadsPerDay": [{ "date": "2026-10-25", "count": 1 }],
  "findingsBySeverity": [{ "severity": "CRITICAL", "count": 1 }],
  "engagementsByStatus": [{ "status": "ACTIVE", "count": 2 }] } }
```

`pipeline` and `downloadsPerDay` (30 days) need `crm:read`; `findingsBySeverity` (open findings) needs `findings:read`; `engagementsByStatus` needs `engagements:read`.

### GET `/activity?limit=12`

Most recent audit entries, newest first. `limit` max 50.

```json
{ "data": [{ "id": "uuid", "actorName": "Dev Super Admin", "action": "CONTENT_PUBLISHED", "summary": "posts/hello v3 · published", "resourceType": "CONTENT", "createdAt": "…" }] }
```

With `audit:read` (Super Admin) every entry is shown. Other roles see only their own actions plus CMS changes (`CONTENT`, with `content:read`) and CRM changes (`INQUIRY`, `SUBSCRIBER`, `REPORT_LEAD`, with `crm:read`).

### GET `/upcoming?days=7`

Items due from yesterday up to `days` ahead (max 60), soonest first.

```json
{ "data": [{ "kind": "MILESTONE", "title": "Reporting", "dueAt": "…", "context": "ENG-2026-0001" }] }
```

`kind` is `MILESTONE` (needs `engagements:read`), `SCHEDULED_POST` (needs `content:read`) or `RETEST` (needs `findings:read`).

---

## Content (CMS)

Versioned records for services, posts, case studies, reports and team members. Base: `/api/v1/admin/content`. `:kind` is one of `services`, `posts`, `case-studies`, `reports`, `team`; anything else is `404`.

### GET `/api/v1/admin/content/:kind`

**Roles:** `content:read` (all three roles).

Response `200` (**bare** array): `ContentRecord[]`. Team members are sorted by `data.sort_order`; other kinds by `updatedAt`, newest first.

### PUT `/api/v1/admin/content/:kind/:slug`

Creates (`version: 0`) or updates a record. **Roles:** `content:write` (Super Admin, Content Editor); for `team`, `team:write`. Any status other than `draft`, `in_review` or `on_hold` also needs `content:publish` (Super Admin only).

Request (`ContentInput`):

```json
{ "kind": "posts", "slug": "hello-world", "status": "draft", "version": 0, "data": { "…": "kind-specific fields below" } }
```

Response `200` (**bare**): the saved `ContentRecord`, which is the input plus `version` incremented by one and `updatedAt`.

Rules:

- The body's `kind` and `slug` must match the URL (`400`).
- `version` must equal the stored version (`0` for a new record). Otherwise `409 VERSION_CONFLICT`: reload, then save again.
- `slug`: lowercase letters, numbers and single hyphens, max 100.
- `status`: `draft`, `in_review`, `on_hold`, `approved`, `scheduled`, `published`, `archived`. Only `published` is public. `scheduled` stays hidden until someone publishes it (no scheduler runs). Delete in the dashboard means saving with `archived`; there is no hard delete.
- At most two **published** posts may have `is_featured: true` (`400`).
- Validation failures return `400` with `fieldErrors` keyed by path, e.g. `data.title`.
- Image URLs must be `https://`. Outside production builds `http://localhost` and `http://127.0.0.1` are also accepted so local uploads work.
- Every save writes an audit entry with the before/after `data`.

`data` fields per kind (from `services/content.schema.ts`; unknown keys are rejected except in case studies):

| Kind | Fields |
| --- | --- |
| `services` | `slug` (must equal the record slug), `title`, `description`, `standards: string[]` (≤30), `subDomains: { slug, title, description }[]` (≤100, unique slugs) |
| `posts` | `title` (≤160), `summary` (≤500), `cover_image: { url, alt } \| null`, `publish_date: "YYYY-MM-DD" \| null`, `content_markdown`, `category` (≤60), `tags: string[]` (≤10, unique, lowercased), `author`, `is_featured: boolean`, `seo_title` (≤70), `seo_description` (≤160) |
| `case-studies` | `title`, `tagline` (required), `cover_image`, `client_display_name`, `is_anonymized`, `company_quote`, `company_overview` (required), `company_address`, `company_size: "1-10" \| "11-50" \| "51-200" \| "201-1000" \| "1000+" \| null`, `test_types: string[]` (≤12), `requirement_markdown` (required), `requirement_points: string[]` (1–10), `engagement_items: { title, description }[]` (1–10), `testimonials: { quote, name, designation, company, photo }[]` (≤4), `reviews: { name, url }[]` (≤4, https) |
| `reports` | `title`, `description`, `category`, `is_gated: boolean` |
| `team` | `title` (name), `designation`, `bio`, `image_url \| null`, `image_alt`, `linkedin_url \| null` (https), `department`, `certifications: string[]` (≤15), `skills: string[]` (≤10), `links: { label, url }[]` (≤5, https), `show_on_site: boolean`, `sort_order: integer ≥ 0` |

### GET `/api/v1/admin/audit`

Legacy CMS change feed (full record snapshot per save), newest first. **Roles:** `audit:read` (Super Admin).

Response `200` (**bare** array): `{ id, actor, action, createdAt, record: ContentRecord }[]`. `action` is `CONTENT_CREATED`, `CONTENT_UPDATED` or `CONTENT_<STATUS>` when the status changed.

### Public reads

Published content for the public website (services catalog, posts, case studies, team) is served by `cyenetic-backend`'s public endpoints, not by this dashboard or the dev API. Those endpoints must never return drafts, `in_review`, `on_hold`, `approved`, `scheduled` or `archived` records, or private file URLs.

---

## Media

Upload and manage files. Base: `/api/v1/admin/media`. **Roles:** `media:write` (all three roles); private-bucket files also need `findings:read` (Super Admin, Security Auditor).

`MediaAsset`:

```json
{ "id": "uuid", "bucket": "PUBLIC", "originalName": "cover.png", "mimeType": "image/png", "sizeBytes": 48213,
  "width": 1200, "height": 630, "sha256": "…", "altText": "cover", "scanStatus": "SKIPPED",
  "createdAt": "…", "url": "http://localhost:4000/files/public/blog-cover/<id>.png" }
```

`url` is set for public files and `null` for private ones (use `GET /:id/url`). `scanStatus` is `SKIPPED` in the dev API because no malware scanner runs; production must scan (`PENDING`, `CLEAN`, `INFECTED`).

### GET `/api/v1/admin/media?bucket=&q=&page=&pageSize=`

Paginated `MediaAsset` list, newest first. `bucket` is `PUBLIC` or `PRIVATE`; `q` searches `originalName` and `altText`. Private files are left out for roles without `findings:read`.

### POST `/api/v1/admin/media`

Upload one file as `multipart/form-data` with fields `purpose` and `file`. The real type is detected from the file's bytes; the browser's declared type is ignored.

| `purpose` | Allowed types | Max size | Bucket |
| --- | --- | --- | --- |
| `blog-cover`, `case-cover`, `client-logo`, `team-photo`, `avatar` | JPEG, PNG, WebP | 5 MB | PUBLIC |
| `report-pdf` | PDF | 50 MB | PRIVATE |
| `finding-video` | MP4, WebM | 100 MB | PRIVATE |
| `finding-evidence` | JPEG, PNG, WebP, PDF | 20 MB | PRIVATE |

Response `201`: `{ data: MediaAsset }`. Alt text defaults to the file name.

Errors: `400` (missing file or unknown purpose), `403` (private purpose without `findings:read`), `413` (too large), `415 UNSUPPORTED_TYPE` (bytes do not match an allowed type), `503 STORAGE_UNAVAILABLE`.

### GET `/api/v1/admin/media/:id/url`

Response `200`: `{ data: { url } }`. Public files get their permanent URL. Private files get a link that expires after 15 minutes, and each request is written to the audit log (`MEDIA_PRIVATE_ACCESS`). `404` when missing or not visible to the role.

### PATCH `/api/v1/admin/media/:id`

Request: `{ "altText": "…" }` (≤200 characters). Response `200`: `{ data: MediaAsset }`.

### Where files are stored (dev API)

Set by `STORAGE_DRIVER` in `.env`:

| Driver | Where files go | Public URL | Private link |
| --- | --- | --- | --- |
| `local` (default) | `.dev-data/uploads/{public,private}/<purpose>/<id>.<ext>` | `GET /files/public/<purpose>/<id>.<ext>` on the dev API | `GET /files/private/<purpose>/<id>.<ext>?expires=<unix>&signature=<hmac>` |
| `minio` | MinIO buckets `S3_PUBLIC_BUCKET` / `S3_PRIVATE_BUCKET` | MinIO object URL (public-read bucket) | S3 presigned URL |

The `/files/...` routes exist only with the `local` driver. They need no token: public files are open, and private files need a valid, unexpired signature from `GET /:id/url` (otherwise `404`). Responses carry `X-Content-Type-Options: nosniff` and a sandboxing CSP. Files uploaded under one driver are not visible through the other.

---

## CRM: inquiries

Base: `/api/v1/admin/inquiries`. Read needs `crm:read` (all roles); changes need `crm:write` (Super Admin, Content Editor).

`Inquiry`:

```json
{ "id": "uuid", "fullName": "Jane Doe", "workEmail": "jane@acme.com", "company": "Acme", "scopeDetails": "…",
  "phone": null, "sector": null, "serviceType": null, "serviceDomain": null, "targetEnvironment": null, "budgetRange": null,
  "desiredStartDate": null, "preferredContact": null, "source": "MANUAL", "status": "NEW", "kanbanPosition": 1024,
  "dealValue": null, "currency": "USD", "lostReason": null, "assignedTo": { "id": "uuid", "fullName": "…" },
  "convertedEngagementId": null, "createdAt": "…" }
```

Statuses: `NEW`, `SCOPING_CALL`, `RFP_REVIEW`, `PROPOSAL_SENT`, `RETAINER_WON`, `LOST`.

| Method | Path | Roles | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/board` | `crm:read` | none | `{ data: { NEW: Inquiry[], SCOPING_CALL: [...], … } }`, each column sorted by `kanbanPosition` |
| POST | `/` | `crm:write` | `{ fullName, workEmail, company?, scopeDetails? }` | `201 { data: Inquiry }` (status `NEW`, assigned to the caller) |
| PATCH | `/:id` | `crm:write` | `{ dealValue?: number \| null, currency?: "USD" }` (3-letter code) | `{ data: Inquiry }` |
| POST | `/:id/move` | `crm:write` | `{ status, position: number, lostReason? }` (`lostReason` required for `LOST`) | `{ data: Inquiry }` |
| GET | `/:id/notes` | `crm:read` | none | `{ data: Note[] }`, newest first |
| POST | `/:id/notes` | `crm:write` | `{ body }` (1–5000 characters) | `201 { data: Note }` |
| POST | `/:id/convert` | `crm:write` **and** `engagements:write` (Super Admin only) | none | `{ data: { engagementId } }`; creates an engagement, sets status `RETAINER_WON`; repeating returns the same engagement |

`Note`: `{ id, body, authorName, createdAt }`.

Public inquiry intake from the website (with Turnstile and corporate-email checks) belongs to `cyenetic-backend` and is not part of this API yet.

---

## CRM: report-download leads

Base: `/api/v1/admin/report-leads`. `from` is an optional ISO date; only downloads on or after it are included.

| Method | Path | Roles | Response |
| --- | --- | --- | --- |
| GET | `/?from=&page=&pageSize=` | `crm:read` | Paginated `Lead[]`, newest first |
| GET | `/domains?from=` | `crm:read` | `{ data: { domain, leads, lastDownload, reports: string[] }[] }`, most leads first |
| GET | `/export.csv?from=` | `crm:export` (Super Admin, Content Editor) | CSV with columns `fullName, email, companyName, emailDomain, isCorporate, reportTitle, downloadedAt`; audited as `LEADS_EXPORTED` |

`Lead`: `{ id, fullName, email, companyName, emailDomain, isCorporate, reportTitle, downloadedAt }`.

Leads are created by the public website's gated report download, which is not implemented yet, so this list stays empty locally.

CSV cells starting with `=`, `+`, `-` or `@` are prefixed with `'` to block spreadsheet formula injection.

---

## CRM: newsletter

Base: `/api/v1/admin/newsletter`. Statuses: `PENDING`, `CONFIRMED`, `UNSUBSCRIBED`, `BOUNCED`.

| Method | Path | Roles | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/?status=&q=&page=&pageSize=` | `crm:read` | none (`q` searches email and name) | Paginated `Subscriber[]`, newest first |
| POST | `/` | `crm:write` | `{ email, fullName?, tags?: string[] }` (≤10 tags) | `201 { data: Subscriber }` (added as `CONFIRMED`, source `manual`); `400` if already subscribed |
| PATCH | `/:id` | `crm:write` | `{ status }` | `{ data: Subscriber }` |
| GET | `/export.csv?status=&q=` | `crm:export` | none | CSV `email, fullName, status, source, tags, subscribedAt, confirmedAt`; audited |

`Subscriber`: `{ id, email, fullName, status, source, tags: string[], subscribedAt, confirmedAt }`.

No email is sent to subscribers; double opt-in and sending are not implemented.

---

## War-Room: engagements

Base: `/api/v1/admin/engagements`. Read needs `engagements:read`, changes need `engagements:write` (Super Admin, Security Auditor). Auditors only see their own engagements (see [Roles](#roles-and-permissions)).

`Engagement`:

```json
{ "id": "uuid", "code": "ENG-2026-0001", "projectName": "Acme web app", "clientOrganization": "Acme", "auditType": "Penetration test",
  "additionalCategories": [], "testingMode": "GREY_BOX", "status": "PLANNED", "startDate": "2026-10-25", "endDate": null,
  "leadAuditor": { "id": "uuid", "fullName": "…" }, "rulesOfEngagement": null, "scopeAssets": [], "members": [],
  "milestones": [{ "id": "uuid", "title": "Kick-off", "dueDate": "2026-10-25", "completedAt": null, "sortOrder": 0 }],
  "progressPercent": 0, "openBySeverity": { "HIGH": 2 } }
```

Statuses: `PLANNED`, `ACTIVE`, `REPORTING`, `RETESTING`, `COMPLETED`, `ON_HOLD`, `CANCELLED`. Testing modes: `WHITE_BOX`, `GREY_BOX`, `BLACK_BOX`. New engagements get five milestones (Kick-off, Reconnaissance, Exploitation, Reporting, Retest) spread from `startDate` to `endDate` (or 28 days).

| Method | Path | Roles | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/?status=&q=&page=&pageSize=` | `engagements:read` | none (`q` searches code, project and client) | Paginated `Engagement[]`, newest first |
| GET | `/:id` | `engagements:read` | none | `{ data: Engagement }` |
| POST | `/` | `engagements:write` | `{ projectName, clientOrganization, auditType, testingMode, startDate, endDate?, rulesOfEngagement? }` | `201 { data: Engagement }`; caller becomes lead auditor |
| POST | `/:id/status` | `engagements:write` | `{ status }` | `{ data: Engagement }` |
| PATCH | `/:id/milestones/:milestoneId` | `engagements:write` | `{ completed: boolean }` | `{ data: Milestone }` |
| POST | `/:id/findings` | `findings:write` | `FindingInput` (below) | `201 { data: Finding }` |

---

## War-Room: findings

Base: `/api/v1/admin/findings`. Read needs `findings:read`, changes need `findings:write` (Super Admin, Security Auditor), scoped to visible engagements.

`FindingInput` (create and update):

```json
{ "title": "SQL injection in search", "description": "…", "severity": "HIGH", "severityOverrideReason": null,
  "cvssVersion": "V3_1", "cvssVector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", "cvssScore": null,
  "cweId": "CWE-89", "affectedEndpoint": "/search", "pocText": null, "remediationGuidance": null, "references": [], "status": "OPEN" }
```

- Required: `title`, `affectedEndpoint`, `severity`, `status`, `cvssVersion` (`V3_1` or `V4_0`).
- With a CVSS 3.1 vector, the API recomputes `cvssScore` and sets `severity` from it, unless `severityOverrideReason` is given. An incomplete vector is `400`.
- Severities: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`. Statuses: `DRAFT`, `OPEN`, `IN_REMEDIATION`, `READY_FOR_RETEST`, `FIXED_VERIFIED`, `RISK_ACCEPTED`, `FALSE_POSITIVE`.
- `references` keeps at most 20 entries.

`Finding` is the input plus `id`, `engagementId`, `engagementCode`, `referenceCode` (`F-001`, per engagement), `isVerified`, `retestStatus` (latest retest or `null`), `hasProofVideo`, `updatedAt`.

| Method | Path | Roles | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/?engagementId=&severity=&status=&q=&page=&pageSize=` | `findings:read` | none (`q` searches title, reference and endpoint) | Paginated `Finding[]`, highest CVSS first |
| GET | `/:id` | `findings:read` | none | `{ data: Finding }` |
| PATCH | `/:id` | `findings:write` | `FindingInput` (full) | `{ data: Finding }` |
| POST | `/:id/verify` | `findings:write` | `{ isVerified: boolean }` | `{ data: Finding }` |
| GET | `/:id/retests` | `findings:read` | none | Paginated `Retest[]` for the finding |
| POST | `/:id/retests` | `retests:request` | `{ requestedNote? }` | `201 { data: Retest }`; finding moves to `READY_FOR_RETEST` |

---

## War-Room: retests

| Method | Path | Roles | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/retests?engagementId=&page=&pageSize=` | `findings:read` | none | Paginated `Retest[]`, newest first |
| PATCH | `/api/v1/admin/retests/:id` | `retests:resolve` | `{ status, resultNote? }` | `{ data: Retest }`. `PASSED` sets the finding to `FIXED_VERIFIED`; `FAILED` sets it back to `OPEN` |

Retest statuses: `REQUESTED`, `SCHEDULED`, `IN_PROGRESS`, `PASSED`, `FAILED`, `CANCELLED`.

`Retest`: `{ id, findingId, findingRef, findingTitle, severity, engagementCode, status, requestedNote, resultNote, scheduledFor, assignedTo: { id, fullName } | null, updatedAt }`.

---

## War-Room: deliverables and certificates

**Not implemented.** Every endpoint here answers `501 NOT_IMPLEMENTED` in the dev API, and `cyenetic-backend` does not serve them yet. The dashboard shows "API module not connected". This is the contract the dashboard already sends:

| Method | Path | Roles (intended) | Request | Response (intended) |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/engagements/:id/deliverables` | `deliverables:download` | none | `{ data: Deliverable[] }` |
| POST | `/api/v1/admin/engagements/:id/deliverables` | `deliverables:generate` | `{ kind: "EXECUTIVE" \| "TECHNICAL" \| "RETEST", watermarkText }` | `{ data: Deliverable }` |
| POST | `/api/v1/admin/engagements/:id/deliverables/:deliverableId/finalize` | `deliverables:generate` | none | `204` |
| GET | `/api/v1/admin/certificates` | `certificates:issue` | none | `{ data: Certificate[] }` |
| POST | `/api/v1/admin/engagements/:id/certificate` | `certificates:issue` (Super Admin) | `{ clientDisplayName, scopeSummary }` | `{ data: Certificate }` |
| POST | `/api/v1/admin/certificates/:id/revoke` | `certificates:issue` (Super Admin) | `{ reason }` | `{ data: Certificate }` |

`Deliverable`: `{ id, kind, version, status: "GENERATING" | "READY" | "FAILED", sha256, findingCount, watermarkText, errorMessage?, isFinal?, createdAt, generatedBy? }`.

`Certificate`: `{ id, certificateCode, engagementCode, clientDisplayName, scopeSummary, testingPeriodStart, testingPeriodEnd, sha256Checksum, issuedAt, revokedAt, revokeReason }`.

---

## Governance: users

Base: `/api/v1/admin/users`. **Roles:** `users:manage` (Super Admin only). Roles in requests and responses use display names (`"Super Admin"`, `"Security Auditor"`, `"Content Editor"`).

`User`: `{ id, email, fullName, role, status: "INVITED" | "ACTIVE" | "SUSPENDED", lastLoginAt, createdAt }`.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/?role=&status=&q=&page=&pageSize=` | none (`q` searches email and name) | Paginated `User[]` |
| POST | `/` | `{ email, fullName, role }` | `201 { data: User }` with status `INVITED`; an invite link (48 hours) is emailed. `409 EMAIL_TAKEN`; `503 delivery_failed` (user is not created) |
| POST | `/:id/role` | `{ role }` | `{ data: User }`; the user's sessions are signed out. Cannot demote the last active Super Admin |
| POST | `/:id/status` | `{ status: "ACTIVE" \| "SUSPENDED" }` | `{ data: User }`; suspending signs the user out. Cannot suspend yourself, the last Super Admin, or an invited user |
| POST | `/:id/invite/resend` | none | `204`; only for `INVITED` users |

---

## Governance: audit log

Append-only, hash-chained log of every sign-in event and change. **Roles:** `audit:read` (Super Admin only).

| Method | Path | Response |
| --- | --- | --- |
| GET | `/api/v1/admin/audit-logs?action=&resourceType=&q=&page=&pageSize=` | Paginated `AuditEntry[]`, newest first (`q` searches actor email, summary, resource id and action) |
| GET | `/api/v1/admin/audit-logs/verify-chain` | `{ data: { valid: boolean, checked: number, firstBrokenId: string \| null } }` |

`AuditEntry`: `{ id, actorEmail, action, resourceType, resourceId, summary, ipAddress, createdAt, diff? }`. `diff` is `{ before, after }` for content saves.

Resource types: `USER`, `CONTENT`, `MEDIA`, `INQUIRY`, `REPORT_LEAD`, `SUBSCRIBER`, `ENGAGEMENT`, `FINDING`.

Actions currently written: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGIN_CODE_FAILED`, `LOGIN_CODE_RESENT`, `LOGOUT`, `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET`, `PASSWORD_CHANGED`, `INVITE_ACCEPTED`, `SESSION_REVOKED`, `SESSIONS_REVOKED`, `USER_INVITED`, `USER_INVITE_RESENT`, `USER_ROLE_CHANGED`, `USER_SUSPENDED`, `USER_REACTIVATED`, `CONTENT_CREATED`, `CONTENT_UPDATED`, `CONTENT_<STATUS>`, `MEDIA_UPLOADED`, `MEDIA_PRIVATE_ACCESS`, `INQUIRY_CREATED`, `INQUIRY_UPDATED`, `INQUIRY_MOVED`, `INQUIRY_CONVERTED`, `LEADS_EXPORTED`, `SUBSCRIBER_ADDED`, `SUBSCRIBER_UPDATED`, `SUBSCRIBERS_EXPORTED`, `ENGAGEMENT_CREATED`, `ENGAGEMENT_STATUS`, `MILESTONE_UPDATED`, `FINDING_CREATED`, `FINDING_UPDATED`, `FINDING_VERIFIED`, `FINDING_UNVERIFIED`, `RETEST_REQUESTED`, `RETEST_UPDATED`.

---

## Implementation status

| Area | Local dev API (`./run.sh`) | `cyenetic-backend` (production) |
| --- | --- | --- |
| Auth (email + password + emailed code, refresh, reset, invite) | Implemented; mail goes to Mailpit | Not yet ([contract](docs/AUTH_EMAIL_OTP.md)) |
| Account, dashboard overview | Implemented | Not yet |
| CMS content and legacy audit feed | Implemented | Implemented; new post/case-study/team fields and `on_hold`/`approved` still need its schema update |
| Media upload | Implemented; local disk (default) or MinIO; no malware scan | Not yet |
| CRM: inquiries, leads, newsletter | Implemented (no public intake, no sending) | Not yet |
| Engagements, findings, retests | Implemented | Not yet |
| Deliverable PDFs and certificates | `501` | Not yet |
| Users, audit log, chain verification | Implemented | Not yet (legacy CMS audit only) |

The dev API is for local development only: it keeps data in `.dev-data/store.json`, refuses to start with `NODE_ENV=production`, and only listens on loopback. It is not a production backend. See [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).
