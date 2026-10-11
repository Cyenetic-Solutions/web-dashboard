import StaffGate from '@/components/StaffGate';
import UsersFeature from '@/features/governance/UsersFeature';

/** Users and roles. */
export default function Page() { return <StaffGate permission="users:manage"><UsersFeature /></StaffGate>; }
