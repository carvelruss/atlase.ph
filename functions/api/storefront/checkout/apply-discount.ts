import { z } from 'zod';
import type { Fn } from '../../../lib/env';
import { getDb } from '../../../lib/db';
import { parseJsonBody } from '../../../lib/validation';
import { ok } from '../../../lib/response';
import { badRequest } from '../../../lib/errors';
import { findCart } from '../../../lib/services/cart';
import { loadCartLines, validateDiscount } from '../../../lib/services/checkout';

const bodySchema = z.object({ code: z.string().min(1).max(60) });

/** Validate a discount code against the current cart (server-authoritative). */
export const onRequestPost: Fn = async ({ request, env, data }) => {
  const cartId = await findCart(env, request);
  if (!cartId) throw badRequest('Your cart is empty.');
  const { code } = await parseJsonBody(request, bodySchema);
  const lines = await loadCartLines(getDb(env), cartId);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);

  const result = await validateDiscount(env, code, subtotal, itemCount);
  return ok(result, { requestId: data.requestId });
};
