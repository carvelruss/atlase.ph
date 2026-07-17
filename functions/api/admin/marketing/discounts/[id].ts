import { and, eq, ne } from 'drizzle-orm';
import type { Fn } from '../../../../lib/env';
import { getDb, schema } from '../../../../lib/db';
import { parseJsonBody } from '../../../../lib/validation';
import { ok } from '../../../../lib/response';
import { badRequest, conflict, notFound } from '../../../../lib/errors';
import { discountSchema } from '../../../../lib/validators';
import { discountValues } from './index';
import { writeAudit } from '../../../../lib/audit';

export const onRequestGet: Fn = async ({ params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid discount id.');
  const db = getDb(env);
  const rows = await db.select().from(schema.discounts).where(eq(schema.discounts.id, id)).limit(1);
  if (!rows[0]) throw notFound('Discount not found.');
  return ok(rows[0], { requestId: data.requestId });
};

export const onRequestPatch: Fn = async ({ request, params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid discount id.');
  const db = getDb(env);
  const existing = await db.select({ id: schema.discounts.id }).from(schema.discounts).where(eq(schema.discounts.id, id)).limit(1);
  if (!existing.length) throw notFound('Discount not found.');

  const input = await parseJsonBody(request, discountSchema);
  const values = discountValues(input);
  if (values.code) {
    const dup = await db.select({ id: schema.discounts.id }).from(schema.discounts).where(and(eq(schema.discounts.code, values.code), ne(schema.discounts.id, id))).limit(1);
    if (dup[0]) throw conflict('A discount with that code already exists.');
  }

  const [row] = await db.update(schema.discounts).set({ ...values, updatedAt: new Date() }).where(eq(schema.discounts.id, id)).returning();
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'discount.update', entityType: 'discount', entityId: id });
  return ok(row, { requestId: data.requestId });
};

export const onRequestDelete: Fn = async ({ params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid discount id.');
  const db = getDb(env);
  await db.delete(schema.discounts).where(eq(schema.discounts.id, id));
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'discount.delete', entityType: 'discount', entityId: id });
  return ok({ deleted: true }, { requestId: data.requestId });
};
