import { z } from 'zod';
import type { Fn } from '../../../../lib/env';
import { parseJsonBody } from '../../../../lib/validation';
import { ok } from '../../../../lib/response';
import { badRequest } from '../../../../lib/errors';
import { findCart, updateCartItem, removeCartItem, getCartView } from '../../../../lib/services/cart';

const patchSchema = z.object({ quantity: z.number().int().min(0).max(999) });

export const onRequestPatch: Fn = async ({ request, params, env, data }) => {
  const itemId = Number(params.id);
  if (!Number.isInteger(itemId)) throw badRequest('Invalid item id.');
  const cartId = await findCart(env, request);
  if (!cartId) throw badRequest('No active cart.');
  const { quantity } = await parseJsonBody(request, patchSchema);
  await updateCartItem(env, cartId, itemId, quantity);
  return ok(await getCartView(env, cartId), { requestId: data.requestId });
};

export const onRequestDelete: Fn = async ({ request, params, env, data }) => {
  const itemId = Number(params.id);
  if (!Number.isInteger(itemId)) throw badRequest('Invalid item id.');
  const cartId = await findCart(env, request);
  if (!cartId) throw badRequest('No active cart.');
  await removeCartItem(env, cartId, itemId);
  return ok(await getCartView(env, cartId), { requestId: data.requestId });
};
