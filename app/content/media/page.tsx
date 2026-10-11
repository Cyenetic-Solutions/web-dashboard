import StaffGate from '@/components/StaffGate';
import MediaFeature from '@/features/media/MediaFeature';

/** Media library workspace. */
export default function MediaPage() { return <StaffGate permission="content:read"><MediaFeature /></StaffGate>; }
