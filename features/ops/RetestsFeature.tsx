import PageHeader from '@/components/ui/PageHeader';
import RetestQueue from './RetestQueue';

/** Global retest queue. */
export default function RetestsFeature() {
  return <><PageHeader eyebrow="War-Room" title="Retests" description="Remediation verification tickets across your engagements." /><RetestQueue /></>;
}
