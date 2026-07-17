import type { Fn } from './lib/env';
import { newRequestId } from './lib/http';
import { baseSecurityHeaders, fromException } from './lib/response';

/**
 * Root middleware: assigns a request id, wraps every request in an error boundary
 * that never leaks stack traces, and applies baseline security headers. Caching
 * directives are intentionally NOT set here so static assets keep their _headers
 * cache policy; API responses set their own no-store via the response helpers.
 */
export const onRequest: Fn = async (context) => {
  const requestId = newRequestId();
  context.data.requestId = requestId;

  try {
    const response = await context.next();
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(baseSecurityHeaders())) {
      if (!headers.has(key)) headers.set(key, value);
    }
    headers.set('X-Request-Id', requestId);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (err) {
    return fromException(err, requestId);
  }
};
