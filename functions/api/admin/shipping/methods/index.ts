import { asc } from 'drizzle-orm';
import type { Fn } from '../../../../lib/env';
import { getDb, schema } from '../../../../lib/db';
import { parseJsonBody } from '../../../../lib/validation';
import { ok, created } from '../../../../lib/response';
import { shippingMethodSchema } from '../../../../lib/validators';
import { writeAudit } from '../../../../lib/audit';

export const onRequestGet: Fn = async ({ env, data }) => {
  const db = getDb(env);
  const items = await db.select().from(schema.shippingMethods).orderBy(asc(schema.shippingMethods.displayOrder));
  return ok({ items }, { requestId: data.requestId });
};

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const input = await parseJsonBody(request, shippingMethodSchema);
  const db = getDb(env);
  const [row] = await db
    .insert(schema.shippingMethods)
    .values({
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
    })
    .returning();
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'shipping_method.create', entityType: 'shipping_method', entityId: row?.id });
  return created(row, { requestId: data.requestId });
};
