// JSON-file persistence for the local dev API. Data lives in .dev-data/ (git-ignored) and survives restarts.
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const empty = () => ({
  users: [], sessions: [], content: [], legacyAudit: [], auditLogs: [], inquiries: [], notes: [],
  leads: [], subscribers: [], engagements: [], findings: [], retests: [], media: [], tokens: [], counters: {},
});

/** Opens (or creates) the store file and returns collection accessors plus `save()`. */
export function openStore(dir) {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'store.json');
  let data = empty();
  try { data = { ...empty(), ...JSON.parse(readFileSync(file, 'utf8')) }; } catch { /* first run */ }
  let timer = null;
  const flush = () => {
    timer = null;
    const temp = `${file}.tmp`;
    writeFileSync(temp, JSON.stringify(data, null, 2));
    renameSync(temp, file);
  };
  return {
    data,
    /** Schedules a write; writes are coalesced so bursts of mutations hit the disk once. */
    save() { if (!timer) timer = setTimeout(flush, 50); },
    flush() { if (timer) clearTimeout(timer); flush(); },
    id: () => randomUUID(),
    /** Monotonic per-name counter, e.g. for ENG-YYYY-#### codes. */
    next(name) { data.counters[name] = (data.counters[name] ?? 0) + 1; return data.counters[name]; },
  };
}

/**
 * Appends a hash-chained audit entry. Entries are never edited or removed by the dev API;
 * `verifyChain` recomputes the chain to detect tampering with the store file.
 */
export function appendAudit(store, entry) {
  const logs = store.data.auditLogs;
  const previousHash = logs.at(-1)?.hash ?? 'GENESIS';
  const record = { id: store.id(), actorEmail: entry.actorEmail ?? null, action: entry.action, resourceType: entry.resourceType,
    resourceId: entry.resourceId ?? null, summary: entry.summary ?? null, ipAddress: entry.ipAddress ?? null,
    createdAt: new Date().toISOString(), diff: entry.diff, actorName: entry.actorName ?? null };
  record.hash = hashEntry(record, previousHash);
  record.previousHash = previousHash;
  logs.push(record);
  store.save();
  return record;
}

function hashEntry(record, previousHash) {
  const { id, actorEmail, action, resourceType, resourceId, summary, ipAddress, createdAt, diff } = record;
  return createHash('sha256').update(previousHash).update(JSON.stringify({ id, actorEmail, action, resourceType, resourceId, summary, ipAddress, createdAt, diff })).digest('hex');
}

/** Recomputes every hash; reports the first entry whose stored hash no longer matches. */
export function verifyChain(store) {
  let previous = 'GENESIS';
  for (const entry of store.data.auditLogs) {
    if (entry.previousHash !== previous || hashEntry(entry, previous) !== entry.hash) return { valid: false, checked: store.data.auditLogs.length, firstBrokenId: entry.id };
    previous = entry.hash;
  }
  return { valid: true, checked: store.data.auditLogs.length, firstBrokenId: null };
}

/** Strips internal fields before an audit entry leaves the API. */
export function publicAudit(entry) {
  const copy = { ...entry };
  delete copy.hash; delete copy.previousHash; delete copy.actorName;
  return copy;
}
