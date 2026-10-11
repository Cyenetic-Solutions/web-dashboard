import StaffGate from '@/components/StaffGate';
import CertificatesFeature from '@/features/ops/CertificatesFeature';

/** Certificate registry. */
export default function Page() { return <StaffGate permission="engagements:read"><CertificatesFeature /></StaffGate>; }
