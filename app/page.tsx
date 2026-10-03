import Link from 'next/link';
import StaffGate from '@/components/StaffGate';

/** Landing workspace reports implementation status rather than fabricated operating metrics. */
export default function DashboardPage() {
  const workspaces = [
    { title: 'Content Studio', href: '/content/services', status: 'Connected', description: 'Versioned services, articles, case studies, report metadata, and team records.' },
    { title: 'Growth & CRM', href: '/growth', status: 'Planned', description: 'Inquiry pipeline, lead analytics, and newsletter delivery.' },
    { title: 'Engagements', href: '/engagements', status: 'Planned', description: 'Staff operational workspace for engagements, findings, and retesting.' },
    { title: 'Governance', href: '/governance', status: 'Connected', description: 'Role-aware API access and immutable content audit events.' },
  ];
  return <><p className="font-mono text-xs uppercase tracking-widest text-cye-orange">Operations / Staff only</p><h1 className="my-8 font-display text-5xl uppercase sm:text-7xl">Cyenetic<br />Control.</h1><StaffGate><div className="grid gap-5 md:grid-cols-2">{workspaces.map((item) => <Link key={item.href} href={item.href} className="border border-white/20 p-7 hover:border-cye-orange"><p className="font-mono text-xs text-cye-orange">{item.status}</p><h2 className="mt-5 font-display text-3xl uppercase">{item.title}</h2><p className="mt-4 text-white/60">{item.description}</p></Link>)}</div></StaffGate></>;
}
