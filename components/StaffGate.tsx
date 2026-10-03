"use client";
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAuth } from '@/providers/AuthProvider';
/** Presentation gate only; every private API operation independently verifies identity. */
export default function StaffGate({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!session) return <section className="border border-white/20 p-8"><h2 className="font-display text-3xl uppercase">Staff session required</h2><p className="mt-4 text-white/60">Connect your verified MFA session to access this workspace.</p><Link href="/login" className="mt-6 inline-flex min-h-12 items-center bg-cye-orange px-6 font-mono text-xs uppercase text-black">Sign in →</Link></section>;
  return children;
}
