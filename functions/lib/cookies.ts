export const ADMIN_SESSION_COOKIE = 'atl_admin_session';
export const CUSTOMER_SESSION_COOKIE = 'atl_customer_session';
export const CART_COOKIE = 'atl_cart';
export const ANALYTICS_COOKIE = 'atl_sid';

export interface CookieOptions {
  maxAge?: number; // seconds
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  expires?: Date;
}

export function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const parts = [`${name}=${value}`];
  parts.push(`Path=${opts.path ?? '/'}`);
  if (opts.maxAge != null) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  if (opts.httpOnly !== false) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  parts.push(`SameSite=${opts.sameSite ?? 'Lax'}`);
  return parts.join('; ');
}

export function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get('Cookie');
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export function getCookie(request: Request, name: string): string | undefined {
  return parseCookies(request)[name];
}
