import type { Fn } from '../../../lib/env';
import { parsePageParams } from '../../../lib/pagination';
import { ok, paginationMeta } from '../../../lib/response';
import { listAdminOrders } from '../../../lib/services/orders';

export const onRequestGet: Fn = async ({ request, env, data }) => {
  const url = new URL(request.url);
  const pp = parsePageParams(url);
  const { items, total } = await listAdminOrders(env, {
    offset: pp.offset,
    pageSize: pp.pageSize,
    search: pp.search,
    status: url.searchParams.get('status'),
    paymentStatus: url.searchParams.get('paymentStatus'),
    fulfillmentStatus: url.searchParams.get('fulfillmentStatus'),
  });
  return ok({ items }, { requestId: data.requestId, ...paginationMeta(pp.page, pp.pageSize, total) });
};
