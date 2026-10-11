"use client";
import Button from '@/components/ui/Button';
import { Async, EmptyState } from '@/components/ui/States';
import { formatDate } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { useResource } from '@/providers/useResource';
import { listSessions, revokeSession } from '@/services/governance';

function device(ua: string | null) {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
  return `${browser} on ${os}`;
}
/** Active sign-in sessions with per-session and bulk revoke. */
export default function SessionsPanel() {
  const { call } = useAuth();
  const state = useResource(listSessions, 'sessions');
  async function revoke(id: string | null) { await call((t) => revokeSession(id, t)); state.setData((l) => l?.filter((s) => (id ? s.id !== id : s.current))); }
  return <Async state={state} module="Account sessions">{(sessions) => sessions.length ? <div className="space-y-3">
    <ul className="space-y-2">{sessions.map((s) => <li key={s.id} className="flex flex-wrap items-center gap-3 border border-line bg-surface p-4">
      <div className="min-w-0 flex-1"><p className="text-sm font-medium">{device(s.userAgent)}{s.current && <span className="ml-2 font-mono text-[11px] text-success">this device</span>}</p>
        <p className="font-mono text-[11px] text-subtle">{s.ipAddress ?? '—'} · last used {formatDate(s.lastUsedAt, true)}</p></div>
      {!s.current && <Button size="sm" variant="danger" onClick={() => void revoke(s.id)}>Revoke</Button>}</li>)}</ul>
    {sessions.length > 1 && <Button variant="secondary" onClick={() => void revoke(null)}>Sign out all other sessions</Button>}
  </div> : <EmptyState title="No active sessions" />}</Async>;
}
