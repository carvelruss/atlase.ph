import type { Fn } from '../../../lib/env';
import { getDb } from '../../../lib/db';
import { parsePageParams } from '../../../lib/pagination';
import { ok, paginationMeta } from '../../../lib/response';
import { notFound } from '../../../lib/errors';
import { collectionCondition, listPublicProducts } from '../../../lib/services/storefront';

export const onRequestGet: Fn = async ({ request, params, env, data }) => {
  const slug = String(params.slug ?? '');
  const db = getDb(env);
  const resolved = await collectionCondition(db, slug);
  if (!resolved || !resolved.collection.isActive) throw notFound('Collection not found.');

  const pp = parsePageParams(new URL(request.url));
  const { items, total } = await listPublicProducts(env, {
    collectionSlug: slug,
    sort: new URL(request.url).searchParams.get('sort'),
    offset: pp.offset,
    pageSize: pp.pageSize,
  });

  const c = resolved.collection;
  return ok(
    { collection: { name: c.name, slug: c.slug, description: c.description, seoTitle: c.seoTitle, seoDescription: c.seoDescription }, items },
    { requestId: data.requestId, ...paginationMeta(pp.page, pp.pageSize, total) },
  );
};
