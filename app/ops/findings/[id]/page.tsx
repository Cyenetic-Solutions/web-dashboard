import StaffGate from '@/components/StaffGate';
import FindingPage from '@/features/ops/FindingPage';

/** Finding detail and editor. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <StaffGate permission="findings:read"><FindingPage id={(await params).id} /></StaffGate>;
}
