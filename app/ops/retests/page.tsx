import StaffGate from '@/components/StaffGate';
import RetestsFeature from '@/features/ops/RetestsFeature';

/** Retest queue. */
export default function Page() { return <StaffGate permission="findings:read"><RetestsFeature /></StaffGate>; }
