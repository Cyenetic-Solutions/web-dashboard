import StaffGate from '@/components/StaffGate';
import AuditLogFeature from '@/features/governance/AuditLogFeature';

/** Immutable audit trail. */
export default function Page() { return <StaffGate permission="audit:read"><AuditLogFeature /></StaffGate>; }
