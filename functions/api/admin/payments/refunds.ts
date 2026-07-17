import { desc, eq, sql } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parsePageParams } from '../../../lib/pagination';
import { ok, paginationMeta } from '../../../lib/response';

export const onRequestGet: Fn = async ({ request, env, data }) => {
  const pp = parsePageParams(new URL(request.url));
  const db = getDb(env);
  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: schema.refunds.id,
        orderId: schema.refunds.orderId,
        orderNumber: schema.orders.orderNumber,
        amount: schema.refunds.amount,
        currency: schema.refunds.currency,
        reason: schema.refunds.reason,
        status: schema.refunds.status,
        createdAt: schema.refunds.createdAt,
      })
      .from(schema.refunds)
      .innerJoin(schema.orders, eq(schema.orders.id, schema.refunds.orderId))
      .orderBy(desc(schema.refunds.createdAt))
      .limit(pp.pageSize)
      .offset(pp.offset),
    db.select({ n: sql<number>`count(*)` }).from(schema.refunds),
  ]);
  return ok({ items: rows }, { requestId: data.requestId, ...paginationMeta(pp.page, pp.pageSize, countRows[0]?.n ?? 0) });
};
