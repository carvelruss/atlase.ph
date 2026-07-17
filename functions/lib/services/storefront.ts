import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  products,
  productImages,
  productOptions,
  productOptionValues,
  productVariants,
  inventoryItems,
  mediaAssets,
  collections,
  type CollectionRule,
} from '../../../shared/db/schema/index';
import { getDb, type Database } from '../db';
import { notFound } from '../errors';
import type { Env } from '../env';
import type { SQL } from 'drizzle-orm';

// Reusable SQL fragments for computed public columns. Outer-table columns are
// written with literal `products.*` qualifiers: inside these correlated subqueries
// (which introduce product_variants/inventory_items/media_assets — all of which
// also have an `id`), drizzle's `${products.id}` would render as a bare `"id"` and
// SQLite would raise "ambiguous column name". Literal qualifiers avoid that.
const minPriceSql = sql<number>`(SELECT min(coalesce(v.price, products.price)) FROM product_variants v WHERE v.product_id = products.id AND v.is_active = 1)`;
const thumbUrlSql = sql<string | null>`(SELECT url FROM media_assets WHERE media_assets.id = coalesce(products.featured_image_asset_id, (SELECT asset_id FROM product_images WHERE product_id = products.id ORDER BY position LIMIT 1)))`;
const inStockSql = sql<number>`(CASE WHEN products.continue_selling_oos = 1 OR products.track_inventory = 0 THEN 1 WHEN EXISTS (SELECT 1 FROM product_variants v JOIN inventory_items i ON i.variant_id = v.id WHERE v.product_id = products.id AND v.is_active = 1 AND (i.on_hand - i.reserved) > 0) THEN 1 ELSE 0 END)`;

export interface PublicListParams {
  search?: string | null;
  categorySlug?: string | null;
  collectionSlug?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  inStockOnly?: boolean;
  featuredOnly?: boolean;
  sort?: string | null;
  offset: number;
  pageSize: number;
}

/** Translate a rule-based collection rule into a SQL condition over `products`. */
function ruleToCondition(rule: CollectionRule): SQL {
  const v = rule.value;
  switch (rule.field) {
    case 'tag':
      return sql`EXISTS (SELECT 1 FROM json_each(${products.tags}) WHERE json_each.value = ${String(v)})`;
    case 'brand':
      if (rule.operator === 'contains') return sql`${products.brand} LIKE ${'%' + String(v) + '%'}`;
      if (rule.operator === 'not_equals') return sql`${products.brand} != ${String(v)}`;
      return sql`${products.brand} = ${String(v)}`;
    case 'category':
      return sql`${products.id} IN (SELECT product_id FROM product_categories WHERE category_id = ${Number(v)})`;
    case 'price': {
      const n = Number(v);
      if (rule.operator === 'gt') return sql`${minPriceSql} > ${n}`;
      if (rule.operator === 'gte') return sql`${minPriceSql} >= ${n}`;
      if (rule.operator === 'lt') return sql`${minPriceSql} < ${n}`;
      return sql`${minPriceSql} <= ${n}`;
    }
    case 'inventory':
      return sql`${inStockSql} = 1`;
    default:
      return sql`1 = 1`;
  }
}

/** Resolve a collection (by slug) into its product-membership SQL condition. */
export async function collectionCondition(
  db: Database,
  slug: string,
): Promise<{ collection: typeof collections.$inferSelect; condition: SQL } | null> {
  const rows = await db.select().from(collections).where(eq(collections.slug, slug)).limit(1);
  const collection = rows[0];
  if (!collection) return null;

  if (collection.type === 'manual') {
    return {
      collection,
      condition: sql`${products.id} IN (SELECT product_id FROM collection_products WHERE collection_id = ${collection.id})`,
    };
  }

  const rules = collection.rules ?? [];
  if (!rules.length) return { collection, condition: sql`1 = 0` };
  const parts = rules.map(ruleToCondition);
  const joiner = collection.rulesMatch === 'any' ? sql` OR ` : sql` AND `;
  const combined = parts.reduce((acc, part, i) => (i === 0 ? part : sql`${acc}${joiner}${part}`));
  return { collection, condition: sql`(${combined})` };
}

export interface PublicProductCard {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  isFeatured: boolean;
  ratingAverage: number;
  ratingCount: number;
  thumbnailUrl: string | null;
  inStock: boolean;
}

function baseCardSelection() {
  return {
    id: products.id,
    name: products.name,
    slug: products.slug,
    shortDescription: products.shortDescription,
    price: minPriceSql,
    productPrice: products.price,
    compareAtPrice: products.compareAtPrice,
    currency: products.currency,
    isFeatured: products.isFeatured,
    ratingAverage: products.ratingAverage,
    ratingCount: products.ratingCount,
    thumbnailUrl: thumbUrlSql,
    inStock: inStockSql,
    createdAt: products.createdAt,
    publishedAt: products.publishedAt,
  };
}

function toCard(r: Record<string, unknown>): PublicProductCard {
  return {
    id: r.id as number,
    name: r.name as string,
    slug: r.slug as string,
    shortDescription: (r.shortDescription as string | null) ?? null,
    price: (r.price as number | null) ?? (r.productPrice as number),
    compareAtPrice: (r.compareAtPrice as number | null) ?? null,
    currency: (r.currency as string) ?? 'PHP',
    isFeatured: Boolean(r.isFeatured),
    ratingAverage: (r.ratingAverage as number) ?? 0,
    ratingCount: (r.ratingCount as number) ?? 0,
    thumbnailUrl: (r.thumbnailUrl as string | null) ?? null,
    inStock: Number(r.inStock) === 1,
  };
}

