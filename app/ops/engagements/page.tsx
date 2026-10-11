import StaffGate from '@/components/StaffGate';
import EngagementsFeature from '@/features/ops/EngagementsFeature';

/** Engagement tracker. */
export default function Page() { return <StaffGate permission="engagements:read"><EngagementsFeature /></StaffGate>; }
