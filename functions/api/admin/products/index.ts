import type { Fn } from '../../../lib/env';
import { parsePageParams } from '../../../lib/pagination';
import { parseJsonBody } from '../../../lib/validation';
import { ok, created, paginationMeta } from '../../../lib/response';
import { writeAudit } from '../../../lib/audit';
import { getClientIp } from '../../../lib/http';
import { createProduct, listAdminProducts, productInputSchema } from '../../../lib/services/products';

export const onRequestGet: Fn = async ({ request, env, data }) => {
  const url = new URL(request.url);
  const pp = parsePageParams(url);
  const status = url.searchParams.get('status');
  const categoryId = url.searchParams.get('categoryId');

  const { items, total } = await listAdminProducts(env, {
    offset: pp.offset,
    pageSize: pp.pageSize,
    search: pp.search,
    status: status || null,
    categoryId: categoryId ? Number(categoryId) : null,
    sort: pp.sort,
    order: pp.order,
  });

  return ok({ items }, { requestId: data.requestId, ...paginationMeta(pp.page, pp.pageSize, total) });
};

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const input = await parseJsonBody(request, productInputSchema);
  const product = await createProduct(env, input, data.admin?.id ?? null);
  await writeAudit(env, {
    actorId: data.admin?.id ?? null,
    action: 'product.create',
    entityType: 'product',
    entityId: product.id,
    ip: getClientIp(request),
    metadata: { name: product.name },
  });
  return created(product, { requestId: data.requestId });
};
