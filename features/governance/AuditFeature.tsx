"use client";
import { useEffect, useState } from 'react';
import { listAudit } from '@/services/api';
import { useAuth } from '@/providers/AuthProvider';
/** Lists persisted audit events only for the administrator role. */
export default function AuditFeature() {
  const { token, session } = useAuth();
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof listAudit>>>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!token || session?.role !== 'Super Admin') return;
    const controller = new AbortController();
    listAudit(token, controller.signal).then(setEntries).catch(() => { if (!controller.signal.aborted) setError('Audit events could not be loaded.'); });
    return () => controller.abort();
  }, [token, session]);
  if (session?.role !== 'Super Admin') return <p>Only Super Admin can read the audit trail.</p>;
  return <><h1 className="mb-8 font-display text-4xl uppercase">Audit trail</h1><p role="alert">{error}</p><div className="space-y-3">{entries.map((entry) => <article key={entry.id} className="border border-white/20 p-5"><h2 className="font-mono text-sm text-cye-orange">{entry.action} / {entry.record.slug}</h2><p className="mt-3 break-all text-sm text-white/60">{entry.actor} · {entry.createdAt} · v{entry.record.version}</p></article>)}</div></>;
}
