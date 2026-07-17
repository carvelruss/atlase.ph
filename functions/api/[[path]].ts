import type { Fn } from '../lib/env';
import { fail } from '../lib/response';
import { ERROR_CODES } from '../lib/shared';

/** Fallback for unmatched /api/* routes — returns JSON 404 instead of the SPA shell. */
export const onRequest: Fn = async ({ request, data }) => {
  const url = new URL(request.url);
  return fail(
    404,
    { code: ERROR_CODES.NOT_FOUND, message: `No API route for ${request.method} ${url.pathname}` },
    { requestId: data.requestId },
  );
};
