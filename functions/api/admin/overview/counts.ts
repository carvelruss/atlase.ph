import { and, eq, lte, sql } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { ok } from '../../../lib/response';

/** Lightweight counts for sidebar badges and quick indicators. */
export const onRequestGet: Fn = async ({ env, data }) => {
  const db = getDb(env);

  const [pending, lowStock] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)` })
      .from(schema.orders)
      .where(eq(schema.orders.status, 'pending')),
    db
      .select({ n: sql<number>`count(*)` })
      .from(schema.inventoryItems)
      .where(
        and(
          eq(schema.inventoryItems.tracked, true),
          lte(
            sql`${schema.inventoryItems.onHand} - ${schema.inventoryItems.reserved}`,
            schema.inventoryItems.lowStockThreshold,
          ),
        ),
      ),
  ]);

  return ok(
    {
      ordersPending: pending[0]?.n ?? 0,
      lowStock: lowStock[0]?.n ?? 0,
    },
    { requestId: data.requestId },
  );
};
