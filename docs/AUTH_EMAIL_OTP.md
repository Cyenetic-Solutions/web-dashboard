# Staff sign-in: email one-time code contract

The dashboard signs staff in with email and password, then a 6-digit code **emailed by the API over SMTP**. No authenticator app is used. The dashboard implements its half of this flow (`services/auth.ts`, `features/auth/`). The API half is **not implemented yet**: until `cyenetic-backend` ships these endpoints, real sign-in fails and only the loopback demo works locally.

The dashboard never generates, sees or sends the code. It only forwards what the person types.

## Endpoints the API must provide

All paths are under `/api/v1/auth`. Responses use the usual `{ data }` / `{ error: { code, message, details, requestId } }` envelopes.

| Method and path | Body | Success `data` | Notes |
| --- | --- | --- | --- |
| `POST /login` | `{ email, password }` | `{ otpRequired: true, otpToken, deliveredTo, expiresInSeconds, resendAfterSeconds }` | Verify the password, create a challenge, email the code. `deliveredTo` is masked (`r***@cyenetic.com`). |
| `POST /otp/verify` | `{ otpToken, code }` | `{ accessToken, expiresInSeconds? }` | Sets the HttpOnly refresh cookie. Consumes the challenge. |
| `POST /otp/resend` | `{ otpToken }` | `{ deliveredTo, expiresInSeconds, resendAfterSeconds }` | Issues a new code and invalidates the previous one. |
| `POST /refresh` | none (cookie) | `{ accessToken, expiresInSeconds? }` | Rotates the refresh cookie on every use. |
| `POST /logout` | none (cookie + bearer) | empty | Revokes the session and clears the cookie. |
| `POST /password/forgot` | `{ email }` | empty | Always 202, whether or not the account exists. Emails a reset link. |
| `POST /password/reset` | `{ token, password }` | empty | Revokes every session for the account. |
| `POST /invite/accept` | `{ token, password }` | empty | Activates an invited account. Its next sign-in uses the email code. |

The dashboard then calls `GET /api/v1/admin/session` with the bearer token to learn the staff role, name and email.

## Status codes the dashboard handles

- `401 invalid_credentials` or `423 account_locked` on `/login`: one generic "Invalid email or password" message.
- `401 invalid_code` on `/otp/verify`: "That code is incorrect". The person can retry.
- `410 code_expired` on `/otp/verify`: the dashboard asks for a new code.
- `429` on `/login` or `/otp/resend`: asks the person to wait. On `/otp/verify` it means the attempt limit was hit, and the person starts sign-in again. The resend button also waits out `resendAfterSeconds`.
- `401` on `/refresh`: treated as signed out, with no error shown.

## Security requirements for the API

- Generate codes with a CSPRNG, 6 digits, uniformly distributed.
- Store only a hash of the code (HMAC-SHA-256 with a server secret, or Argon2id) bound to the challenge id, never the plain code.
- Codes are single use and expire after 5 to 10 minutes. A new code invalidates the old one.
- Allow at most 5 wrong attempts per challenge, then void it. Rate-limit `/login` and `/otp/resend` per account and per IP (Redis in production).
- Use a resend cooldown of about 30 to 60 seconds. Return it as `resendAfterSeconds`.
- Compare codes in constant time. Return the same `/login` error for unknown accounts and wrong passwords.
- The `otpToken` is opaque, random and short-lived. It grants nothing on its own.
- Refresh cookie: `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`. Require the `X-Requested-With: cyenetic-admin` header on cookie requests as a CSRF check.
- CORS must allow the dashboard origin with `credentials: true`. A wildcard origin will not work.
- Audit every sign-in, failed code, resend, lockout, password reset and logout. Never log the code or the password.

## SMTP delivery

The API sends mail through an SMTP relay configured by environment variables. Suggested names: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_SECURE`. Keep these secrets in the API's server environment only. They never go into this repository or any `NEXT_PUBLIC_` variable.

- Use TLS (port 465, or 587 with STARTTLS). Refuse to send in production without TLS.
- Set up SPF, DKIM and DMARC for the sending domain so codes are not marked as spam.
- The email holds the code, its expiry time and a line saying staff should ignore it if they did not try to sign in. It contains no link that signs the person in.
- If SMTP fails, `/login` returns `503 delivery_failed` and creates no usable challenge. The dashboard shows that error. It never pretends a code was sent.

## Trade-off

Email codes are weaker than WebAuthn or an authenticator app, because anyone who controls the mailbox can sign in. This method was chosen by the project owner. Protect staff mailboxes with their own MFA. The Account page shows passkeys as "coming soon", not as available.
