import { z } from 'zod';
import type { Fn } from '../../../../lib/env';
import { parseJsonBody } from '../../../../lib/validation';
import { ok } from '../../../../lib/response';
import { getOrCreateCart, addCartItem, getCartView } from '../../../../lib/services/cart';

const bodySchema = z.object({
  variantId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(999).default(1),
});

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const input = await parseJsonBody(request, bodySchema);
  const cart = await getOrCreateCart(env, request);
  await addCartItem(env, cart.cartId, input.variantId, input.quantity);
  const view = await getCartView(env, cart.cartId);
  const headers = cart.setCookie ? { 'Set-Cookie': cart.setCookie } : undefined;
  return ok(view, { requestId: data.requestId }, 200, headers);
};
