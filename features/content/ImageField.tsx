"use client";
/* eslint-disable @next/next/no-img-element -- previews show editor-supplied https URLs; next/image would need every host allow-listed. */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import type { UploadedImage } from '@/components/ui/MarkdownEditor';
import { useAuth } from '@/providers/AuthProvider';
import { ApiError } from '@/services/http';
import { uploadMedia, type purposes } from '@/services/media';
import type { ImageRef } from '@/services/content.schema';

const types = ['image/jpeg', 'image/png', 'image/webp'];
/** Client-side size ceiling; the API re-checks type (magic bytes) and size. */
export const maxImageBytes = 5 * 1024 * 1024;

type Purpose = (typeof purposes)[number];
type Uploader = (file: File, purpose: Purpose) => Promise<UploadedImage>;
const UploadContext = createContext<Uploader>(async () => { throw new Error('Image upload is not available here. Paste an https image URL instead.'); });

/** Supplies the signed-in media uploader to every image control in the content editors. */
export function ImageUploadProvider({ children }: { children: ReactNode }) {
  const { call } = useAuth();
  const upload = useCallback<Uploader>(async (file, purpose) => {
    try {
      const asset = await call((token) => uploadMedia(file, purpose, token, () => undefined));
      if (!asset.url?.startsWith('https://')) throw new Error('The API stored the image but returned no public https URL.');
      return { url: asset.url, alt: asset.altText ?? file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') };
    } catch (error) {
      if (error instanceof ApiError && (error.unavailable || error.status === 0)) throw new Error('Image upload is not connected to the API yet. Paste an https image URL instead.');
      throw error;
    }
  }, [call]);
  return <UploadContext.Provider value={upload}>{children}</UploadContext.Provider>;
}

/** Validates type and size, then uploads a public image and returns its URL; refuses anything the API cannot serve publicly. */
export function useImageUpload(purpose: Purpose, maxBytes = maxImageBytes) {
  const upload = useContext(UploadContext);
  return async (file: File): Promise<UploadedImage> => {
    if (!types.includes(file.type)) throw new Error('Use a JPG, PNG or WebP image.');
    if (file.size > maxBytes) throw new Error(`Images must be ${Math.round(maxBytes / 1048576)} MB or smaller.`);
    return upload(file, purpose);
  };
}

/** Image picker: upload or paste an https URL, preview it and require alt text. Emits null when cleared. */
export default function ImageField({ label, value, onChange, purpose, errors, prefix, hint, maxBytes }: {
  label: string; value: ImageRef | null; onChange: (value: ImageRef | null) => void; purpose: Purpose;
  errors: Partial<Record<string, string>>; prefix: string; hint?: string; maxBytes?: number;
}) {
  const upload = useImageUpload(purpose, maxBytes);
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  async function pick(file: File) {
    setProblem(''); setBusy(true);
    try { const image = await upload(file); onChange({ url: image.url, alt: value?.alt || image.alt }); }
    catch (err) { setProblem(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setBusy(false); if (picker.current) picker.current.value = ''; }
  }
  return <fieldset className="min-w-0 space-y-3 border border-line bg-surface-2 p-4">
    <legend className="px-1 text-sm font-medium">{label}</legend>
    <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
      <div className="grid aspect-video place-items-center overflow-hidden border border-dashed border-line-strong bg-surface"
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void pick(f); }}>
        {value?.url ? <img src={value.url} alt={value.alt} className="size-full object-cover" /> : <span className="p-2 text-center font-mono text-[11px] text-subtle">Drop image</span>}
      </div>
      <div className="min-w-0 space-y-3">
        <Input label="Image URL" type="url" placeholder="https://" value={value?.url ?? ''} error={errors[`${prefix}.url`]}
          onChange={(e) => { const url = e.target.value.trim(); onChange(url ? { url, alt: value?.alt ?? '' } : null); }} />
        <Input label="Alt text" required={!!value} disabled={!value} maxLength={200} value={value?.alt ?? ''} error={errors[`${prefix}.alt`]}
          onChange={(e) => value && onChange({ ...value, alt: e.target.value })} hint="Describe the image for screen readers." />
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" size="sm" loading={busy} onClick={() => picker.current?.click()}>Upload image</Button>
      {value && <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>Remove image</Button>}
      <span className="text-xs text-muted">{hint ?? 'JPG, PNG or WebP, up to 5 MB.'}</span>
      <input ref={picker} type="file" hidden accept={types.join(',')} aria-label={`Upload ${label}`} onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f); }} />
    </div>
    {(problem || errors[prefix]) && <p role="alert" className="text-xs text-danger">{problem || errors[prefix]}</p>}
  </fieldset>;
}
