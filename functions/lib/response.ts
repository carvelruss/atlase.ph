import type { ApiError, ApiMeta } from '../../shared/api/envelope';
import { ERROR_CODES } from '../../shared/constants/index';
import { ApiException } from './errors';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

/** Baseline security headers safe for every response (no caching directives). */
export function baseSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
}

/** Security headers for API/JSON responses. Adds no-store on top of the baseline. */
export function securityHeaders(): Record<string, string> {
  return { ...baseSecurityHeaders(), 'Cache-Control': 'no-store' };
}

function withHeaders(init: ResponseInit, extra?: Record<string, string>): ResponseInit {
  return {
    ...init,
    headers: { ...JSON_HEADERS, ...securityHeaders(), ...(extra ?? {}), ...(init.headers ?? {}) },
  };
}

export function ok<T>(
  data: T,
  meta: ApiMeta = {},
  status = 200,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify({ success: true, data, meta, error: null }), withHeaders({ status }, headers));
}

export function created<T>(data: T, meta: ApiMeta = {}): Response {
  return ok(data, meta, 201);
}

export function noContent(): Response {
  return new Response(null, withHeaders({ status: 204 }));
}

export function fail(
  status: number,
  error: ApiError,
  meta: ApiMeta = {},
  headers?: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({ success: false, data: null, meta, error }),
    withHeaders({ status }, headers),
  );
}

/** Convert any thrown value into a safe JSON error response (never leaks stacks). */
export function fromException(err: unknown, requestId: string): Response {
  if (err instanceof ApiException) {
    return fail(
      err.status,
      { code: err.code, message: err.message, fields: err.fields },
      { requestId },
    );
  }
  // Unexpected error: log server-side, return a generic message.
  console.error(`[${requestId}] Unhandled error:`, err);
  return fail(
    500,
    { code: ERROR_CODES.INTERNAL, message: 'Something went wrong. Please try again.' },
    { requestId },
  );
}

export function paginationMeta(page: number, pageSize: number, total: number): ApiMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
