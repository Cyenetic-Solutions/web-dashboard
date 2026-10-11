"use client";
import { useEffect, useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import OtpInput from '@/components/ui/OtpInput';
import { ApiError } from '@/services/http';
import { otpCode, resendOtp, verifyOtp, type OtpChallenge } from '@/services/auth';

function clock(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

/** Factor 2: the 6-digit code emailed through the API's SMTP mail server. Expiry and resend cooldown come from the API. */
export default function OtpStep({ challenge, email, onVerified, onRestart }: { challenge: OtpChallenge; email: string; onVerified: (accessToken: string) => Promise<void>; onRestart: () => void }) {
  const [current, setCurrent] = useState(challenge);
  const [issuedAt, setIssuedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const elapsed = Math.floor((now - issuedAt) / 1000);
  const expiresIn = Math.max(0, current.expiresInSeconds - elapsed);
  const resendIn = Math.max(0, current.resendAfterSeconds - elapsed);

  async function submit(event?: FormEvent, value = code) {
    event?.preventDefault();
    const parsed = otpCode.safeParse(value);
    if (!parsed.success) { setMessage({ tone: 'error', text: parsed.error.issues[0]?.message ?? 'Invalid code' }); return; }
    setPending(true); setMessage(null);
    try { const { accessToken } = await verifyOtp(current.otpToken, parsed.data); await onVerified(accessToken); }
    catch (err) {
      setCode('');
      if (err instanceof ApiError && err.status === 410) setMessage({ tone: 'error', text: 'This code has expired. Request a new one.' });
      else if (err instanceof ApiError && err.status === 429) setMessage({ tone: 'error', text: 'Too many incorrect codes. Start sign-in again.' });
      else if (err instanceof ApiError && err.status === 401) setMessage({ tone: 'error', text: 'That code is incorrect. Check the latest email and try again.' });
      else setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Verification failed' });
    } finally { setPending(false); }
  }
  async function resend() {
    setPending(true); setMessage(null);
    try { const next = await resendOtp(current.otpToken); setCurrent({ ...current, ...next }); setIssuedAt(Date.now()); setNow(Date.now()); setCode(''); setMessage({ tone: 'info', text: `A new code was sent to ${next.deliveredTo}.` }); }
    catch (err) { setMessage({ tone: 'error', text: err instanceof ApiError && err.status === 429 ? 'Please wait before requesting another code.' : err instanceof Error ? err.message : 'Could not resend the code' }); }
    finally { setPending(false); }
  }
  function change(value: string) { setCode(value); if (value.length === 6 && !pending) void submit(undefined, value); }

  return <form onSubmit={submit} className="space-y-6">
    <div><p className="cye-label text-accent-strong">Step 2 of 2 · Email verification</p><h1 className="mt-2 font-display text-4xl uppercase">Check your inbox</h1>
      <p className="mt-2 text-sm text-muted">We sent a 6-digit code to <span className="font-mono text-ink">{current.deliveredTo}</span>. It expires in <span className="font-mono text-ink" aria-live="off">{clock(expiresIn)}</span>.</p></div>
    <OtpInput value={code} onChange={change} disabled={pending || expiresIn === 0} invalid={message?.tone === 'error'} />
    <p role={message?.tone === 'error' ? 'alert' : 'status'} className={`min-h-5 text-sm ${message?.tone === 'error' ? 'text-danger' : 'text-success'}`}>{expiresIn === 0 && !message ? 'This code has expired. Request a new one.' : message?.text}</p>
    <Button type="submit" size="lg" loading={pending} disabled={expiresIn === 0} className="w-full">Verify and sign in</Button>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <button type="button" onClick={resend} disabled={pending || resendIn > 0} className="min-h-11 text-accent-strong disabled:text-subtle">{resendIn > 0 ? `Resend code in ${clock(resendIn)}` : 'Resend code'}</button>
      <button type="button" onClick={onRestart} className="min-h-11 text-muted hover:text-ink">Not {email}? Start over</button>
    </div>
    <p className="border-l-2 border-line-strong pl-3 text-xs text-muted">Didn&apos;t get it? Check spam or quarantine folders. Never share this code: Cyenetic staff will never ask for it.</p>
  </form>;
}
