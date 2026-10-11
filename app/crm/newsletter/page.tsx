import StaffGate from '@/components/StaffGate';
import NewsletterFeature from '@/features/crm/NewsletterFeature';

/** Newsletter subscribers workspace. */
export default function Page() { return <StaffGate permission="crm:read"><NewsletterFeature /></StaffGate>; }
