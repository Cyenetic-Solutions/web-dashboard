"use client";
import PageHeader from '@/components/ui/PageHeader';
import { Async } from '@/components/ui/States';
import { useResource } from '@/providers/useResource';
import { getFinding } from '@/services/ops';
import FindingEditor from './FindingEditor';

/** Loads one finding into the editor, or opens a blank editor for an engagement. */
export default function FindingPage({ id, engagementId }: { id?: string; engagementId?: string }) {
  const state = useResource((t, s) => (id ? getFinding(id, t, s) : Promise.resolve(null)), id ?? `new-${engagementId}`);
  return <Async state={state} module="Findings" rows={6}>{(finding) => <>
    <PageHeader eyebrow={`War-Room / ${finding?.engagementCode ?? 'Findings'}`} title={finding ? `${finding.referenceCode} · ${finding.title}` : 'New finding'} />
    <FindingEditor finding={finding ?? undefined} engagementId={finding?.engagementId ?? engagementId} />
  </>}</Async>;
}
