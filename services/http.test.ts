import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, issuesToFieldErrors, parseDataOrBare, request } from './http';

afterEach(() => { vi.unstubAllGlobals(); });
const respond = (status: number, body: unknown) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));

describe('live API error envelope', () => {
  it('maps Zod issues to editor field names without the data prefix', () => {
    expect(issuesToFieldErrors([{ path: ['data', 'title'], message: 'Required' }, { path: ['data', 'subDomains', 0, 'slug'], message: 'Bad slug' }, { path: [], message: 'Domain slug must match record slug' }]))
      .toEqual({ title: ['Required'], 'subDomains.0.slug': ['Bad slug'], form: ['Domain slug must match record slug'] });
  });
  it('turns a plain-string error with issues into an ApiError naming the first field', async () => {
    respond(400, { error: 'Invalid request', issues: [{ path: ['data', 'title'], message: 'Too small' }] });
    const error = await request('/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION', message: 'Invalid request (data.title: Too small)', fieldErrors: { title: ['Too small'] } });
  });
  it('keeps the structured dashboard envelope', async () => {
    respond(409, { error: { code: 'VERSION_CONFLICT', message: 'Reload first', details: { fieldErrors: { slug: ['Taken'] } } } });
    await expect(request('/x')).rejects.toMatchObject({ status: 409, code: 'VERSION_CONFLICT', fieldErrors: { slug: ['Taken'] } });
  });
});

describe('parseDataOrBare', () => {
  const item = z.object({ id: z.string() });
  it('accepts both the wrapped and the bare item', () => {
    expect(parseDataOrBare(item, { data: { id: 'a' } })).toEqual({ id: 'a' });
    expect(parseDataOrBare(item, { id: 'b' })).toEqual({ id: 'b' });
  });
  it('rejects anything else', () => { expect(() => parseDataOrBare(item, { data: { nope: 1 } })).toThrow(); });
});
