import { eq } from 'drizzle-orm';
import type { Fn } from '../../../../lib/env';
import { getDb, schema } from '../../../../lib/db';
import { parseJsonBody } from '../../../../lib/validation';
import { ok } from '../../../../lib/response';
import { badRequest, notFound } from '../../../../lib/errors';
import { shippingMethodSchema } from '../../../../lib/validators';
import { writeAudit } from '../../../../lib/audit';

export const onRequestPatch: Fn = async ({ request, params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid method id.');
  const db = getDb(env);
  const existing = await db.select({ id: schema.shippingMethods.id }).from(schema.shippingMethods).where(eq(schema.shippingMethods.id, id)).limit(1);
  if (!existing.length) throw notFound('Shipping method not found.');

  const input = await parseJsonBody(request, shippingMethodSchema);
  const [row] = await db
    .update(schema.shippingMethods)
    .set({
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      rate: input.rate,
      estimatedDays: input.estimatedDays ?? null,
      minOrder: input.minOrder ?? null,
      maxOrder: input.maxOrder ?? null,
      minWeightGrams: input.minWeightGrams ?? null,
      maxWeightGrams: input.maxWeightGrams ?? null,
      zoneId: input.zoneId ?? null,
      provider: input.provider,
      isActive: input.isActive,
      displayOrder: input.displayOrder,
      updatedAt: new Date(),
    })
    .where(eq(schema.shippingMethods.id, id))
    .returning();
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'shipping_method.update', entityType: 'shipping_method', entityId: id });
  return ok(row, { requestId: data.requestId });
};

export const onRequestDelete: Fn = async ({ params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid method id.');
  const db = getDb(env);
  await db.delete(schema.shippingMethods).where(eq(schema.shippingMethods.id, id));
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'shipping_method.delete', entityType: 'shipping_method', entityId: id });
  return ok({ deleted: true }, { requestId: data.requestId });
};
