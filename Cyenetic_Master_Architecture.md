Markdown

# Cyenetic Platform — Full Master Architecture Specification

## 1. Executive Summary & Brand Alignment

Cyenetic is an offensive security engineering firm specializing in Vulnerability Assessment and Penetration Testing (VAPT), Red Teaming, and Security Advisory across modern attack surfaces. All frontend interfaces, dashboards, and client portals must be developed with a mobile-first approach to ensure 100% responsiveness across all devices and screen sizes.

### Core Pillars

*   **Core Value Propositions**: Parallel Audits, Step-by-Step Video Proof of exploitability, Complimentary Retesting on remediation, Rapid Critical Alerts, and Live War-Room collaboration[cite: 3, 4].
*   **Service Categories & Offerings**:
    1.  *Application Penetration Testing*: Web App, Android, iOS, Desktop, APIs.
    2.  *Infrastructure Penetration Testing*: Network, Active Directory, Cloud.
    3.  *AI & Emerging Technology Penetration Testing*: Web3/Smart Contact, AI/LLM.
    4.  *Compliance Driven Penetration Testing*: ISO/IEC 27001, SOC 2, PCI DSS, HIPAA, GDPR.
*   **Target Sectors**: Finance & Banking, Healthcare, Education, Retail & E-Commerce, Technology & SaaS, Government & Critical Infrastructure.
*   **Brand Identity**: High-contrast, minimalist, kinetic aesthetic utilizing Black (`#0A0A0A`), Clean White (`#FFFFFF`), Vivid Orange Accent (`#FF5C00`), with Space Grotesk (headings/body), Anton (display numbers/accents), and JetBrains Mono (terminal/code).

## 2. Global System Topology

The architecture decouples the platform into three isolated tiers with strict trust boundaries:

  
```
                                  [ Cloudflare Enterprise / WAF / DDoS Protection ]
                                                                 │
               ┌─────────────────────────────────────┼─────────────────────────────────────┐
               │                                     │                                     │
               ▼                                     ▼                                     ▼
     ┌───────────────────┐                 ┌───────────────────┐                 ┌───────────────────┐
     │  PUBLIC FRONTEND  │                 │  ADMIN DASHBOARD  │                 │  CLIENT WAR-ROOM  │
     │   (cyenetic.com)  │                 │ (admin.cyenetic)  │                 │(portal.cyenetic)  │
     └─────────┬─────────┘                 └─────────┬─────────┘                 └─────────┬─────────┘
               │                                     │                                     │
               └──────────────────────────┬──────────┴─────────────────────────────────────┘
                                          │ HTTPS / TLS 1.3 / mTLS / REST / tRPC
                                          ▼
                            ┌───────────────────────────┐
                            │    BACKEND API GATEWAY    │
                            │   (Fastify / Node or Go)  │
                            └─────────────┬─────────────┘
                                          │
       ┌──────────────────────┬───────────┴───────────┬──────────────────────┐
       ▼                      ▼                       ▼                      ▼
┌──────────────┐      ┌───────────────┐       ┌────────────────┐     ┌───────────────┐
│  Auth & RBAC │      │  Core Engine  │       │ Worker Engine  │     │ Storage Vault │
│ (WebAuthn/MFA)      │(CMS, CRM, Ops)│       │ (BullMQ/Redis) │     │ (S3 / R2 CDN) │
└──────┬───────┘      └───────┬───────┘       └───────┬────────┘     └───────┬───────┘
       │                      │                       │                      │
       └──────────────────────┼───────────────────────┘                      │
                              ▼                                              ▼
                   ┌─────────────────────┐                        ┌─────────────────────┐
                   │ PostgreSQL Database │                        │ Pre-signed Artifacts│
                   │ (Encrypted at Rest) │                        │(Gated PDFs, Proofs) │
                   └─────────────────────┘                        └─────────────────────┘

```

## 3. Tier 1: Public Frontend (cyenetic.com)

All routes must implement responsive web design principles (CSS Grid/Flexbox, media queries) to guarantee seamless usability across mobile and desktop environments.

  

### 3.1 Routing & Sitemap Matrix

