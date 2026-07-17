import { z } from 'zod';
import type { Fn } from '../../../../lib/env';
import { parseJsonBody } from '../../../../lib/validation';
import { ok } from '../../../../lib/response';
import { badRequest } from '../../../../lib/errors';
import { refundOrder } from '../../../../lib/services/orders';
import { writeAudit } from '../../../../lib/audit';

const bodySchema = z.object({
  amount: z.number().int().positive(),
  reason: z.string().max(500).nullable().optional(),
  restock: z.boolean().default(false),
});

export const onRequestPost: Fn = async ({ request, params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid order id.');
  const input = await parseJsonBody(request, bodySchema);
  const order = await refundOrder(env, id, input.amount, input.reason ?? null, input.restock, data.admin?.id ?? null);
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'order.refund', entityType: 'order', entityId: id, metadata: { amount: input.amount } });
  return ok(order, { requestId: data.requestId });
};
