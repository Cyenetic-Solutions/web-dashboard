import { z } from 'zod';
import { ApiError, apiBase, dataOf, listOf, query, request } from './http';

export const mediaSchema = z.object({
  id: z.string(), bucket: z.enum(['PUBLIC', 'PRIVATE', 'QUARANTINE']), originalName: z.string(), mimeType: z.string(),
  sizeBytes: z.coerce.number(), width: z.number().nullable().optional(), height: z.number().nullable().optional(), sha256: z.string(),
  altText: z.string().nullable().optional(), scanStatus: z.enum(['SKIPPED', 'PENDING', 'CLEAN', 'INFECTED']), createdAt: z.string(), url: z.string().nullable().optional(),
});
/** Uploaded file metadata; private files only expose short-lived URLs on request. */
export type MediaAsset = z.infer<typeof mediaSchema>;
/** Upload purposes decide the storage bucket server-side. */
export const purposes = ['blog-cover', 'case-cover', 'client-logo', 'team-photo', 'report-pdf', 'finding-video', 'finding-evidence', 'avatar'] as const;

/** Lists the media library with optional filters. */
export async function listMedia(token: string, signal: AbortSignal, filters: { bucket?: string; q?: string }) {
  return listOf(mediaSchema).parse(await request(`/api/v1/admin/media${query(filters)}`, { token, signal })).data;
}
/** Returns a presigned URL (15 min); private access is audited by the API. */
export async function mediaUrl(id: string, token: string) {
  return dataOf(z.object({ url: z.string() })).parse(await request(`/api/v1/admin/media/${encodeURIComponent(id)}/url`, { token })).data.url;
}
/** Updates alt text. */
export async function updateMedia(id: string, altText: string, token: string) {
  return dataOf(mediaSchema).parse(await request(`/api/v1/admin/media/${encodeURIComponent(id)}`, { token, method: 'PATCH', body: { altText } })).data;
}
/** Multipart upload with progress; the API validates magic bytes and size and stores the file. */
export function uploadMedia(file: File, purpose: (typeof purposes)[number], token: string, onProgress: (fraction: number) => void) {
  return new Promise<MediaAsset>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData(); form.append('purpose', purpose); form.append('file', file);
    xhr.open('POST', `${apiBase}/api/v1/admin/media`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onerror = () => reject(new ApiError(0, 'Upload failed: the API could not be reached.', 'NETWORK'));
    xhr.onload = () => {
      let payload: unknown = null; try { payload = JSON.parse(xhr.responseText); } catch { payload = null; }
      if (xhr.status >= 200 && xhr.status < 300) { const parsed = dataOf(mediaSchema).safeParse(payload); if (parsed.success) resolve(parsed.data.data); else reject(new ApiError(xhr.status, 'Unexpected upload response')); return; }
      const message = z.object({ error: z.object({ message: z.string() }) }).safeParse(payload);
      reject(new ApiError(xhr.status, message.success ? message.data.error.message : 'Upload failed'));
    };
    xhr.send(form);
  });
}