| Route | Rendering Model | Functional Scope |
|---|---|---|
| `/` | SSR + ISR | Dynamic hero with interactive terminal simulation; dynamic client proof marquee; service pillars accordion; methodology stepper; recent whitepapers; fast RFP modal. |
| `/about` | SSG + ISR | Firm overview (Mission, Vision, 6 Core Values); 7-Step Penetration Testing Methodology; responsive Management Team grid managed via dashboard. |
| `/services` | Static (SSG) | Overview of 4 parent service domains: Application, Infrastructure, AI & Emerging Technology, Compliance-driven testing. |
| `/services/[domain]/[category]` | SSG + ISR | Nested deep-dive landing pages (e.g., `/services/application/web`); threat models; sample findings; deliverables; scoping CTAs. |
| `/case-studies` | SSG + ISR | Filterable portfolio of client audits (Sector, Attack Surface, CVSS breakdown) in responsive grid. |
| `/case-studies/[slug]` | SSG + ISR | In-depth case breakdown: Engagement, Challenge, Scope, Outcome; anonymization controls. |
| `/reports-insights` | SSG + ISR | Library of whitepapers, penetration guides, and security checklists. |
| `/reports-insights/[slug]` | SSG + Dynamic | Gated asset preview with summary, TOC, and email-verification download gate. |
| `/blog` | SSG + ISR | Responsive blog grid with 1-2 featured posts and standard technical writeups. |
| `/blog/[slug]` | SSG + ISR | Markdown/MDX content with JetBrains Mono syntax highlighting, copy-to-clipboard snippets, diff blocks, and estimated reading time. |
| `/estimator` | Client-Side SPA | Interactive Pentest Scoping Calculator: configure assets and receive instant ballpark effort/scope. |
| `/verify/[cert_id]` | Dynamic SSR | Cryptographic Audit Certificate Verification endpoint for auditors and investors. |
| `/contact` | Static + Client Form | Multi-step scoping form with Calendly integration, Signal/Telegram/WhatsApp links, and public PGP key download. |


## 4. Tier 2: Backend Architecture & Services

### 4.1 Technology Stack & Runtime

-   **Application Engine**: Fastify (Node.js 22 LTS) or Go (Fiber) for asynchronous throughput and minimal memory footprint.
    
      
-   **Relational Database**: PostgreSQL 16+ with Row-Level Security (RLS) and connection pooling via PgBouncer.
    
      
-   **Data Access**: Prisma or Drizzle ORM for type-safe migrations and schema synchronization.
    
      
-   **Cache & Event Bus**: Redis (Upstash / Redis Cluster) for sliding-window rate limiting, token blacklisting, and worker queues.
    
      
-   **Object Storage**: Cloudflare R2 / AWS S3 with strict private ACLs and presigned URL delivery.
    
      
-   **Email Delivery**: Resend / AWS SES with full SPF, DKIM, and DMARC enforcement.

### 4.2 Modular Backend Services

-   **CMS Engine Service**: Full CRUD API with version history for Posts, Case Studies, Reports, and Team Profiles. Status management: `draft`, `in_review`, `scheduled`, `published`, `archived`.
    
      
-   **Gated Asset & Token Signing Service**: Prevents direct public file scraping. Generates HMAC-SHA256 time-limited signed URLs (valid for 15 minutes) upon successful lead submission.
    
      
-   **Inquiries & CRM Webhook Pipeline**: Ingestion of contact form inquiries and scoping estimator payloads. Cloudflare Turnstile token validation and disposable/burner email domain filtering.
    
      
-   **Newsletter Engine**: Double opt-in confirmation email loop. Campaign segmentation and batch dispatching via Redis BullMQ queue workers.
    
      
-   **Security Certificate Verification API**: Endpoint `/api/v1/verify/:certificateId` queries the immutable audit registry and returns verified parameters (client pseudonym, scope, checksum).
    
      

## 5. Tier 3: Separated Admin & Dashboard Panel (admin.cyenetic.com)

The administrative panel must be fully responsive to allow on-the-go management and is housed on an isolated subdomain with strict zero-trust boundary controls.

  
### 5.1 Modules & Workspaces

#### Workspace 1: Content Studio (CMS)

-   **Blog & Advisory Management**: TipTap-based Markdown/WYSIWYG editor. Includes a boolean toggle to mark 1-2 posts as "Featured" for the public blog hero section.
    
      
-   **Case Studies Studio**: Form structure enforcing data entry for the core outline (Engagement, Challenge, Scope, Outcome)[cite: 4]. Includes client identifier toggles (Public Brand vs. Moniker), severity counters, and video proof embed management.
    
      
-   **Reports & Insights Vault**: Drag-and-drop PDF uploader with automated thumbnail generation and access gate configuration.
    
      
-   **Dynamic Team Management**: Full CRUD interface for adding, modifying, and deleting Management Team and Engineering Team profiles dynamically[cite: 4]. Allows immediate updates to roles such as CEO, COO, and CMO without code deployments[cite: 4].
    
      

#### Workspace 2: Growth & CRM Intelligence

