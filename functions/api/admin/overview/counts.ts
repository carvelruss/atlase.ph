import { and, eq, inArray, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { ok } from '../../../lib/response';

// Orders that still need to leave the warehouse (paid/confirmed but not yet shipped).
const TO_SHIP_STATUSES = ['pending', 'confirmed', 'processing', 'ready_to_ship'];

/** Lightweight counts for sidebar badges, dashboard tiles, and quick indicators. */
export const onRequestGet: Fn = async ({ env, data }) => {
  const db = getDb(env);

  const [pending, lowStock, toShip, abandoned] = await Promise.all([
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
    db
      .select({
        n: sql<number>`count(*)`,
        value: sql<number>`coalesce(sum(${schema.orders.grandTotal}), 0)`,
      })
      .from(schema.orders)
      .where(
        and(
          inArray(schema.orders.status, TO_SHIP_STATUSES),
          inArray(schema.orders.fulfillmentStatus, ['unfulfilled', 'partially_fulfilled']),
        ),
      ),
    db
      .select({ n: sql<number>`count(*)` })
      .from(schema.checkouts)
      .where(and(isNotNull(schema.checkouts.abandonedAt), isNull(schema.checkouts.recoveredAt))),
  ]);

  return ok(
    {
      ordersPending: pending[0]?.n ?? 0,
      lowStock: lowStock[0]?.n ?? 0,
      toShipCount: toShip[0]?.n ?? 0,
      toShipValue: toShip[0]?.value ?? 0,
      abandonedCount: abandoned[0]?.n ?? 0,
    },
    { requestId: data.requestId },
  );
};
