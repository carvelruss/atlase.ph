import { desc, eq } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parseJsonBody } from '../../../lib/validation';
import { ok } from '../../../lib/response';
import { badRequest, notFound } from '../../../lib/errors';
import { customerSchema } from '../../../lib/validators';
import { writeAudit } from '../../../lib/audit';

export const onRequestGet: Fn = async ({ params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid customer id.');
  const db = getDb(env);
  const rows = await db.select().from(schema.customers).where(eq(schema.customers.id, id)).limit(1);
  const customer = rows[0];
  if (!customer || customer.deletedAt) throw notFound('Customer not found.');

  const [orders, addresses] = await Promise.all([
    db
      .select({ id: schema.orders.id, orderNumber: schema.orders.orderNumber, grandTotal: schema.orders.grandTotal, status: schema.orders.status, paymentStatus: schema.orders.paymentStatus, createdAt: schema.orders.createdAt })
      .from(schema.orders)
      .where(eq(schema.orders.customerId, id))
      .orderBy(desc(schema.orders.createdAt))
      .limit(50),
    db.select().from(schema.customerAddresses).where(eq(schema.customerAddresses.customerId, id)),
  ]);

  return ok({ ...customer, orders, addresses }, { requestId: data.requestId });
};

export const onRequestPatch: Fn = async ({ request, params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid customer id.');
  const db = getDb(env);
  const existing = await db.select({ id: schema.customers.id }).from(schema.customers).where(eq(schema.customers.id, id)).limit(1);
  if (!existing.length) throw notFound('Customer not found.');

  const input = await parseJsonBody(request, customerSchema);
  const [row] = await db
    .update(schema.customers)
    .set({
      email: input.email.toLowerCase(),
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      phone: input.phone ?? null,
      marketingConsent: input.marketingConsent ?? false,
      note: input.note ?? null,
      tags: input.tags ?? null,
      status: input.status ?? 'active',
      updatedAt: new Date(),
    })
    .where(eq(schema.customers.id, id))
    .returning();
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'customer.update', entityType: 'customer', entityId: id });
  return ok(row, { requestId: data.requestId });
};