-   **Inquiry & Scoping Pipeline**: Kanban board (`New` → `Scoping Call` → `RFP Review` → `Proposal Sent` → `Retainer Won` → `Lost`). Inspection of client-submitted technical scope.
    
      
-   **Lead Magnet & Report Download Analytics**: Granular breakdown of report downloads (Name, Work Email, Company, Timestamp) with corporate domain enrichment.
    
      

#### Workspace 3: Client Engagement War-Room (Operational Portal)

-   **Active Engagements Tracker**: Project timeline, testing mode (White-box, Black-box, Grey-box), assigned lead auditor[cite: 3].
    
      
-   **Live Findings Matrix**: CVSS v3.1/v4.0 scoring, affected endpoints, in-browser encrypted Video Proof playback, and Retest Ticket Lifecycle management[cite: 3].
    
      
-   **Executive Report Dispatcher**: One-click compilation of verified findings into watermarked, digitally signed PDF deliverables[cite: 3].
    
      

#### Workspace 4: Security & Governance

-   **Role-Based Access Control (RBAC)**: `Super Admin`, `Security Auditor`, `Content Editor`, `Client Viewer`[cite: 3].
    
      
-   **MFA Enforcement**: Hardware FIDO2/WebAuthn (YubiKey) or TOTP (Google Authenticator) mandatory for all staff[cite: 3].
    
      
-   **Immutable Audit Trail**: Append-only log recording all data modifications, credential access, and download actions[cite: 3].
    
      

## 6. Data Model (Database‑Agnostic)

This section expresses the platform's data model in an abstract, database-agnostic way so the implementation can use a relational store (Postgres / Neon / Supabase) or a document store (MongoDB) depending on operational needs. After the abstract model there are concise examples for both relational (Postgres) and document (Mongo) implementations and short mapping notes for Neon/Supabase.

### 6.1 Abstract Entity Definitions

- `User` — id, email, password_hash, full_name, role, mfa_enabled, mfa_secret, last_login_at, created_at, updated_at
- `BlogPost` — id, title, slug, summary, content_markdown, cover_image_url, is_featured, reading_time_minutes, is_published, published_at, author_id, meta_title, meta_description, created_at, updated_at
- `CaseStudy` — id, engagement, slug, client_name, is_anonymized, sector, challenge, scope_description, outcome, findings_summary (structured), video_proof_url, published_at, created_at, updated_at
- `TeamMember` — id, full_name, designation, bio, image_url, linkedin_url, sort_order, created_at, updated_at
- `ReportInsight` — id, title, slug, description, category, storage_path, is_gated, download_count, created_at, updated_at
- `ReportLead` — id, report_id, email, full_name, company_name, ip_address, downloaded_at
- `NewsletterSubscriber` — id, email, status, subscribed_at
- `Inquiry` — id, full_name, work_email, company, service_type, target_environment, scope_details, status, created_at
- `Engagement` — id, client_user_id, project_name, audit_type, status, start_date, lead_auditor_id, final_report_storage_path, created_at
- `Finding` — id, engagement_id, title, severity, cvss_score, affected_endpoint, poc_text, proof_video_storage_path, remediation_guidance, status, created_at
- `AuditCertificate` — id, certificate_code, engagement_id, client_display_name, sha256_checksum, created_at
- `AuditLog` — id, user_id, action, resource_type, ip_address, created_at

Notes:
- Use stable globally-unique identifiers: `UUID` for relational stores, `ObjectId` (BSON) for Mongo; both are acceptable — abstract the ID layer in the application.
- Represent richer or variable payloads (e.g., `findings_summary`) as a structured JSON / JSONB field in relational stores or as embedded documents in Mongo.

### 6.2 Postgres (Neon / Supabase) — concise example

Use Postgres for strong relational integrity, transactions, and Postgres-native features (RLS, JSONB, full-text search). Neon and Supabase are Postgres-compatible; schemas and migrations work the same as standard Postgres.

Example (condensed):

```sql
-- extensions: pgcrypto for gen_random_uuid() on managed platforms
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(150),
  role VARCHAR(50),
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES engagements(id),
  title TEXT NOT NULL,
  severity VARCHAR(50),
  cvss_score NUMERIC(3,1),
  affected_endpoint TEXT,
  poc_text TEXT,
  proof_video_storage_path TEXT,
  remediation_guidance TEXT,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- For variable JSON payloads
ALTER TABLE case_studies ADD COLUMN findings_summary JSONB;

-- Indexes for common lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_findings_engagement ON findings(engagement_id);
```

