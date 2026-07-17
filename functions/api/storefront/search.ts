import type { Fn } from '../../lib/env';
import { parsePageParams } from '../../lib/pagination';
import { ok, paginationMeta } from '../../lib/response';
import { listPublicProducts } from '../../lib/services/storefront';

export const onRequestGet: Fn = async ({ request, env, data }) => {
  const url = new URL(request.url);
  const pp = parsePageParams(url);
  const { items, total } = await listPublicProducts(env, {
    search: pp.search,
    sort: url.searchParams.get('sort'),
    offset: pp.offset,
    pageSize: pp.pageSize,
  });
  return ok({ query: pp.search ?? '', items }, { requestId: data.requestId, ...paginationMeta(pp.page, pp.pageSize, total) });
};
