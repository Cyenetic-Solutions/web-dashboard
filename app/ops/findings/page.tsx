import StaffGate from '@/components/StaffGate';
import FindingsFeature from '@/features/ops/FindingsFeature';

/** Global findings matrix. */
export default function Page() { return <StaffGate permission="findings:read"><FindingsFeature /></StaffGate>; }
