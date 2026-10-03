# Validation record — 2026-10-03

Validation used Node.js 24 locally and the production Node.js 22 Alpine Docker build. These are observed local checks, not claims that remote GitHub jobs or a VPS deployment have run.

| Check | Result |
| --- | --- |
| ESLint | Passed |
| Architecture boundaries and strict TypeScript | Passed |
| Production build | Passed |
| Locked install and Docker production build on Node 22 | Passed |
| Production npm dependency audit | Zero reported vulnerabilities |
| Workflow YAML and embedded shell syntax | Passed |
| Exact architecture and HTML reference copies | Verified against source files |

Dashboard unit suite: **2 tests passed** for invalid/valid editing and role-limited publishing controls. Playwright: **2 scenarios passed**, one each on desktop Chromium and mobile Pixel 7, covering session connection, publishing, starting a fresh record after a save, viewport overflow and logout. Browser suite mocks the HTTP boundary; authorization/persistence are verified in backend tests.

A separate live browser check used the actual demo API to publish a domain with a subdomain, verified public catalog output, and displayed the resulting audit event. Template comparison confirmed all **16 exact embedded font declarations**, the unchanged HTML reference, and matching API/client schemas. Desktop/mobile screenshots are generated in ignored test-results directories.

The Node 22 production container served /login successfully, ran as the non-root nextjs user, and reached Docker healthy status. Its response contained a script nonce CSP without unsafe-eval. No VPS deployment was performed.

The production dependency audit is clear. The full audit has five high-severity development-only entries from the single braces advisory in the Next.js ESLint chain. See DEVELOPER_GUIDE.md for details; no incompatible lint-tool downgrade was applied.
