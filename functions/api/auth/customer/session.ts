import type { Fn } from '../../../lib/env';
import { getCustomerSession } from '../../../lib/customerSession';
import { getCookie, CUSTOMER_SESSION_COOKIE } from '../../../lib/cookies';
import { ok } from '../../../lib/response';

export const onRequestGet: Fn = async ({ request, env, data }) => {
  const ctx = await getCustomerSession(env, getCookie(request, CUSTOMER_SESSION_COOKIE));
  if (ctx) {
    return ok({ authenticated: true, customer: ctx.customer, csrfToken: ctx.session.csrfToken }, { requestId: data.requestId });
  }
  return ok({ authenticated: false }, { requestId: data.requestId });
};
