import StaffGate from '@/components/StaffGate';
import DashboardFeature from '@/features/dashboard/DashboardFeature';

/** Dashboard overview with live, role-scoped metrics. */
export default function DashboardPage() { return <StaffGate permission="dashboard:view"><DashboardFeature /></StaffGate>; }
