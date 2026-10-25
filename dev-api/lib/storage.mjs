// Upload storage for the local dev API. Two drivers with the same interface:
//   local (default) — files on disk under .dev-data/uploads, served by the dev API itself. No Docker needed.
//   minio           — S3-compatible MinIO started by compose.dev.yaml (set STORAGE_DRIVER=minio).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createS3 } from './s3.mjs';

/** File types the media route can store, with the extension used in object keys. */
export const extensionFor = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf', 'video/mp4': 'mp4', 'video/webm': 'webm' };
const typeFor = Object.fromEntries(Object.entries(extensionFor).map(([type, ext]) => [ext, type]));
// Keys are always `<purpose>/<uuid>.<ext>`, built by the media route; anything else is refused before touching the disk.
const keyPattern = /^([a-z-]{2,40})\/([0-9a-f-]{36})\.([a-z0-9]{2,5})$/;

/**
 * Returns the configured storage driver: `{ driver, label, prepare(), put(bucket, key, body, type), publicUrl(key), privateUrl(key, seconds), read?(...) }`.
 * `bucket` is 'PUBLIC' or 'PRIVATE'.
 */
export function createStorage(config) {
  return config.storage.driver === 'minio' ? minioStorage(config) : localStorage(config);
}

function minioStorage({ s3: settings }) {
  const s3 = createS3(settings);
  const bucketName = (bucket) => (bucket === 'PUBLIC' ? settings.publicBucket : settings.privateBucket);
  return {
    driver: 'minio',
    label: `MinIO at ${settings.endpoint}`,
    /** Creates the buckets and the public-read policy, retrying while MinIO is still starting. */
    async prepare() {
      for (let attempt = 1; attempt <= 20; attempt += 1) {
        try {
          await s3.ensureBucket(settings.publicBucket);
          await s3.ensureBucket(settings.privateBucket);
          await s3.allowPublicRead(settings.publicBucket);
          return `MinIO buckets ready (${settings.publicBucket}, ${settings.privateBucket})`;
        } catch (error) {
          if (attempt === 20) throw new Error(`MinIO is not reachable at ${settings.endpoint}; uploads will fail until it is. ${error.message}`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
      return '';
    },
    put: (bucket, key, body, type) => s3.putObject(bucketName(bucket), key, body, type),
    publicUrl: (key) => s3.publicUrl(settings.publicBucket, key),
    privateUrl: (key, seconds) => s3.presignGet(settings.privateBucket, key, seconds),
  };
}

function localStorage({ storage, secret, publicUrl: apiUrl }) {
  const root = storage.dir;
  const fileOf = (bucket, key) => {
    if (!keyPattern.test(key)) throw new Error('Invalid storage key');
    return path.join(root, bucket === 'PUBLIC' ? 'public' : 'private', ...key.split('/'));
  };
  const sign = (key, expires) => createHmac('sha256', secret).update(`private:${key}:${expires}`).digest('base64url');
  return {
    driver: 'local',
    label: `local disk (${root})`,
    async prepare() {
      await mkdir(path.join(root, 'public'), { recursive: true });
      await mkdir(path.join(root, 'private'), { recursive: true });
      return `Uploads are stored on disk in ${root}`;
    },
    async put(bucket, key, body) {
      const file = fileOf(bucket, key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body, { flag: 'wx' });
    },
    publicUrl: (key) => `${apiUrl}/files/public/${key}`,
    /** Time-limited link: an HMAC over the key and expiry, checked by `read`. */
    privateUrl(key, seconds) {
      const expires = Math.floor(Date.now() / 1000) + seconds;
      return `${apiUrl}/files/private/${key}?expires=${expires}&signature=${sign(key, expires)}`;
    },
    /** Reads a stored file for the `/files/...` route; returns null when missing, expired or wrongly signed. */
    async read(bucket, key, query) {
      if (!keyPattern.test(key)) return null;
      if (bucket === 'PRIVATE') {
        const expires = Number(query.get('expires'));
        const given = Buffer.from(query.get('signature') ?? '');
        const expected = Buffer.from(sign(key, expires));
        if (!Number.isInteger(expires) || expires < Date.now() / 1000 || given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
      }
      const type = typeFor[keyPattern.exec(key)[3]];
      if (!type) return null;
      try { return { body: await readFile(fileOf(bucket, key)), type }; } catch { return null; }
    },
  };
}
