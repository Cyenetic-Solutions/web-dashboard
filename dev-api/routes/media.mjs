// /api/v1/admin/media: multipart uploads stored in MinIO, checked by magic bytes, with presigned private downloads.
import { createHash } from 'node:crypto';
import { can } from '../../services/permissions.ts';
import { clientIp, requirePermission } from '../lib/auth.mjs';
import { HttpError, badRequest, matches, notFound, paginate, readBody } from '../lib/http.mjs';
import { appendAudit } from '../lib/store.mjs';

const MB = 1024 * 1024;
const image = { types: ['image/jpeg', 'image/png', 'image/webp'], max: 5 * MB, bucket: 'PUBLIC' };
const purposes = {
  'blog-cover': image, 'case-cover': image, 'client-logo': image, 'team-photo': image, avatar: image,
  'report-pdf': { types: ['application/pdf'], max: 50 * MB, bucket: 'PRIVATE' },
  'finding-video': { types: ['video/mp4', 'video/webm'], max: 100 * MB, bucket: 'PRIVATE' },
  'finding-evidence': { types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], max: 20 * MB, bucket: 'PRIVATE' },
};
const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf', 'video/mp4': 'mp4', 'video/webm': 'webm' };

/** Detects the real file type from its first bytes; the browser-supplied type is never trusted. */
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
  if (buf.toString('ascii', 4, 8) === 'ftyp') return 'video/mp4';
  if (buf.readUInt32BE(0) === 0x1a45dfa3) return 'video/webm';
  return null;
}
function dimensions(buf, type) {
  if (type === 'image/png') return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (type === 'image/jpeg') {
    for (let i = 2; i + 9 < buf.length;) {
      if (buf[i] !== 0xff) break;
      const marker = buf[i + 1], length = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      i += 2 + length;
    }
  }
  return { width: null, height: null };
}
/** Parses multipart/form-data into fields and files. */
function parseMultipart(body, contentType) {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? '');
  if (!boundary) throw badRequest('Send the upload as multipart/form-data.');
  const delimiter = Buffer.from(`--${boundary[1] ?? boundary[2]}`);
  const fields = {}, files = {};
  let start = body.indexOf(delimiter);
  while (start !== -1) {
    const next = body.indexOf(delimiter, start + delimiter.length);
    if (next === -1) break;
    const part = body.subarray(start + delimiter.length + 2, next - 2);
    const split = part.indexOf('\r\n\r\n');
    if (split !== -1) {
      const headers = part.subarray(0, split).toString('utf8'), content = part.subarray(split + 4);
      const name = /name="([^"]*)"/i.exec(headers)?.[1], filename = /filename="([^"]*)"/i.exec(headers)?.[1];
      if (name && filename !== undefined) files[name] = { filename, content };
      else if (name) fields[name] = content.toString('utf8');
    }
    start = next;
  }
  return { fields, files };
}

export function mediaRoutes(router, { store, s3, config }) {
  const base = '/api/v1/admin/media';
  const bucketName = (bucket) => (bucket === 'PUBLIC' ? config.s3.publicBucket : config.s3.privateBucket);
  const view = (m) => ({ ...m, url: m.bucket === 'PUBLIC' ? s3.publicUrl(bucketName(m.bucket), m.key) : null, key: undefined, uploadedBy: undefined });
  const mayPrivate = (actor) => can(actor.role, 'findings:read');

  router.get(base, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'media:write');
    const bucket = ctx.url.searchParams.get('bucket'), q = ctx.url.searchParams.get('q');
    return paginate(store.data.media.filter((m) => (m.bucket === 'PUBLIC' || mayPrivate(actor)) && (!bucket || m.bucket === bucket) && matches(m, q, ['originalName', 'altText'])).reverse().map(view), ctx.url);
  });
  router.post(base, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'media:write');
    const { fields, files } = parseMultipart(await readBody(ctx.req, 101 * MB), ctx.req.headers['content-type']);
    const rule = purposes[fields.purpose];
    if (!rule) throw badRequest('Choose a valid upload purpose.');
    if (rule.bucket === 'PRIVATE' && !mayPrivate(actor)) throw new HttpError(403, 'FORBIDDEN', 'Your role cannot upload private files.');
    const file = files.file;
    if (!file || file.content.length === 0) throw badRequest('Attach a file.');
    const type = sniff(file.content);
    if (!type || !rule.types.includes(type)) throw new HttpError(415, 'UNSUPPORTED_TYPE', `This file type is not allowed for ${fields.purpose}.`);
    if (file.content.length > rule.max) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', `Files for ${fields.purpose} must be ${rule.max / MB} MB or smaller.`);
    const id = store.id(), key = `${fields.purpose}/${id}.${extension[type]}`;
    try { await s3.putObject(bucketName(rule.bucket), key, file.content, type); } catch (error) {
      console.error('[dev-api] MinIO upload failed:', error.message);
      throw new HttpError(503, 'STORAGE_UNAVAILABLE', 'The file could not be stored. Is MinIO running?');
    }
    const media = { id, key, bucket: rule.bucket, originalName: file.filename.slice(0, 255), mimeType: type, sizeBytes: file.content.length, ...dimensions(file.content, type),
      sha256: createHash('sha256').update(file.content).digest('hex'), altText: file.filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 200),
      scanStatus: 'SKIPPED', createdAt: new Date().toISOString(), uploadedBy: actor.user.id };
    store.data.media.push(media);
    appendAudit(store, { actorEmail: actor.user.email, actorName: actor.user.fullName, action: 'MEDIA_UPLOADED', resourceType: 'MEDIA', resourceId: id, summary: `${media.originalName} (${rule.bucket.toLowerCase()})`, ipAddress: clientIp(ctx.req) });
    ctx.res.statusCode = 201;
    return { data: view(media) };
  });
  router.get(`${base}/:id/url`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'media:write');
    const media = store.data.media.find((m) => m.id === ctx.params.id);
    if (!media || (media.bucket !== 'PUBLIC' && !mayPrivate(actor))) throw notFound('File not found');
    if (media.bucket === 'PUBLIC') return { data: { url: s3.publicUrl(config.s3.publicBucket, media.key) } };
    appendAudit(store, { actorEmail: actor.user.email, actorName: actor.user.fullName, action: 'MEDIA_PRIVATE_ACCESS', resourceType: 'MEDIA', resourceId: media.id, summary: media.originalName, ipAddress: clientIp(ctx.req) });
    return { data: { url: s3.presignGet(config.s3.privateBucket, media.key, 900) } };
  });
  router.patch(`${base}/:id`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'media:write');
    const media = store.data.media.find((m) => m.id === ctx.params.id);
    if (!media || (media.bucket !== 'PUBLIC' && !mayPrivate(actor))) throw notFound('File not found');
    const altText = String((await ctx.json()).altText ?? '').trim();
    if (altText.length > 200) throw badRequest('Alt text must be 200 characters or fewer.');
    media.altText = altText; store.save();
    return { data: view(media) };
  });
}
