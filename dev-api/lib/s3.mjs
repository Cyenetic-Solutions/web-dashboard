// Minimal S3 client (AWS Signature V4, path-style) for MinIO: buckets, uploads and presigned downloads.
import { createHash, createHmac } from 'node:crypto';

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();
const encode = (value) => encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const canonicalPath = (bucket, key) => `/${encode(bucket)}${key ? `/${key.split('/').map(encode).join('/')}` : ''}`;
const canonicalQuery = (params) => Object.keys(params).sort().map((k) => `${encode(k)}=${encode(params[k])}`).join('&');

function stamp(date = new Date()) {
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate, day: amzDate.slice(0, 8) };
}
function signingKey(secret, day, region) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, day), region), 's3'), 'aws4_request');
}

/** Creates an S3 client bound to one endpoint and credential pair. */
export function createS3({ endpoint, region = 'us-east-1', accessKey, secretKey }) {
  const base = new URL(endpoint);
  async function send(method, bucket, key = '', { body = Buffer.alloc(0), contentType, query = {} } = {}) {
    const { amzDate, day } = stamp();
    const payloadHash = sha256(body);
    const headers = { host: base.host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate, ...(contentType ? { 'content-type': contentType } : {}) };
    const signed = Object.keys(headers).sort();
    const path = canonicalPath(bucket, key);
    const qs = canonicalQuery(query);
    const canonical = [method, path, qs, signed.map((h) => `${h}:${headers[h]}\n`).join(''), signed.join(';'), payloadHash].join('\n');
    const scope = `${day}/${region}/s3/aws4_request`;
    const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
    const signature = createHmac('sha256', signingKey(secretKey, day, region)).update(toSign).digest('hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signed.join(';')}, Signature=${signature}`;
    const sendHeaders = { ...headers };
    delete sendHeaders.host; // fetch sets Host itself
    const response = await fetch(`${base.origin}${path}${qs ? `?${qs}` : ''}`, { method, headers: { ...sendHeaders, authorization }, body: method === 'GET' || method === 'HEAD' ? undefined : body });
    return response;
  }
  return {
    /** Creates the bucket if it does not exist yet. */
    async ensureBucket(bucket) {
      const head = await send('HEAD', bucket);
      if (head.ok) return;
      const created = await send('PUT', bucket);
      if (!created.ok && created.status !== 409) throw new Error(`MinIO refused to create bucket ${bucket}: ${created.status} ${await created.text()}`);
    },
    /** Lets anonymous clients read objects (used only for the public media bucket). */
    async allowPublicRead(bucket) {
      const policy = JSON.stringify({ Version: '2012-10-17', Statement: [{ Effect: 'Allow', Principal: { AWS: ['*'] }, Action: ['s3:GetObject'], Resource: [`arn:aws:s3:::${bucket}/*`] }] });
      const response = await send('PUT', bucket, '', { body: Buffer.from(policy), contentType: 'application/json', query: { policy: '' } });
      if (!response.ok) throw new Error(`MinIO refused the bucket policy: ${response.status} ${await response.text()}`);
    },
    async putObject(bucket, key, body, contentType) {
      const response = await send('PUT', bucket, key, { body, contentType });
      if (!response.ok) throw new Error(`MinIO upload failed: ${response.status} ${await response.text()}`);
    },
    /** Anonymous URL for objects in a public-read bucket. */
    publicUrl: (bucket, key) => `${base.origin}${canonicalPath(bucket, key)}`,
    /** Time-limited GET URL for a private object. */
    presignGet(bucket, key, expiresSeconds = 900) {
      const { amzDate, day } = stamp();
      const scope = `${day}/${region}/s3/aws4_request`;
      const query = { 'X-Amz-Algorithm': 'AWS4-HMAC-SHA256', 'X-Amz-Credential': `${accessKey}/${scope}`, 'X-Amz-Date': amzDate,
        'X-Amz-Expires': String(expiresSeconds), 'X-Amz-SignedHeaders': 'host' };
      const path = canonicalPath(bucket, key);
      const canonical = ['GET', path, canonicalQuery(query), `host:${base.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
      const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
      const signature = createHmac('sha256', signingKey(secretKey, day, region)).update(toSign).digest('hex');
      return `${base.origin}${path}?${canonicalQuery({ ...query, 'X-Amz-Signature': signature })}`;
    },
  };
}
