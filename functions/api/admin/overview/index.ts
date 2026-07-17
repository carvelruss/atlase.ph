import { and, desc, eq, gte, inArray, lte, ne, sql } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { ok } from '../../../lib/response';

function rangeStart(range: string): Date {
  const now = new Date();
  const d = new Date(now);
  switch (range) {
    case 'today':
      d.setUTCHours(0, 0, 0, 0);
      return d;
    case 'yesterday':
      d.setUTCDate(d.getUTCDate() - 1);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    case '7d':
      d.setUTCDate(d.getUTCDate() - 7);
      return d;
    case 'month':
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    case 'year':
      return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    case 'lifetime':
      return new Date(0);
    case '30d':
    default:
      d.setUTCDate(d.getUTCDate() - 30);
      return d;
  }
}

const COUNTED_STATUSES = ['pending', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered'];

/** Dashboard summary metrics — all derived from D1 (spec §7). */
export const onRequestGet: Fn = async ({ request, env, data }) => {
  const url = new URL(request.url);
  const range = url.searchParams.get('range') ?? '30d';
  const since = rangeStart(range);
  const db = getDb(env);

  const [summary, newCustomers, recentOrders, lowStock, paymentBreakdown, series] = await Promise.all([
    db
      .select({
        gross: sql<number>`coalesce(sum(${schema.orders.grandTotal}), 0)`,
        refunded: sql<number>`coalesce(sum(${schema.orders.amountRefunded}), 0)`,
        orders: sql<number>`count(*)`,
      })
      .from(schema.orders)
      .where(and(gte(schema.orders.createdAt, since), inArray(schema.orders.status, COUNTED_STATUSES))),
    db
      .select({ n: sql<number>`count(*)` })
      .from(schema.customers)
      .where(gte(schema.customers.createdAt, since)),
    db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        email: schema.orders.email,
        grandTotal: schema.orders.grandTotal,
        status: schema.orders.status,
        paymentStatus: schema.orders.paymentStatus,
        createdAt: schema.orders.createdAt,
      })
      .from(schema.orders)
      .where(ne(schema.orders.status, 'draft'))
      .orderBy(desc(schema.orders.createdAt))
      .limit(6),
    db
      .select({
        variantId: schema.inventoryItems.variantId,
        onHand: schema.inventoryItems.onHand,
        reserved: schema.inventoryItems.reserved,
        threshold: schema.inventoryItems.lowStockThreshold,
        name: schema.products.name,
        sku: schema.productVariants.sku,
      })
      .from(schema.inventoryItems)
      .innerJoin(schema.productVariants, sql`${schema.productVariants.id} = ${schema.inventoryItems.variantId}`)
      .innerJoin(schema.products, sql`${schema.products.id} = ${schema.productVariants.productId}`)
      .where(
        and(
          eq(schema.inventoryItems.tracked, true),
          lte(
            sql`${schema.inventoryItems.onHand} - ${schema.inventoryItems.reserved}`,
            schema.inventoryItems.lowStockThreshold,
          ),
        ),
      )
      .limit(6),
    db
      .select({
        status: schema.orders.paymentStatus,
        n: sql<number>`count(*)`,
      })
      .from(schema.orders)
      .where(and(gte(schema.orders.createdAt, since), ne(schema.orders.status, 'draft')))
      .groupBy(schema.orders.paymentStatus),
    db.all<{ day: string; total: number; orders: number }>(
      sql`SELECT strftime('%Y-%m-%d', ${schema.orders.createdAt}, 'unixepoch') AS day,
                 coalesce(sum(${schema.orders.grandTotal}), 0) AS total,
                 count(*) AS orders
          FROM ${schema.orders}
          WHERE ${schema.orders.createdAt} >= ${Math.floor(since.getTime() / 1000)}
            AND ${schema.orders.status} != 'draft'
          GROUP BY day ORDER BY day ASC`,
    ),
  ]);

  const s = summary[0] ?? { gross: 0, refunded: 0, orders: 0 };
  const netSales = s.gross - s.refunded;
  const aov = s.orders > 0 ? Math.round(s.gross / s.orders) : 0;

  return ok(
    {
      range,
      summary: {
        grossSales: s.gross,
        netSales,
        totalOrders: s.orders,
        averageOrderValue: aov,
        newCustomers: newCustomers[0]?.n ?? 0,
        lowStockCount: lowStock.length,
      },
      salesOverTime: series,
      paymentBreakdown,
      recentOrders,
      lowStock: lowStock.map((r) => ({
        name: r.name,
        sku: r.sku,
        available: r.onHand - r.reserved,
        threshold: r.threshold,
      })),
    },
    { requestId: data.requestId },
  );
};
