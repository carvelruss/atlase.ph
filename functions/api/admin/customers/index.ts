import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parsePageParams } from '../../../lib/pagination';
import { parseJsonBody } from '../../../lib/validation';
import { ok, created, paginationMeta } from '../../../lib/response';
import { conflict } from '../../../lib/errors';
import { customerSchema } from '../../../lib/validators';
import { writeAudit } from '../../../lib/audit';

export const onRequestGet: Fn = async ({ request, env, data }) => {
  const url = new URL(request.url);
  const pp = parsePageParams(url);
  const db = getDb(env);
  const where = and(
    sql`${schema.customers.deletedAt} IS NULL`,
    pp.search
      ? or(
          like(schema.customers.email, `%${pp.search}%`),
          like(schema.customers.firstName, `%${pp.search}%`),
          like(schema.customers.lastName, `%${pp.search}%`),
          like(schema.customers.phone, `%${pp.search}%`),
        )
      : undefined,
  );

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: schema.customers.id,
        email: schema.customers.email,
        firstName: schema.customers.firstName,
        lastName: schema.customers.lastName,
        phone: schema.customers.phone,
        ordersCount: schema.customers.ordersCount,
        totalSpent: schema.customers.totalSpent,
        lastOrderAt: schema.customers.lastOrderAt,
        marketingConsent: schema.customers.marketingConsent,
        status: schema.customers.status,
      })
      .from(schema.customers)
      .where(where)
      .orderBy(desc(schema.customers.createdAt))
      .limit(pp.pageSize)
      .offset(pp.offset),
    db.select({ n: sql<number>`count(*)` }).from(schema.customers).where(where),
  ]);

  return ok({ items: rows }, { requestId: data.requestId, ...paginationMeta(pp.page, pp.pageSize, countRows[0]?.n ?? 0) });
};

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const input = await parseJsonBody(request, customerSchema);
  const db = getDb(env);
  const email = input.email.toLowerCase();
  const existing = await db.select({ id: schema.customers.id }).from(schema.customers).where(eq(schema.customers.email, email)).limit(1);
  if (existing[0]) throw conflict('A customer with that email already exists.');

  const [row] = await db
    .insert(schema.customers)
    .values({
      email,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      phone: input.phone ?? null,
      isGuest: false,
      marketingConsent: input.marketingConsent ?? false,
      note: input.note ?? null,
      tags: input.tags ?? null,
      status: input.status ?? 'active',
    })
    .returning();
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'customer.create', entityType: 'customer', entityId: row?.id });
  return created(row, { requestId: data.requestId });
};
