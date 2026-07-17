import { z } from 'zod';
import type { Fn } from '../../../lib/env';
import { getDb } from '../../../lib/db';
import { parseJsonBody } from '../../../lib/validation';
import { ok } from '../../../lib/response';
import { badRequest } from '../../../lib/errors';
import { findCart } from '../../../lib/services/cart';
import { loadCartLines, cartWeight } from '../../../lib/services/checkout';
import { getShippingOptions } from '../../../lib/services/shipping';

const bodySchema = z.object({
  country: z.string().max(4).default('PH'),
  province: z.string().max(120).nullable().optional(),
});

/** Return the shipping options available for the current cart + destination. */
export const onRequestPost: Fn = async ({ request, env, data }) => {
  const cartId = await findCart(env, request);
  if (!cartId) throw badRequest('Your cart is empty.');
  const input = await parseJsonBody(request, bodySchema);
  const lines = await loadCartLines(getDb(env), cartId);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  const options = await getShippingOptions(env, {
    subtotal,
    weightGrams: cartWeight(lines),
    destination: { country: input.country, province: input.province ?? null },
  });

  return ok({ options }, { requestId: data.requestId });
};
