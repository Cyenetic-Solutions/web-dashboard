"use client";
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { fileSize, formatDate } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { mediaUrl, updateMedia, type MediaAsset } from '@/services/media';

/** File facts, alt text editing and an on-demand signed link. */
export default function MediaDetail({ asset, onUpdated }: { asset: MediaAsset; onUpdated: (asset: MediaAsset) => void }) {
  const { call } = useAuth();
  const [alt, setAlt] = useState(asset.altText ?? '');
  const [link, setLink] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  async function save() { try { onUpdated(await call((t) => updateMedia(asset.id, alt, t))); setMessage('Alt text saved'); } catch (e) { setMessage(e instanceof Error ? e.message : 'Save failed'); } }
  async function open() { try { setLink(await call((t) => mediaUrl(asset.id, t))); } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not create link'); } }
  const facts = [['Type', asset.mimeType], ['Size', fileSize(asset.sizeBytes)], ['Dimensions', asset.width ? `${asset.width} × ${asset.height}` : '—'], ['Bucket', asset.bucket], ['Scan', asset.scanStatus], ['Uploaded', formatDate(asset.createdAt, true)]];
  return <div className="space-y-5">
    <dl className="grid grid-cols-2 gap-3 text-sm">{facts.map(([k, v]) => <div key={k}><dt className="cye-label text-subtle">{k}</dt><dd className="mt-1 font-mono text-xs">{v}</dd></div>)}</dl>
    <div><p className="cye-label text-subtle">SHA-256</p><p className="mt-1 break-all font-mono text-xs">{asset.sha256}</p></div>
    <Input label="Alt text" value={alt} maxLength={300} onChange={(e) => setAlt(e.target.value)} hint="Describe the image for screen readers." />
    <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={save}>Save alt text</Button><Button type="button" variant="ghost" onClick={open}>Get signed link</Button></div>
    {link && <a href={link} target="_blank" rel="noreferrer noopener" className="block break-all font-mono text-xs text-accent-strong">{link}</a>}
    <p role="status" className="text-sm text-muted">{message}</p>
  </div>;
}
