import { asc } from 'drizzle-orm';
import type { Fn } from '../../../../lib/env';
import { getDb, schema } from '../../../../lib/db';
import { parseJsonBody } from '../../../../lib/validation';
import { ok, created } from '../../../../lib/response';
import { shippingZoneSchema } from '../../../../lib/validators';
import { writeAudit } from '../../../../lib/audit';

export const onRequestGet: Fn = async ({ env, data }) => {
  const db = getDb(env);
  const items = await db.select().from(schema.shippingZones).orderBy(asc(schema.shippingZones.name));
  return ok({ items }, { requestId: data.requestId });
};

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const input = await parseJsonBody(request, shippingZoneSchema);
  const db = getDb(env);
  const [row] = await db
    .insert(schema.shippingZones)
    .values({ name: input.name, countries: input.countries, provinces: input.provinces, isActive: input.isActive })
    .returning();
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'shipping_zone.create', entityType: 'shipping_zone', entityId: row?.id });
  return created(row, { requestId: data.requestId });
};
