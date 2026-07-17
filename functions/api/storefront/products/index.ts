import type { Fn } from '../../../lib/env';
import { parsePageParams } from '../../../lib/pagination';
import { ok, paginationMeta } from '../../../lib/response';
import { listPublicProducts } from '../../../lib/services/storefront';

export const onRequestGet: Fn = async ({ request, env, data }) => {
  const url = new URL(request.url);
  const pp = parsePageParams(url);
  const minPrice = url.searchParams.get('minPrice');
  const maxPrice = url.searchParams.get('maxPrice');

  const { items, total } = await listPublicProducts(env, {
    search: pp.search,
    categorySlug: url.searchParams.get('category'),
    minPrice: minPrice ? Number(minPrice) : null,
    maxPrice: maxPrice ? Number(maxPrice) : null,
    inStockOnly: url.searchParams.get('inStock') === '1',
    featuredOnly: url.searchParams.get('featured') === '1',
    sort: url.searchParams.get('sort'),
    offset: pp.offset,
    pageSize: pp.pageSize,
  });

  return ok({ items }, { requestId: data.requestId, ...paginationMeta(pp.page, pp.pageSize, total) });
};
