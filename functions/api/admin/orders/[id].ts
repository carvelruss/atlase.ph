import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parseJsonBody } from '../../../lib/validation';
import { ok } from '../../../lib/response';
import { badRequest } from '../../../lib/errors';
import { getAdminOrder, updateOrderStatus } from '../../../lib/services/orders';
import { ORDER_STATUSES, PAYMENT_STATUSES, FULFILLMENT_STATUSES } from '../../../lib/shared';
import { writeAudit } from '../../../lib/audit';

export const onRequestGet: Fn = async ({ params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid order id.');
  const order = await getAdminOrder(env, id);
  return ok(order, { requestId: data.requestId });
};

const patchSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  fulfillmentStatus: z.enum(FULFILLMENT_STATUSES).optional(),
  internalNote: z.string().max(2000).optional(),
  addNote: z.object({ body: z.string().min(1).max(2000), visibility: z.enum(['internal', 'customer']).default('internal') }).optional(),
});

export const onRequestPatch: Fn = async ({ request, params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid order id.');
  const input = await parseJsonBody(request, patchSchema);
  const actorId = data.admin?.id ?? null;
  const db = getDb(env);

  if (input.status) await updateOrderStatus(env, id, 'status', input.status, actorId);
  if (input.paymentStatus) await updateOrderStatus(env, id, 'paymentStatus', input.paymentStatus, actorId);
  if (input.fulfillmentStatus) await updateOrderStatus(env, id, 'fulfillmentStatus', input.fulfillmentStatus, actorId);

  if (input.internalNote !== undefined) {
    await db.update(schema.orders).set({ internalNote: input.internalNote, updatedAt: new Date() }).where(eq(schema.orders.id, id));
  }
  if (input.addNote) {
    await db.insert(schema.orderNotes).values({ orderId: id, body: input.addNote.body, visibility: input.addNote.visibility, actorId });
  }

  await writeAudit(env, { actorId, action: 'order.update', entityType: 'order', entityId: id, metadata: { ...input } });
  const order = await getAdminOrder(env, id);
  return ok(order, { requestId: data.requestId });
};
