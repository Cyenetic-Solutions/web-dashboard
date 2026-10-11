import StaffGate from '@/components/StaffGate';
import LeadsFeature from '@/features/crm/LeadsFeature';

/** Report download analytics workspace. */
export default function Page() { return <StaffGate permission="crm:read"><LeadsFeature /></StaffGate>; }
