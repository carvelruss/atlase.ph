import { z } from 'zod';
import type { Fn } from '../../../../lib/env';
import { parseJsonBody } from '../../../../lib/validation';
import { ok } from '../../../../lib/response';
import { badRequest } from '../../../../lib/errors';
import { fulfillOrder } from '../../../../lib/services/orders';
import { writeAudit } from '../../../../lib/audit';

const bodySchema = z.object({
  courier: z.string().max(120).nullable().optional(),
  service: z.string().max(120).nullable().optional(),
  trackingNumber: z.string().max(120).nullable().optional(),
  trackingUrl: z.string().max(500).nullable().optional(),
});

export const onRequestPost: Fn = async ({ request, params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid order id.');
  const input = await parseJsonBody(request, bodySchema);
  const order = await fulfillOrder(env, id, input, data.admin?.id ?? null);
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'order.fulfill', entityType: 'order', entityId: id, metadata: { trackingNumber: input.trackingNumber } });
  return ok(order, { requestId: data.requestId });
};
