import { NextResponse, type NextRequest } from 'next/server';
/** Nonced document policy; the external API remains the authorization boundary. */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const api = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').origin;
  const dev = process.env.NODE_ENV !== 'production';
  const policy = ["default-src 'self'", `script-src 'self' 'nonce-${nonce}' ${dev ? "'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'", `img-src 'self' data: https: ${dev ? 'http://localhost:* http://127.0.0.1:*' : ''}`, "font-src 'self' data:",
    `connect-src 'self' ${api} ${dev ? 'ws: wss:' : ''}`, "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'"].join('; ');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  if (!dev) response.headers.set('Strict-Transport-Security', 'max-age=31536000');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
