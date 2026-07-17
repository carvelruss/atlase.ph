import { z } from 'zod';
import type { Fn } from '../../lib/env';
import { parseJsonBody } from '../../lib/validation';
import { ok, fail } from '../../lib/response';
import { rateLimit } from '../../lib/rateLimit';
import { getClientIp } from '../../lib/http';
import { getPublicOrder } from '../../lib/services/orders';
import { findOrderForTracking } from '../../lib/services/checkout';
import { ERROR_CODES } from '../../lib/shared';

const bodySchema = z.object({
  orderNumber: z.string().min(1).max(60),
  email: z.string().email().max(200),
});

/** Public order tracking. Requires order number + matching email (verification factor). */
export const onRequestPost: Fn = async ({ request, env, data }) => {
  const ip = getClientIp(request);
  const limit = await rateLimit(env, `track:${ip ?? 'unknown'}`, 20, 300);
  if (!limit.allowed) {
    return fail(429, { code: ERROR_CODES.RATE_LIMITED, message: 'Too many attempts. Please wait a moment.' }, { requestId: data.requestId });
  }

  const input = await parseJsonBody(request, bodySchema);
  const order = await findOrderForTracking(env, input.orderNumber, input.email);
  const view = await getPublicOrder(env, order);
  return ok(view, { requestId: data.requestId });
};
