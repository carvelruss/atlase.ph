import type { Fn } from '../../../lib/env';
import { getCustomerSession, destroyCustomerSession, clearCustomerSessionCookie } from '../../../lib/customerSession';
import { getCookie, CUSTOMER_SESSION_COOKIE } from '../../../lib/cookies';
import { ok } from '../../../lib/response';

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const sessionId = getCookie(request, CUSTOMER_SESSION_COOKIE);
  const ctx = await getCustomerSession(env, sessionId);
  if (ctx && sessionId) await destroyCustomerSession(env, sessionId);
  return ok({ success: true }, { requestId: data.requestId }, 200, { 'Set-Cookie': clearCustomerSessionCookie(env) });
};