Notes for Neon / Supabase:
- Neon and Supabase are fully Postgres-compatible; use the same migrations and features. Supabase exposes REST and realtime APIs; Neon focuses on serverless Postgres. Both support `pgcrypto` or `uuid-ossp` via managed extensions (check provider docs).

### 6.3 MongoDB (Document) — example collections

Use Mongo when schema flexibility, horizontal scaling, or embedding related data is preferable (e.g., storing findings with embedded evidence). Keep in mind eventual consistency and lack of cross-document transactions in some patterns.

Example documents (illustrative):

`users` collection (Mongo):

```json
{
  "_id": {"$oid": "..."},
  "email": "alice@example.com",
  "password_hash": "...",
  "full_name": "Alice",
  "role": "auditor",
  "mfa_enabled": true,
  "mfa_secret": "...",
  "last_login_at": {"$date": "2026-01-01T00:00:00Z"},
  "created_at": {"$date": "2026-01-01T00:00:00Z"}
}
```

`findings` collection (Mongo) — embed small arrays like `evidence` or `steps` when it makes reads cheaper:

```json
{
  "_id": {"$oid": "..."},
  "engagement_id": {"$oid": "..."},
  "title": "SQL injection in /search",
  "severity": "critical",
  "cvss_score": 9.8,
  "affected_endpoint": "/api/search",
  "poc_text": "...",
  "evidence": [ { "type": "video", "path": "r2://..." } ],
  "remediation_guidance": "...",
  "status": "open",
  "created_at": {"$date": "..."}
}
```

Mapping guidance:
- Relations: in Mongo use references (`engagement_id`) or embed related documents. Prefer embedding for 1:N data that is read together (e.g., small `team_members` in a `team` doc) and referencing for large or frequently-updated relations (e.g., `users` ↔ `engagements`).
- Indexing: add indexes on `email`, `slug`, `engagement_id`, and any query fields used by filters.

### 6.4 Choosing patterns & trade-offs

- Relational (Postgres/Neon/Supabase): ACID, strong FK constraints, transactions, Row-Level Security (RLS), JSONB for semi-structured fields. Good for billing, multi-table transactions (e.g., engagements → findings → audit certificates).
- Document (Mongo): flexible schemas, easier horizontal scaling for large embedded payloads (video metadata, POC evidence), faster reads when embedding reduces joins. Less natural for complex joins or multi-document transactions (Mongo supports transactions but with caveats).

### 6.5 Practical migration / coexistence strategies

- Polyglot approach: keep canonical relational records for core transactional entities (`users`, `engagements`) in Postgres and offload large artifacts or read-optimized aggregations to Mongo or a search index (Elasticsearch / Meilisearch).
- Use change-data-capture (CDC) or event streams to synchronize selected data between Postgres and Mongo for materialized read models.
- If choosing Supabase: you get Postgres with immediate REST/realtime endpoints and a built-in auth layer. Neon provides serverless Postgres tuned for ephemeral workloads; both work with the Postgres DDL above.

### 6.6 Operational notes

- Schema migrations: use a migrations tool (Flyway/pg_migrate/Drizzle/Prisma Migrate) for Postgres; for Mongo use a versioned migration runner or deploy scripts that are idempotent.
- Backups & retention: managed backups for Neon/Supabase; set object lifecycle policies for pre-signed artifacts in R2/S3.
- Security: enforce encryption at rest, TLS, and RLS for sensitive tables. For Mongo, enforce network-level restrictions, field-level encryption for secrets, and strict IAM roles.

## 7. Security Hardening & Zero-Trust Architecture

As an offensive security firm, Cyenetic's own infrastructure adheres to stringent zero-trust standards[cite: 3]:

  
1.  **Network Layer Isolation**: The Admin and War-Room dashboards are guarded behind Cloudflare Access / Zero Trust with IP allowlisting or client-certificate authentication[cite: 3].
    
      
2.  **Storage Quarantine & Virus Scan**: User-submitted architecture diagrams and attachments upload to an isolated, non-public quarantine bucket; an asynchronous ClamAV daemon scans files before transferring to permanent storage[cite: 3].
    
      
3.  **Content Security Policy (CSP)**: Strict nonced script execution without `unsafe-inline` or `unsafe-eval`[cite: 3]. Frame ancestors disabled to eliminate clickjacking risks[cite: 3].
    
      
4.  **Transport & Storage Encryption**: Database encrypted with AES-256 at rest; TLS 1.3 only; strict HTTP Strict Transport Security (HSTS) with preloading[cite: 3].
    
      
5.  **Rate Limiting**: Tiered rate limiting managed via Redis (e.g., maximum 5 newsletter signups/minute per IP, 3 quote requests/hour)[cite: 3].
