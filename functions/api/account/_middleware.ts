import type { Fn } from '../../lib/env';
import { getCustomerSession } from '../../lib/customerSession';
import { getCookie, CUSTOMER_SESSION_COOKIE } from '../../lib/cookies';
import { isMutating } from '../../lib/http';
import { timingSafeEqual } from '../../lib/crypto';
import { fail } from '../../lib/response';
import { ERROR_CODES } from '../../lib/shared';

/** Require a valid customer session for /api/account/* (with CSRF on mutations). */
export const onRequest: Fn = async (context) => {
  const { request, env, data } = context;
  const ctx = await getCustomerSession(env, getCookie(request, CUSTOMER_SESSION_COOKIE));
  if (!ctx) {
    return fail(401, { code: ERROR_CODES.UNAUTHORIZED, message: 'Please sign in to your account.' }, { requestId: data.requestId });
  }
  if (isMutating(request.method)) {
    const provided = request.headers.get('x-csrf-token') ?? '';
    if (!provided || !timingSafeEqual(provided, ctx.session.csrfToken)) {
      return fail(403, { code: ERROR_CODES.CSRF_INVALID, message: 'Invalid or missing CSRF token.' }, { requestId: data.requestId });
    }
  }
  data.customer = { id: ctx.customer.id, email: ctx.customer.email, sessionId: ctx.session.id };
  return context.next();
};
