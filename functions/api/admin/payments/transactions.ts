import { desc, eq } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parsePageParams } from '../../../lib/pagination';
import { ok, paginationMeta } from '../../../lib/response';
import { sql } from 'drizzle-orm';

export const onRequestGet: Fn = async ({ request, env, data }) => {
  const pp = parsePageParams(new URL(request.url));
  const db = getDb(env);
  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: schema.payments.id,
        orderId: schema.payments.orderId,
        orderNumber: schema.orders.orderNumber,
        email: schema.orders.email,
        provider: schema.payments.provider,
        method: schema.payments.method,
        reference: schema.payments.reference,
        amount: schema.payments.amount,
        currency: schema.payments.currency,
        status: schema.payments.status,
        createdAt: schema.payments.createdAt,
      })
      .from(schema.payments)
      .innerJoin(schema.orders, eq(schema.orders.id, schema.payments.orderId))
      .orderBy(desc(schema.payments.createdAt))
      .limit(pp.pageSize)
      .offset(pp.offset),
    db.select({ n: sql<number>`count(*)` }).from(schema.payments),
  ]);
  return ok({ items: rows }, { requestId: data.requestId, ...paginationMeta(pp.page, pp.pageSize, countRows[0]?.n ?? 0) });
};
