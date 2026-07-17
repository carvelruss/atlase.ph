import type { ApiResponse, ApiMeta } from '@shared/api/envelope';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// CSRF token is held in memory only (never localStorage) and attached to
// state-changing admin requests. It is refreshed from the session endpoint.
let csrfToken: string | null = null;
export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}
export function getCsrfToken(): string | null {
  return csrfToken;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields?: Record<string, string[]>;

  constructor(code: string, message: string, status: number, fields?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | undefined | null>;
}

export interface ApiResult<T> {
  data: T;
  meta: ApiMeta;
}

function buildUrl(path: string, query?: ApiFetchOptions['query']): string {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.pathname + url.search;
}

/** Typed fetch wrapper that unwraps the API envelope and throws ApiError on failure. */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const result = await apiFetchWithMeta<T>(path, options);
  return result.data;
}

export async function apiFetchWithMeta<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<ApiResult<T>> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: string | undefined;

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  if (MUTATING.has(method) && csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body,
      credentials: 'same-origin',
      signal: options.signal,
    });
  } catch {
    throw new ApiError('NETWORK', 'Unable to reach the server. Check your connection.', 0);
  }

  let json: ApiResponse<T> | null = null;
  try {
    json = (await response.json()) as ApiResponse<T>;
  } catch {
    json = null;
  }

  if (!json) {
    throw new ApiError('INTERNAL', `Unexpected response (${response.status}).`, response.status);
  }
  if (!json.success) {
    throw new ApiError(json.error.code, json.error.message, response.status, json.error.fields);
  }
  return { data: json.data, meta: json.meta };
}
