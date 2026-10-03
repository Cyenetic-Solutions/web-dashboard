import StaffGate from '@/components/StaffGate';
import AuditFeature from '@/features/governance/AuditFeature';
/** Composition entry for the privileged audit workspace. */
export default function GovernancePage() { return <StaffGate><AuditFeature /></StaffGate>; }
