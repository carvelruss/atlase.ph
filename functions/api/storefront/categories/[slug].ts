import { eq } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parsePageParams } from '../../../lib/pagination';
import { ok, paginationMeta } from '../../../lib/response';
import { notFound } from '../../../lib/errors';
import { listPublicProducts } from '../../../lib/services/storefront';

export const onRequestGet: Fn = async ({ request, params, env, data }) => {
  const slug = String(params.slug ?? '');
  const db = getDb(env);
  const rows = await db.select().from(schema.categories).where(eq(schema.categories.slug, slug)).limit(1);
  const category = rows[0];
  if (!category || !category.isActive) throw notFound('Category not found.');

  const pp = parsePageParams(new URL(request.url));
  const { items, total } = await listPublicProducts(env, {
    categorySlug: slug,
    sort: new URL(request.url).searchParams.get('sort'),
    offset: pp.offset,
    pageSize: pp.pageSize,
  });

  return ok(
    {
      category: { name: category.name, slug: category.slug, description: category.description, seoTitle: category.seoTitle, seoDescription: category.seoDescription },
      items,
    },
    { requestId: data.requestId, ...paginationMeta(pp.page, pp.pageSize, total) },
  );
};
