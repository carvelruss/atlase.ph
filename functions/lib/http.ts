import { randomToken } from './crypto';

export function newRequestId(): string {
  return randomToken(12);
}

export function getClientIp(request: Request): string | null {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    null
  );
}

export function getUserAgent(request: Request): string | null {
  return request.headers.get('User-Agent');
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
export function isMutating(method: string): boolean {
  return MUTATING.has(method.toUpperCase());
}