export async function listPublicProducts(env: Env, p: PublicListParams) {
  const db = getDb(env);
  const conditions = [eq(products.status, 'active'), sql`${products.deletedAt} IS NULL`];

  if (p.search) conditions.push(sql`${products.name} LIKE ${'%' + p.search + '%'}`);
  if (p.featuredOnly) conditions.push(eq(products.isFeatured, true));
  if (p.categorySlug) {
    conditions.push(
      sql`${products.id} IN (SELECT pc.product_id FROM product_categories pc JOIN categories c ON c.id = pc.category_id WHERE c.slug = ${p.categorySlug})`,
    );
  }
  if (p.collectionSlug) {
    const resolved = await collectionCondition(db, p.collectionSlug);
    conditions.push(resolved ? resolved.condition : sql`1 = 0`);
  }
  if (p.minPrice != null) conditions.push(sql`${minPriceSql} >= ${p.minPrice}`);
  if (p.maxPrice != null) conditions.push(sql`${minPriceSql} <= ${p.maxPrice}`);
  if (p.inStockOnly) conditions.push(sql`${inStockSql} = 1`);

  const where = and(...conditions);

  let orderBy;
  switch (p.sort) {
    case 'price_asc':
      orderBy = sql`${minPriceSql} ASC`;
      break;
    case 'price_desc':
      orderBy = sql`${minPriceSql} DESC`;
      break;
    case 'featured':
      orderBy = sql`${products.isFeatured} DESC, ${products.publishedAt} DESC`;
      break;
    case 'popularity':
      orderBy = desc(products.ratingCount);
      break;
    default:
      orderBy = desc(sql`coalesce(${products.publishedAt}, ${products.createdAt})`);
  }

  const [rows, countRows] = await Promise.all([
    db.select(baseCardSelection()).from(products).where(where).orderBy(orderBy).limit(p.pageSize).offset(p.offset),
    db.select({ n: sql<number>`count(*)` }).from(products).where(where),
  ]);

  return { items: rows.map(toCard), total: countRows[0]?.n ?? 0 };
}

async function relatedProducts(db: Database, productId: number): Promise<PublicProductCard[]> {
  // Products sharing a category, excluding self.
  const rows = await db
    .select(baseCardSelection())
    .from(products)
    .where(
      and(
        eq(products.status, 'active'),
        sql`${products.deletedAt} IS NULL`,
        sql`${products.id} != ${productId}`,
        sql`${products.id} IN (SELECT product_id FROM product_categories WHERE category_id IN (SELECT category_id FROM product_categories WHERE product_id = ${productId}))`,
      ),
    )
    .limit(4);
  return rows.map(toCard);
}

export async function getPublicProduct(env: Env, slug: string) {
  const db = getDb(env);
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.status, 'active'), sql`${products.deletedAt} IS NULL`))
    .limit(1);
  const product = rows[0];
  if (!product) throw notFound('Product not found.');

  const [images, options, variants] = await Promise.all([
    db
      .select({ url: mediaAssets.url, altText: productImages.altText, position: productImages.position })
      .from(productImages)
      .innerJoin(mediaAssets, eq(mediaAssets.id, productImages.assetId))
      .where(eq(productImages.productId, product.id))
      .orderBy(productImages.position),
    db.select().from(productOptions).where(eq(productOptions.productId, product.id)).orderBy(productOptions.position),
    db.select().from(productVariants).where(and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true))).orderBy(productVariants.position),
  ]);

  const optionValues = options.length
    ? await db.select().from(productOptionValues).where(inArray(productOptionValues.optionId, options.map((o) => o.id)))
    : [];

  const inventory = variants.length
    ? await db.select().from(inventoryItems).where(inArray(inventoryItems.variantId, variants.map((v) => v.id)))
    : [];
  const invByVariant = new Map(inventory.map((i) => [i.variantId, i]));

  const variantCards = variants.map((v) => {
    const inv = invByVariant.get(v.id);
    const available = !product.trackInventory || product.continueSellingWhenOutOfStock
      ? true
      : inv
        ? inv.onHand - inv.reserved > 0
        : false;
    return {
      id: v.id,
      title: v.title,
      optionValueIds: v.optionValueIds ?? [],
      price: v.price ?? product.price,
      compareAtPrice: v.compareAtPrice ?? product.compareAtPrice,
      sku: v.sku,
      available,
      quantityAvailable: inv ? Math.max(0, inv.onHand - inv.reserved) : 0,
    };
  });

  const related = await relatedProducts(db, product.id);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    currency: product.currency,
    requiresShipping: product.requiresShipping,
    brand: product.brand,
    tags: product.tags ?? [],
    ratingAverage: product.ratingAverage,
    ratingCount: product.ratingCount,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    images: images.length ? images : [],
    options: options.map((o) => ({
      id: o.id,
      name: o.name,
      values: optionValues.filter((ov) => ov.optionId === o.id).sort((a, b) => a.position - b.position).map((ov) => ({ id: ov.id, value: ov.value })),
    })),
    variants: variantCards,
    inStock: variantCards.some((v) => v.available),
    related,
  };
}
