import { z } from 'zod';
import { request } from './http';

/** Six-digit numeric one-time code delivered by email. */
export const otpCode = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from the email');
export const emailSchema = z.email('Enter a valid work email').trim().toLowerCase().max(255);
/** Staff password policy mirrored from the API (server remains authoritative). */
export const passwordSchema = z.string().min(12, 'Use at least 12 characters').max(256);

const challengeSchema = z.object({ otpRequired: z.literal(true), otpToken: z.string().min(1),
  deliveredTo: z.string(), expiresInSeconds: z.number().int().positive(), resendAfterSeconds: z.number().int().nonnegative() });
/** Pending email-OTP challenge: the opaque token identifies it; the code itself only exists in the email. */
export type OtpChallenge = z.infer<typeof challengeSchema>;
const tokenSchema = z.object({ accessToken: z.string().min(1), expiresInSeconds: z.number().int().positive().optional() });
const authCookie = { credentials: 'include' as const, headers: { 'X-Requested-With': 'cyenetic-admin' } };

/** Step 1: verifies email + password; the API then emails a one-time code over SMTP. */
export async function startLogin(email: string, password: string) {
  return challengeSchema.parse(await request('/api/v1/auth/login', { method: 'POST', body: { email, password } }));
}
/** Step 2: exchanges the emailed code for an access token; the API sets the HttpOnly refresh cookie. */
export async function verifyOtp(otpToken: string, code: string) {
  return tokenSchema.parse(await request('/api/v1/auth/otp/verify', { method: 'POST', body: { otpToken, code }, ...authCookie }));
}
/** Requests a fresh code for the same challenge, subject to server-side cooldown and rate limits. */
export async function resendOtp(otpToken: string) {
  return challengeSchema.omit({ otpRequired: true, otpToken: true }).parse(await request('/api/v1/auth/otp/resend', { method: 'POST', body: { otpToken } }));
}
/** Restores a session from the HttpOnly refresh cookie (rotated server-side on every use). */
export async function refreshSession() {
  return tokenSchema.parse(await request('/api/v1/auth/refresh', { method: 'POST', ...authCookie }));
}
/** Revokes the current server session and clears the refresh cookie. */
export async function logout(token: string | null) {
  await request('/api/v1/auth/logout', { method: 'POST', token, ...authCookie });
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
