import { notFound } from 'next/navigation';
import StaffGate from '@/components/StaffGate';
import ContentFeature from '@/features/content/ContentFeature';
import { kindSchema } from '@/services/content.schema';
/** Composes the CMS domain selected by the route, with no raw transport in pages. */
export default async function ContentPage({ params }: { params: Promise<{ kind: string }> }) {
  const result = kindSchema.safeParse((await params).kind);
  if (!result.success) notFound();
  return <StaffGate><ContentFeature key={result.data} kind={result.data} /></StaffGate>;
}
