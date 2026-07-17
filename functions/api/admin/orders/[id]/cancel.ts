import { z } from 'zod';
import type { Fn } from '../../../../lib/env';
import { parseJsonBody } from '../../../../lib/validation';
import { ok } from '../../../../lib/response';
import { badRequest } from '../../../../lib/errors';
import { cancelOrder } from '../../../../lib/services/orders';
import { writeAudit } from '../../../../lib/audit';

const bodySchema = z.object({ restock: z.boolean().default(true) });

export const onRequestPost: Fn = async ({ request, params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid order id.');
  const { restock } = await parseJsonBody(request, bodySchema);
  const order = await cancelOrder(env, id, restock, data.admin?.id ?? null);
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'order.cancel', entityType: 'order', entityId: id, metadata: { restock } });
  return ok(order, { requestId: data.requestId });
};
