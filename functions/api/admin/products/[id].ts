import { eq } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parseJsonBody } from '../../../lib/validation';
import { ok } from '../../../lib/response';
import { badRequest, notFound } from '../../../lib/errors';
import { writeAudit } from '../../../lib/audit';
import { getClientIp } from '../../../lib/http';
import { getAdminProduct, updateProduct, productInputSchema } from '../../../lib/services/products';

export const onRequestGet: Fn = async ({ params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid product id.');
  const product = await getAdminProduct(env, id);
  return ok(product, { requestId: data.requestId });
};

export const onRequestPatch: Fn = async ({ request, params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid product id.');
  const input = await parseJsonBody(request, productInputSchema);
  const product = await updateProduct(env, id, input, data.admin?.id ?? null);
  await writeAudit(env, {
    actorId: data.admin?.id ?? null,
    action: 'product.update',
    entityType: 'product',
    entityId: id,
    ip: getClientIp(request),
  });
  return ok(product, { requestId: data.requestId });
};

/** Soft-delete (archive-and-remove). Order history keeps its own line-item snapshots. */
export const onRequestDelete: Fn = async ({ request, params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid product id.');
  const db = getDb(env);
  const rows = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.id, id)).limit(1);
  if (!rows.length) throw notFound('Product not found.');

  await db
    .update(schema.products)
    .set({ status: 'archived', deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.products.id, id));

  await writeAudit(env, {
    actorId: data.admin?.id ?? null,
    action: 'product.delete',
    entityType: 'product',
    entityId: id,
    ip: getClientIp(request),
  });
  return ok({ deleted: true }, { requestId: data.requestId });
};
