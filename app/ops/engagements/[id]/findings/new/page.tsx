import StaffGate from '@/components/StaffGate';
import FindingPage from '@/features/ops/FindingPage';

/** New finding for an engagement. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <StaffGate permission="findings:write"><FindingPage engagementId={(await params).id} /></StaffGate>;
}
