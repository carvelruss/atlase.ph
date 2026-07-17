import { desc, eq, like, or, sql } from 'drizzle-orm';
import type { Fn } from '../../../../lib/env';
import { getDb, schema } from '../../../../lib/db';
import { parsePageParams } from '../../../../lib/pagination';
import { parseJsonBody } from '../../../../lib/validation';
import { ok, created, paginationMeta } from '../../../../lib/response';
import { conflict } from '../../../../lib/errors';
import { discountSchema, type DiscountInput } from '../../../../lib/validators';
import { writeAudit } from '../../../../lib/audit';

export function discountValues(input: DiscountInput) {
  return {
    name: input.name,
    code: input.code ? input.code.trim().toUpperCase() : null,
    description: input.description ?? null,
    type: input.type,
    value: input.value,
    isAutomatic: input.isAutomatic,
    minPurchase: input.minPurchase ?? null,
    minQuantity: input.minQuantity ?? null,
    firstOrderOnly: input.firstOrderOnly,
    appliesTo: input.appliesTo,
    eligibleProductIds: input.eligibleProductIds ?? null,
    eligibleCategoryIds: input.eligibleCategoryIds ?? null,
    eligibleCollectionIds: input.eligibleCollectionIds ?? null,
    usageLimit: input.usageLimit ?? null,
    perCustomerLimit: input.perCustomerLimit ?? null,
    combinesWithProduct: input.combinesWithProduct,
    combinesWithShipping: input.combinesWithShipping,
    buyQuantity: input.buyQuantity ?? null,
    getQuantity: input.getQuantity ?? null,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    isActive: input.isActive,
  };
}

export const onRequestGet: Fn = async ({ request, env, data }) => {
  const url = new URL(request.url);
  const pp = parsePageParams(url);
  const db = getDb(env);
  const where = pp.search
    ? or(like(schema.discounts.name, `%${pp.search}%`), like(schema.discounts.code, `%${pp.search}%`))
    : undefined;

  const [rows, countRows] = await Promise.all([
    db.select().from(schema.discounts).where(where).orderBy(desc(schema.discounts.createdAt)).limit(pp.pageSize).offset(pp.offset),
    db.select({ n: sql<number>`count(*)` }).from(schema.discounts).where(where),
  ]);

  return ok({ items: rows }, { requestId: data.requestId, ...paginationMeta(pp.page, pp.pageSize, countRows[0]?.n ?? 0) });
};

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const input = await parseJsonBody(request, discountSchema);
  const db = getDb(env);
  const values = discountValues(input);

  if (values.code) {
    const existing = await db.select({ id: schema.discounts.id }).from(schema.discounts).where(eq(schema.discounts.code, values.code)).limit(1);
    if (existing[0]) throw conflict('A discount with that code already exists.');
  }

  const [row] = await db.insert(schema.discounts).values(values).returning();
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'discount.create', entityType: 'discount', entityId: row?.id });
  return created(row, { requestId: data.requestId });
};
