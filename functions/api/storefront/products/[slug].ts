import type { Fn } from '../../../lib/env';
import { ok } from '../../../lib/response';
import { badRequest } from '../../../lib/errors';
import { getPublicProduct } from '../../../lib/services/storefront';

export const onRequestGet: Fn = async ({ params, env, data }) => {
  const slug = String(params.slug ?? '');
  if (!slug) throw badRequest('Missing product slug.');
  const product = await getPublicProduct(env, slug);
  return ok(product, { requestId: data.requestId });
};
