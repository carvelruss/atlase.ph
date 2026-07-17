import { eq, sql } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parseJsonBody } from '../../../lib/validation';
import { ok } from '../../../lib/response';
import { badRequest, notFound } from '../../../lib/errors';
import { inventoryAdjustSchema } from '../../../lib/validators';
import { writeAudit } from '../../../lib/audit';

/** Manual stock adjustment: appends to the ledger and updates on-hand atomically. */
export const onRequestPost: Fn = async ({ request, env, data }) => {
  const input = await parseJsonBody(request, inventoryAdjustSchema);
  const db = getDb(env);

  const rows = await db
    .select()
    .from(schema.inventoryItems)
    .where(eq(schema.inventoryItems.variantId, input.variantId))
    .limit(1);
  const item = rows[0];
  if (!item) throw notFound('Inventory item not found.');

  const newOnHand = item.onHand + input.delta;
  if (newOnHand < 0) throw badRequest('Adjustment would make on-hand negative.');

  await db.batch([
    db
      .update(schema.inventoryItems)
      .set({ onHand: sql`${schema.inventoryItems.onHand} + ${input.delta}`, updatedAt: new Date() })
      .where(eq(schema.inventoryItems.variantId, input.variantId)),
    db.insert(schema.inventoryAdjustments).values({
      variantId: input.variantId,
      delta: input.delta,
      reason: input.reason,
      note: input.note ?? null,
      actorId: data.admin?.id ?? null,
    }),
  ]);

  await writeAudit(env, {
    actorId: data.admin?.id ?? null,
    action: 'inventory.adjust',
    entityType: 'variant',
    entityId: input.variantId,
    metadata: { delta: input.delta, reason: input.reason },
  });

  return ok({ variantId: input.variantId, onHand: newOnHand }, { requestId: data.requestId });
};
