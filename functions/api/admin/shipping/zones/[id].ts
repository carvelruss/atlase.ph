import { eq } from 'drizzle-orm';
import type { Fn } from '../../../../lib/env';
import { getDb, schema } from '../../../../lib/db';
import { parseJsonBody } from '../../../../lib/validation';
import { ok } from '../../../../lib/response';
import { badRequest, notFound } from '../../../../lib/errors';
import { shippingZoneSchema } from '../../../../lib/validators';
import { writeAudit } from '../../../../lib/audit';

export const onRequestPatch: Fn = async ({ request, params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid zone id.');
  const db = getDb(env);
  const existing = await db.select({ id: schema.shippingZones.id }).from(schema.shippingZones).where(eq(schema.shippingZones.id, id)).limit(1);
  if (!existing.length) throw notFound('Shipping zone not found.');
  const input = await parseJsonBody(request, shippingZoneSchema);
  const [row] = await db
    .update(schema.shippingZones)
    .set({ name: input.name, countries: input.countries, provinces: input.provinces, isActive: input.isActive, updatedAt: new Date() })
    .where(eq(schema.shippingZones.id, id))
    .returning();
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'shipping_zone.update', entityType: 'shipping_zone', entityId: id });
  return ok(row, { requestId: data.requestId });
};

export const onRequestDelete: Fn = async ({ params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid zone id.');
  const db = getDb(env);
  await db.delete(schema.shippingZones).where(eq(schema.shippingZones.id, id));
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'shipping_zone.delete', entityType: 'shipping_zone', entityId: id });
  return ok({ deleted: true }, { requestId: data.requestId });
};
