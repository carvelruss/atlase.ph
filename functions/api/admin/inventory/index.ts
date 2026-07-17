import { and, eq, like, or, sql } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parsePageParams } from '../../../lib/pagination';
import { ok, paginationMeta } from '../../../lib/response';

/** List sellable variants with stock levels and derived state. */
export const onRequestGet: Fn = async ({ request, env, data }) => {
  const url = new URL(request.url);
  const pp = parsePageParams(url);
  const stateFilter = url.searchParams.get('state'); // low_stock | out_of_stock

  const db = getDb(env);
  const available = sql<number>`(${schema.inventoryItems.onHand} - ${schema.inventoryItems.reserved})`;

  const conditions = [];
  if (pp.search) {
    conditions.push(or(like(schema.products.name, `%${pp.search}%`), like(schema.productVariants.sku, `%${pp.search}%`))!);
  }
  if (stateFilter === 'out_of_stock') conditions.push(sql`${available} <= 0`);
  if (stateFilter === 'low_stock') {
    conditions.push(sql`${available} > 0 AND ${available} <= ${schema.inventoryItems.lowStockThreshold}`);
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const base = db
    .select({
      variantId: schema.productVariants.id,
      productId: schema.products.id,
      productName: schema.products.name,
      variantTitle: schema.productVariants.title,
      sku: schema.productVariants.sku,
      onHand: schema.inventoryItems.onHand,
      reserved: schema.inventoryItems.reserved,
      lowStockThreshold: schema.inventoryItems.lowStockThreshold,
      tracked: schema.inventoryItems.tracked,
      updatedAt: schema.inventoryItems.updatedAt,
    })
    .from(schema.inventoryItems)
    .innerJoin(schema.productVariants, eq(schema.productVariants.id, schema.inventoryItems.variantId))
    .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId));

  const rows = await (where ? base.where(where) : base).limit(pp.pageSize).offset(pp.offset);

  const countBase = db
    .select({ n: sql<number>`count(*)` })
    .from(schema.inventoryItems)
    .innerJoin(schema.productVariants, eq(schema.productVariants.id, schema.inventoryItems.variantId))
    .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId));
  const countRows = await (where ? countBase.where(where) : countBase);

  const items = rows.map((r) => {
    const avail = r.onHand - r.reserved;
    const state = !r.tracked
      ? 'not_tracked'
      : avail <= 0
        ? 'out_of_stock'
        : avail <= r.lowStockThreshold
          ? 'low_stock'
          : 'in_stock';
    return { ...r, available: avail, state };
  });

  return ok({ items }, { requestId: data.requestId, ...paginationMeta(pp.page, pp.pageSize, countRows[0]?.n ?? 0) });
};
