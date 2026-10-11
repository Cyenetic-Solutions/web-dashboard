import StaffGate from '@/components/StaffGate';
import EngagementDetail from '@/features/ops/EngagementDetail';

/** One engagement's war-room. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <StaffGate permission="engagements:read"><EngagementDetail id={(await params).id} /></StaffGate>;
}
