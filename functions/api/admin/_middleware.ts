import type { Fn } from '../../lib/env';
import { getAdminSession } from '../../lib/session';
import { getCookie, ADMIN_SESSION_COOKIE } from '../../lib/cookies';
import { isMutating } from '../../lib/http';
import { fail } from '../../lib/response';
import { timingSafeEqual } from '../../lib/crypto';
import { ERROR_CODES } from '../../lib/shared';

/**
 * Server-side authorization for every /api/admin/* route. A client-side guard is
 * never sufficient. Also enforces double-submit CSRF for state-changing methods.
 */
export const onRequest: Fn = async (context) => {
  const { request, env, data } = context;

  const sessionId = getCookie(request, ADMIN_SESSION_COOKIE);
  const ctx = await getAdminSession(env, sessionId);
  if (!ctx) {
    return fail(
      401,
      { code: ERROR_CODES.UNAUTHORIZED, message: 'Please sign in to continue.' },
      { requestId: data.requestId },
    );
  }

  if (isMutating(request.method)) {
    const provided = request.headers.get('x-csrf-token') ?? '';
    if (!provided || !timingSafeEqual(provided, ctx.session.csrfToken)) {
      return fail(
        403,
        { code: ERROR_CODES.CSRF_INVALID, message: 'Invalid or missing CSRF token.' },
        { requestId: data.requestId },
      );
    }
  }

  data.admin = {
    id: ctx.admin.id,
    email: ctx.admin.email,
    name: ctx.admin.name,
    sessionId: ctx.session.id,
  };

  return context.next();
};
