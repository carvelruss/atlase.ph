import type { Fn } from '../../../lib/env';
import { getDb } from '../../../lib/db';
import { ok } from '../../../lib/response';
import { badRequest } from '../../../lib/errors';
import { findCart } from '../../../lib/services/cart';
import { loadCartLines, assertLinesPurchasable } from '../../../lib/services/checkout';

/** Revalidate the cart server-side before checkout: availability + fresh subtotal. */
export const onRequestPost: Fn = async ({ request, env, data }) => {
  const cartId = await findCart(env, request);
  if (!cartId) throw badRequest('Your cart is empty.');
  const lines = await loadCartLines(getDb(env), cartId);
  assertLinesPurchasable(lines);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const requiresShipping = lines.some((l) => l.requiresShipping);
  return ok({ valid: true, subtotal, itemCount, requiresShipping, currency: 'PHP' }, { requestId: data.requestId });
};
