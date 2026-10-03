import Link from 'next/link';
/** Unknown workspace routes remain explicit 404s. */
export default function NotFound() { return <section><h1 className="font-display text-4xl uppercase">Workspace not found</h1><Link href="/" className="mt-6 inline-block text-cye-orange">Return to overview →</Link></section>; }
