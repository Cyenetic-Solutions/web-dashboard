"use client";
import type { ReactNode } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import type { Permission } from '@/services/permissions';
import { LinkButton } from './ui/Button';
import { Skeleton } from './ui/States';

/** Presentation gate only; every private API operation independently verifies identity and role. */
export default function StaffGate({ children, permission }: { children: ReactNode; permission?: Permission }) {
  const { status, can } = useAuth();
  if (status === 'restoring') return <div className="mx-auto max-w-5xl p-6"><Skeleton rows={5} /></div>;
  if (status !== 'authenticated') return <section className="mx-auto mt-[12vh] max-w-lg border border-line bg-surface p-8">
    <p className="cye-label text-accent-strong">Restricted</p><h1 className="mt-2 font-display text-3xl uppercase">Staff session required</h1>
    <p className="mt-3 text-sm text-muted">Sign in with your staff email, password and the one-time code we email you.</p>
    <LinkButton href="/login" className="mt-6">Sign in →</LinkButton></section>;
  if (permission && !can(permission)) return <section className="border border-line bg-surface p-8"><p className="cye-label text-danger">403 · Forbidden</p>
    <h1 className="mt-2 text-2xl font-semibold">Your role cannot open this workspace</h1><p className="mt-2 text-sm text-muted">Ask a Super Admin if you need access.</p>
    <LinkButton href="/" variant="secondary" className="mt-6">Back to dashboard</LinkButton></section>;
  return children;
}
