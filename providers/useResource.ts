"use client";
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';

/** Loading/error/data state for one authorized resource. */
export interface Resource<T> { data: T | undefined; error: unknown; loading: boolean; reload: () => void; setData: (update: (current: T | undefined) => T | undefined) => void }

/** Loads an authorized resource, cancelling on dependency or session changes; `key` changes trigger a reload. */
export function useResource<T>(load: (token: string, signal: AbortSignal) => Promise<T>, key: string): Resource<T> {
  const { call, status } = useAuth();
  const [tick, setTick] = useState(0);
  const request = `${key}#${tick}`;
  const [state, setState] = useState<{ request: string; data: T | undefined; error: unknown }>({ request: '', data: undefined, error: null });
  useEffect(() => {
    if (status !== 'authenticated') return;
    const controller = new AbortController();
    call((token) => load(token, controller.signal))
      .then((data) => { if (!controller.signal.aborted) setState({ request, data, error: null }); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setState({ request, data: undefined, error }); });
    return () => controller.abort();
    // `load` is recreated each render; `key` captures its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, status, call]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((update: (current: T | undefined) => T | undefined) => setState((s) => ({ ...s, data: update(s.data) })), []);
  const loading = state.request !== request;
  return { data: loading && state.error ? undefined : state.data, error: loading ? null : state.error, loading, reload, setData };
}
