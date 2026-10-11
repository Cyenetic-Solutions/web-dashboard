import StaffGate from '@/components/StaffGate';
import InquiriesFeature from '@/features/crm/InquiriesFeature';

/** Inquiry pipeline workspace. */
export default function Page() { return <StaffGate permission="crm:read"><InquiriesFeature /></StaffGate>; }
