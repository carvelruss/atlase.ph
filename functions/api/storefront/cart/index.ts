import type { Fn } from '../../../lib/env';
import { ok } from '../../../lib/response';
import { findCart, getCartView } from '../../../lib/services/cart';

export const onRequestGet: Fn = async ({ request, env, data }) => {
  const cartId = await findCart(env, request);
  if (!cartId) {
    return ok({ id: null, currency: 'PHP', items: [], subtotal: 0, itemCount: 0 }, { requestId: data.requestId });
  }
  const view = await getCartView(env, cartId);
  return ok(view, { requestId: data.requestId });
};
