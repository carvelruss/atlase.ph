import { and, gte, inArray, sql } from 'drizzle-orm';
import { orders, customers, analyticsEvents } from '../../../shared/db/schema/index';
import { getDb } from '../db';
import { rangeStart, rangeStartEpoch } from '../dateRange';
import type { Env } from '../env';

const COUNTED = ['pending', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered'];

export async function salesAnalytics(env: Env, range: string) {
  const db = getDb(env);
  const since = rangeStart(range);
  const sinceEpoch = rangeStartEpoch(range);

  const [totals, series] = await Promise.all([
    db
      .select({
        gross: sql<number>`coalesce(sum(${orders.grandTotal}),0)`,
        discounts: sql<number>`coalesce(sum(${orders.discountTotal}),0)`,
        shipping: sql<number>`coalesce(sum(${orders.shippingTotal}),0)`,
        tax: sql<number>`coalesce(sum(${orders.taxTotal}),0)`,
        refunds: sql<number>`coalesce(sum(${orders.amountRefunded}),0)`,
        orders: sql<number>`count(*)`,
      })
      .from(orders)
      .where(and(gte(orders.createdAt, since), inArray(orders.status, COUNTED))),
    db.all<{ day: string; total: number; orders: number }>(
      sql`SELECT strftime('%Y-%m-%d', ${orders.createdAt}, 'unixepoch') AS day,
                 coalesce(sum(${orders.grandTotal}),0) AS total, count(*) AS orders
          FROM ${orders} WHERE ${orders.createdAt} >= ${sinceEpoch} AND ${orders.status} != 'draft'
          GROUP BY day ORDER BY day ASC`,
    ),
  ]);

  const t = totals[0] ?? { gross: 0, discounts: 0, shipping: 0, tax: 0, refunds: 0, orders: 0 };
  return {
    range,
    summary: {
      grossSales: t.gross,
      netSales: t.gross - t.refunds,
      discounts: t.discounts,
      refunds: t.refunds,
      shipping: t.shipping,
      tax: t.tax,
      totalOrders: t.orders,
      averageOrderValue: t.orders > 0 ? Math.round(t.gross / t.orders) : 0,
    },
    series,
  };
}

export async function trafficAnalytics(env: Env, range: string) {
  const db = getDb(env);
  const sinceEpoch = rangeStartEpoch(range);
  const since = rangeStart(range);

  const counts = await db.all<{ type: string; n: number; sessions: number }>(
    sql`SELECT type, count(*) AS n, count(DISTINCT session_id) AS sessions
        FROM ${analyticsEvents} WHERE ${analyticsEvents.createdAt} >= ${sinceEpoch}
        GROUP BY type`,
  );
  const byType = new Map(counts.map((c) => [c.type, c]));
  const totalSessions = (
    await db.select({ n: sql<number>`count(DISTINCT ${analyticsEvents.sessionId})` }).from(analyticsEvents).where(gte(analyticsEvents.createdAt, since))
  )[0]?.n ?? 0;
  const purchases = byType.get('purchase')?.n ?? 0;

  const [sources, devices, series] = await Promise.all([
    db.all<{ source: string; n: number }>(sql`SELECT coalesce(source,'direct') AS source, count(DISTINCT session_id) AS n FROM ${analyticsEvents} WHERE ${analyticsEvents.createdAt} >= ${sinceEpoch} GROUP BY source ORDER BY n DESC LIMIT 8`),
    db.all<{ device: string; n: number }>(sql`SELECT coalesce(device,'unknown') AS device, count(DISTINCT session_id) AS n FROM ${analyticsEvents} WHERE ${analyticsEvents.createdAt} >= ${sinceEpoch} GROUP BY device ORDER BY n DESC`),
    db.all<{ day: string; sessions: number }>(sql`SELECT strftime('%Y-%m-%d', ${analyticsEvents.createdAt}, 'unixepoch') AS day, count(DISTINCT session_id) AS sessions FROM ${analyticsEvents} WHERE ${analyticsEvents.createdAt} >= ${sinceEpoch} GROUP BY day ORDER BY day ASC`),
  ]);

  return {
    range,
    summary: {
      sessions: totalSessions,
      productViews: byType.get('product_view')?.n ?? 0,
      addToCart: byType.get('add_to_cart')?.n ?? 0,
      checkoutStarts: byType.get('checkout_start')?.n ?? 0,
      purchases,
      conversionRate: totalSessions > 0 ? Math.round((purchases / totalSessions) * 1000) / 10 : 0,
    },
    sources,
    devices,
    series,
  };
}

export async function productAnalytics(env: Env, range: string) {
  const db = getDb(env);
  const sinceEpoch = rangeStartEpoch(range);

  const top = await db.all<{ productId: number; name: string; units: number; revenue: number }>(
    sql`SELECT oi.product_id AS productId, oi.name AS name, sum(oi.quantity) AS units, sum(oi.total_price) AS revenue
        FROM order_items oi JOIN ${orders} o ON o.id = oi.order_id
        WHERE o.created_at >= ${sinceEpoch} AND o.status != 'draft' AND o.status != 'cancelled'
        GROUP BY oi.product_id, oi.name ORDER BY revenue DESC LIMIT 10`,
  );
  const views = await db.all<{ productId: number; views: number }>(
    sql`SELECT product_id AS productId, count(*) AS views FROM ${analyticsEvents} WHERE type = 'product_view' AND product_id IS NOT NULL AND ${analyticsEvents.createdAt} >= ${sinceEpoch} GROUP BY product_id ORDER BY views DESC LIMIT 10`,
  );

  return { range, topProducts: top, mostViewed: views };
}

export async function customerAnalytics(env: Env, range: string) {
  const db = getDb(env);
  const since = rangeStart(range);

  const [newCount, returningCount, totalCustomers, topCustomers, byRegion] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(customers).where(gte(customers.createdAt, since)),
    db.select({ n: sql<number>`count(*)` }).from(customers).where(sql`${customers.ordersCount} > 1`),
    db.select({ n: sql<number>`count(*)` }).from(customers).where(sql`${customers.ordersCount} > 0`),
    db
      .select({ id: customers.id, email: customers.email, firstName: customers.firstName, lastName: customers.lastName, totalSpent: customers.totalSpent, ordersCount: customers.ordersCount })
      .from(customers)
      .orderBy(sql`${customers.totalSpent} DESC`)
      .limit(8),
    db.all<{ region: string; n: number }>(sql`SELECT coalesce(province,'Unknown') AS region, count(*) AS n FROM order_addresses WHERE type='shipping' GROUP BY province ORDER BY n DESC LIMIT 8`),
  ]);

  const total = totalCustomers[0]?.n ?? 0;
  const returning = returningCount[0]?.n ?? 0;
  return {
    range,
    summary: {
      newCustomers: newCount[0]?.n ?? 0,
      returningCustomers: returning,
      repeatPurchaseRate: total > 0 ? Math.round((returning / total) * 1000) / 10 : 0,
      totalPurchasers: total,
    },
    topCustomers,
    byRegion,
  };
}

/** Record a first-party analytics event (privacy-conscious: hashed session, no PII). */
export async function recordEvent(env: Env, event: {
  sessionId: string;
  type: string;
  path?: string | null;
  productId?: number | null;
  value?: number | null;
  referrer?: string | null;
  source?: string | null;
  device?: string | null;
  country?: string | null;
}) {
  const db = getDb(env);
  await db.insert(analyticsEvents).values({
    sessionId: event.sessionId,
    type: event.type,
    path: event.path ?? null,
    productId: event.productId ?? null,
    value: event.value ?? null,
    referrer: event.referrer ?? null,
    source: event.source ?? null,
    device: event.device ?? null,
    country: event.country ?? null,
  });
}
