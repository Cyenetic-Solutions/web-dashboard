import { redirect } from 'next/navigation';

/** Governance landing goes to the audit log. */
export default function GovernancePage() { redirect('/governance/audit-log'); }
