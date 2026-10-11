import type { ReactNode } from 'react';
import { ApiError } from '@/services/http';

/** Empty collection message with an optional primary action. */
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="border border-dashed border-line-strong p-8 text-center"><p aria-hidden="true" className="font-mono text-2xl text-accent">∅</p>
    <h2 className="mt-3 font-semibold">{title}</h2>{children && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}</div>;
}
/** Skeleton rows that approximate the final layout. */
export function Skeleton({ rows = 4, className = 'h-14' }: { rows?: number; className?: string }) {
  return <div role="status" aria-label="Loading" className="space-y-2">{Array.from({ length: rows }, (_, i) => <div key={i} className={`animate-pulse bg-surface-2 ${className}`} />)}</div>;
}
/** Error panel; distinguishes a backend module that is not available from a failed request. */
export function ErrorState({ error, onRetry, module }: { error: unknown; onRetry?: () => void; module?: string }) {
  if (error instanceof ApiError && error.unavailable && module) return <div className="border border-line bg-surface p-6">
    <p className="cye-label text-warning">API module not connected</p>
    <h2 className="mt-2 font-semibold">{module} is not served by the connected backend yet</h2>
    <p className="mt-2 max-w-2xl text-sm text-muted">This screen is built against the documented admin API contract. It shows live records once the backend implements this module. No sample data is displayed in its place.</p></div>;
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  return <div role="alert" className="border border-danger p-6"><p className="cye-label text-danger">Request failed</p><p className="mt-2 text-sm">{message}</p>
    {requestId && <p className="mt-1 font-mono text-xs text-muted">Request {requestId}</p>}
    {onRetry && <button onClick={onRetry} className="mt-4 min-h-11 border border-line-strong px-4 font-mono text-xs uppercase hover:border-accent">Retry</button>}</div>;
}
/** Renders loading, error or content for an async resource. */
export function Async<T>({ state, module, children, rows }: { state: { data: T | undefined; error: unknown; loading: boolean; reload: () => void }; module?: string; rows?: number; children: (data: T) => ReactNode }) {
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} module={module} />;
  if (state.loading || state.data === undefined) return <Skeleton rows={rows} />;
  return children(state.data);
}
