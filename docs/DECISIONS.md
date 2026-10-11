# Dashboard decisions

Short records of choices made while building the full admin design (2026-10). Each lists what was chosen and why.

1. **Next.js App Router stays.** `admin.md` suggests Vite, but AGENTS.md and the existing slice use Next.js 16, React 19 and Tailwind 4. The pages follow admin.md's layout and behaviour on that stack. There are no `app/api` routes and no database access.
2. **Second factor is an emailed code, not an authenticator app.** This is the owner's request. The API generates and sends the code over SMTP. See [AUTH_EMAIL_OTP.md](AUTH_EMAIL_OTP.md) for the contract and the security trade-off.
3. **Tokens stay in memory.** The access token lives in React state. Sessions survive a reload only through the API's HttpOnly refresh cookie. The theme choice is the only thing stored in `localStorage`.
4. **Publishing stays Super Admin only.** admin.md lets Content Editors publish, but the current backend does not. The permission matrix (`services/permissions.ts`) mirrors the backend so the UI never offers an action the API will refuse.
5. **Missing API modules are shown as missing.** A 404 or 501 from an admin endpoint renders "API module not connected". The dashboard never fills the page with sample data.
6. **Uploads are real or disabled.** Media upload posts multipart data to the API with progress. Report PDF upload on the content form is disabled with an explanation, because no private storage endpoint exists yet.
7. **CVSS 3.1 is calculated, CVSS 4.0 is validated.** The 3.1 calculator follows the FIRST formula and its Roundup rule, and is unit-tested against known vectors. 4.0 vectors are checked for structure, and the score is entered by hand from the FIRST calculator until a verified 4.0 implementation is added.
8. **Severity colours follow admin.md.** Critical #DC2626, High #FF5C00, Medium #EAB308, Low #3B82F6, Info #737373.
9. **Audit log falls back to the legacy endpoint.** The page reads `/admin/audit-logs` and falls back to `/admin/audit` from the existing slice, labelling the view as legacy. Chain verification is offered only when the new endpoint exists.
10. **Certificates and emails are API actions.** Issuing a certificate, inviting staff and resending invites all call the API. The dashboard reports what the API returns and never shows success on its own.
