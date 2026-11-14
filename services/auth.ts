import { z } from 'zod';
import { request } from './http';

/** Six-digit numeric one-time code delivered by email. */
export const otpCode = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from the email');
export const emailSchema = z.email('Enter a valid work email').trim().toLowerCase().max(255);
/** Staff password policy mirrored from the API (server remains authoritative). */
export const passwordSchema = z.string().min(12, 'Use at least 12 characters').max(256);

/** Raw email-code challenge as returned by the API (absolute timestamps, opaque challenge id). The live API omits `codeRequired`. */
const apiChallengeSchema = z.object({ codeRequired: z.literal(true).optional(), challengeId: z.string().min(1),
  expiresAt: z.string(), resendAvailableAt: z.string(), maskedEmail: z.string() });
/** Pending email-OTP challenge: the opaque token identifies it; the code itself only exists in the email. */
export interface OtpChallenge { otpToken: string; deliveredTo: string; expiresInSeconds: number; resendAfterSeconds: number }
/** Converts the API's absolute expiry/resend timestamps into the countdown seconds the UI consumes. */
function toChallenge(raw: z.infer<typeof apiChallengeSchema>): OtpChallenge {
  const now = Date.now();
  const secondsUntil = (iso: string) => Math.max(0, Math.round((Date.parse(iso) - now) / 1000));
  return { otpToken: raw.challengeId, deliveredTo: raw.maskedEmail,
    expiresInSeconds: Math.max(1, secondsUntil(raw.expiresAt)), resendAfterSeconds: secondsUntil(raw.resendAvailableAt) };
}
/** Token pair from verify/refresh. The live API returns the opaque refresh token in the body and rotates it on every refresh. */
const tokenSchema = z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(32).max(256),
  expiresInSeconds: z.number().int().positive().optional() });
/** Access and rotating refresh token, both kept in tab memory only. */
export type TokenPair = z.infer<typeof tokenSchema>;

/** Step 1: verifies email + password; the API then emails a one-time code over SMTP. */
export async function startLogin(email: string, password: string) {
  return toChallenge(apiChallengeSchema.parse(await request('/api/v1/auth/login', { method: 'POST', body: { email, password } })));
}
/** Step 2: exchanges the emailed code for an access token and a refresh token. */
export async function verifyOtp(otpToken: string, code: string): Promise<TokenPair> {
  return tokenSchema.parse(await request('/api/v1/auth/login/verify', { method: 'POST', body: { challengeId: otpToken, code } }));
}
/** Requests a fresh code for the same challenge, subject to server-side cooldown and rate limits. */
export async function resendOtp(otpToken: string) {
  return toChallenge(apiChallengeSchema.parse(await request('/api/v1/auth/login/resend', { method: 'POST', body: { challengeId: otpToken } })));
}
/** Exchanges the current refresh token for a new pair; the old refresh token stops working. */
export async function refreshSession(refreshToken: string): Promise<TokenPair> {
  return tokenSchema.parse(await request('/api/v1/auth/refresh', { method: 'POST', body: { refreshToken } }));
}
/** Revokes the server session that owns this refresh token. */
export async function logout(refreshToken: string) {
  await request('/api/v1/auth/logout', { method: 'POST', body: { refreshToken } });
}
/** Always accepted by the API to avoid account enumeration; a reset link is emailed when the account exists. */
export async function forgotPassword(email: string) {
  await request('/api/v1/auth/password/forgot', { method: 'POST', body: { email } });
}
/** Sets a new password from an emailed reset token; the API revokes all sessions. */
export async function resetPassword(token: string, password: string) {
  await request('/api/v1/auth/password/reset', { method: 'POST', body: { token, password } });
}
/** Activates an invited account with its first password; sign-in then uses the email OTP flow. */
export async function acceptInvite(token: string, password: string) {
  await request('/api/v1/auth/invite/accept', { method: 'POST', body: { token, password } });
}

/** Rule checklist shown beside password fields. */
export function passwordRules(password: string, email = '') {
  const local = email.split('@')[0]?.toLowerCase() ?? '';
  return [
    { label: 'At least 12 characters', ok: password.length >= 12 },
    { label: 'Upper and lower case letters', ok: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: 'A number or symbol', ok: /[\d\W_]/.test(password) },
    { label: 'Does not contain your email name', ok: !local || local.length < 3 || !password.toLowerCase().includes(local) },
  ];
}
