# Changelog

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
