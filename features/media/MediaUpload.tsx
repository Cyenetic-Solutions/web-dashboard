"use client";
import { useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/providers/AuthProvider';
import { purposes, uploadMedia, type MediaAsset } from '@/services/media';
import { label } from '@/components/format';

/** File picker that uploads through the API with a progress bar; nothing is marked uploaded until the API confirms. */
export default function MediaUpload({ onUploaded }: { onUploaded: (asset: MediaAsset) => void }) {
  const { call } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [purpose, setPurpose] = useState<(typeof purposes)[number]>('blog-cover');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  async function upload(file: File) {
    setError(''); setProgress(0);
    try { onUploaded(await call((token) => uploadMedia(file, purpose, token, setProgress))); }
    catch (err) { setError(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setProgress(null); if (input.current) input.current.value = ''; }
  }
  return <div className="flex flex-col gap-2 sm:items-end">
    <div className="flex gap-2">
      <select aria-label="Upload purpose" value={purpose} onChange={(e) => setPurpose(purposes.find((p) => p === e.target.value) ?? 'blog-cover')} className="min-h-11 border border-line bg-surface-2 px-2 text-sm">
        {purposes.map((p) => <option key={p} value={p}>{label(p.replace('-', '_'))}</option>)}</select>
      <Button type="button" onClick={() => input.current?.click()} loading={progress !== null}>Upload file</Button>
      <input ref={input} type="file" hidden accept="image/png,image/jpeg,image/webp,application/pdf,video/mp4,video/webm" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
    </div>
    {progress !== null && <div className="h-1 w-full bg-surface-3 sm:w-64" role="progressbar" aria-label="Upload progress" aria-valuenow={Math.round(progress * 100)}><div className="h-full bg-accent" style={{ width: `${progress * 100}%` }} /></div>}
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
  </div>;
}
