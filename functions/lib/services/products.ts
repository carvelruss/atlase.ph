import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  products,
  productImages,
  productOptions,
  productOptionValues,
  productVariants,
  productCategories,
  collectionProducts,
  inventoryItems,
  inventoryAdjustments,
  mediaAssets,
} from '../../../shared/db/schema/index';
import { getDb, type Database } from '../db';
import { ensureUniqueSlug } from '../slugs';
import { notFound } from '../errors';
import { sanitizeHtml } from '../../../shared/utils/sanitize';
import { PRODUCT_STATUSES } from '../../../shared/constants/index';
import type { Env } from '../env';

// --- Validation --------------------------------------------------------------

const imageInput = z.object({
  assetId: z.number().int().positive(),
  altText: z.string().max(300).nullable().optional(),
});

const variantInput = z.object({
  id: z.number().int().positive().optional(),
  optionSelections: z.array(z.string()).default([]), // aligned to options order
  sku: z.string().max(100).nullable().optional(),
  barcode: z.string().max(100).nullable().optional(),
  price: z.number().int().nonnegative().nullable().optional(),
  compareAtPrice: z.number().int().nonnegative().nullable().optional(),
  costPerItem: z.number().int().nonnegative().nullable().optional(),
  weightGrams: z.number().int().nonnegative().nullable().optional(),
  imageAssetId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
  inventoryQuantity: z.number().int().default(0),
});

const optionInput = z.object({
  name: z.string().min(1).max(60),
  values: z.array(z.string().min(1).max(120)).min(1),
});

export const productInputSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().max(200).optional(),
  shortDescription: z.string().max(500).nullable().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(PRODUCT_STATUSES).default('draft'),
  price: z.number().int().nonnegative().default(0),
  compareAtPrice: z.number().int().nonnegative().nullable().optional(),
  costPerItem: z.number().int().nonnegative().nullable().optional(),
  taxable: z.boolean().default(true),
  sku: z.string().max(100).nullable().optional(),
  barcode: z.string().max(100).nullable().optional(),
  trackInventory: z.boolean().default(true),
  continueSellingWhenOutOfStock: z.boolean().default(false),
  lowStockThreshold: z.number().int().nonnegative().default(5),
  requiresShipping: z.boolean().default(true),
  weightGrams: z.number().int().nonnegative().nullable().optional(),
  lengthMm: z.number().int().nonnegative().nullable().optional(),
  widthMm: z.number().int().nonnegative().nullable().optional(),
  heightMm: z.number().int().nonnegative().nullable().optional(),
  brand: z.string().max(120).nullable().optional(),
  tags: z.array(z.string().max(60)).default([]),
  isFeatured: z.boolean().default(false),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
  canonicalUrl: z.string().max(500).nullable().optional(),
  featuredImageAssetId: z.number().int().positive().nullable().optional(),
  categoryIds: z.array(z.number().int().positive()).default([]),
  collectionIds: z.array(z.number().int().positive()).default([]),
  images: z.array(imageInput).default([]),
  options: z.array(optionInput).default([]),
  variants: z.array(variantInput).min(1),
});

export type ProductInput = z.infer<typeof productInputSchema>;

// --- Helpers -----------------------------------------------------------------

function productColumnsFromInput(input: ProductInput, slug: string) {
  return {
    name: input.name,
    slug,
    shortDescription: input.shortDescription ?? null,
    description: input.description ? sanitizeHtml(input.description) : null,
    status: input.status,
    price: input.price,
    compareAtPrice: input.compareAtPrice ?? null,
    costPerItem: input.costPerItem ?? null,
    taxable: input.taxable,
    sku: input.sku ?? null,
    barcode: input.barcode ?? null,
    trackInventory: input.trackInventory,
    continueSellingWhenOutOfStock: input.continueSellingWhenOutOfStock,
    lowStockThreshold: input.lowStockThreshold,
    requiresShipping: input.requiresShipping,
    weightGrams: input.weightGrams ?? null,
    lengthMm: input.lengthMm ?? null,
    widthMm: input.widthMm ?? null,
    heightMm: input.heightMm ?? null,
    brand: input.brand ?? null,
    tags: input.tags,
    isFeatured: input.isFeatured,
    hasVariants: input.options.length > 0,
    featuredImageAssetId: input.featuredImageAssetId ?? null,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    canonicalUrl: input.canonicalUrl ?? null,
    publishedAt: input.status === 'active' ? new Date() : null,
  };
}

async function syncCategories(db: Database, productId: number, categoryIds: number[]) {
  await db.delete(productCategories).where(eq(productCategories.productId, productId));
  if (categoryIds.length) {
    await db
      .insert(productCategories)
      .values(categoryIds.map((categoryId) => ({ productId, categoryId })));
  }
}

async function syncCollections(db: Database, productId: number, collectionIds: number[]) {
  await db.delete(collectionProducts).where(eq(collectionProducts.productId, productId));
  if (collectionIds.length) {
    await db
      .insert(collectionProducts)
      .values(collectionIds.map((collectionId, i) => ({ collectionId, productId, position: i })));
  }
}

async function syncImages(db: Database, productId: number, images: ProductInput['images']) {
  await db.delete(productImages).where(eq(productImages.productId, productId));
  if (images.length) {
    await db.insert(productImages).values(
      images.map((img, i) => ({
        productId,
        assetId: img.assetId,
        altText: img.altText ?? null,
        position: i,
      })),
    );
  }
}

/** Replace option definitions; returns a lookup map "optionIdx:::value" -> optionValueId. */
async function syncOptions(
  db: Database,
  productId: number,
  options: ProductInput['options'],
): Promise<Map<string, number>> {
  await db.delete(productOptions).where(eq(productOptions.productId, productId));
  const map = new Map<string, number>();
  for (let i = 0; i < options.length; i++) {
    const opt = options[i]!;
    const [insertedOpt] = await db
      .insert(productOptions)
      .values({ productId, name: opt.name, position: i })
      .returning({ id: productOptions.id });
    for (let j = 0; j < opt.values.length; j++) {
      const value = opt.values[j]!;
      const [insertedVal] = await db
        .insert(productOptionValues)
        .values({ optionId: insertedOpt!.id, value, position: j })
        .returning({ id: productOptionValues.id });
      map.set(`${i}:::${value}`, insertedVal!.id);
    }
  }
  return map;
}

/** Adjust inventory to a target quantity, recording an idempotent ledger entry. */
async function setInventory(
  db: Database,
  variantId: number,
  target: number,
  threshold: number,
  reason: string,
  actorId: number | null,
) {
  const rows = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.variantId, variantId))
    .limit(1);
  const current = rows[0];
  if (!current) {
    await db.insert(inventoryItems).values({
      variantId,
      onHand: target,
      reserved: 0,
      lowStockThreshold: threshold,
      tracked: true,
    });
    if (target !== 0) {
      await db.insert(inventoryAdjustments).values({
        variantId,
        delta: target,
        reason,
        note: 'Set from product editor',
        actorId,
      });
    }
    return;
  }
  const delta = target - current.onHand;
  await db
    .update(inventoryItems)
    .set({ onHand: target, lowStockThreshold: threshold, updatedAt: new Date() })
    .where(eq(inventoryItems.variantId, variantId));
  if (delta !== 0) {
    await db.insert(inventoryAdjustments).values({
      variantId,
      delta,
      reason: 'correction',
      note: 'Adjusted from product editor',
      actorId,
    });
  }
}

async function syncVariants(
  db: Database,
  productId: number,
  input: ProductInput,
  valueMap: Map<string, number>,
  actorId: number | null,
) {
  const existing = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.productId, productId));
  const existingIds = new Set(existing.map((v) => v.id));
  const keptIds = new Set<number>();

  for (let i = 0; i < input.variants.length; i++) {
    const v = input.variants[i]!;
    const title = v.optionSelections.length ? v.optionSelections.join(' / ') : 'Default';
    const optionValueIds = v.optionSelections
      .map((val, idx) => valueMap.get(`${idx}:::${val}`))
      .filter((n): n is number => typeof n === 'number');

    const columns = {
      productId,
      title,
      optionValueIds,
      sku: v.sku ?? null,
      barcode: v.barcode ?? null,
      price: v.price ?? null,
      compareAtPrice: v.compareAtPrice ?? null,
      costPerItem: v.costPerItem ?? null,
      weightGrams: v.weightGrams ?? null,
      imageAssetId: v.imageAssetId ?? null,
      position: i,
      isActive: v.isActive,
    };

    if (v.id && existingIds.has(v.id)) {
      await db.update(productVariants).set({ ...columns, updatedAt: new Date() }).where(eq(productVariants.id, v.id));
      keptIds.add(v.id);
      await setInventory(db, v.id, v.inventoryQuantity, input.lowStockThreshold, 'correction', actorId);
    } else {
      const [created] = await db.insert(productVariants).values(columns).returning({ id: productVariants.id });
      if (created) {
        keptIds.add(created.id);
        await setInventory(db, created.id, v.inventoryQuantity, input.lowStockThreshold, 'received', actorId);
      }
    }
  }

  const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
  if (toDelete.length) {
    await db.delete(productVariants).where(inArray(productVariants.id, toDelete));
  }
}

// --- Public service ----------------------------------------------------------

export async function createProduct(env: Env, input: ProductInput, actorId: number | null) {
  const db = getDb(env);
  const slug = await ensureUniqueSlug(db, products, products.slug, products.id, input.slug || input.name);
  const [created] = await db.insert(products).values(productColumnsFromInput(input, slug)).returning({ id: products.id });
  if (!created) throw new Error('Failed to create product.');

  const valueMap = await syncOptions(db, created.id, input.options);
  await syncVariants(db, created.id, input, valueMap, actorId);
  await syncImages(db, created.id, input.images);
  await syncCategories(db, created.id, input.categoryIds);
  await syncCollections(db, created.id, input.collectionIds);

  return getAdminProduct(env, created.id);
}

export async function updateProduct(env: Env, id: number, input: ProductInput, actorId: number | null) {
  const db = getDb(env);
  const existing = await db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
  if (!existing.length) throw notFound('Product not found.');

  const slug = await ensureUniqueSlug(db, products, products.slug, products.id, input.slug || input.name, id);
  await db.update(products).set({ ...productColumnsFromInput(input, slug), updatedAt: new Date() }).where(eq(products.id, id));

  const valueMap = await syncOptions(db, id, input.options);
  await syncVariants(db, id, input, valueMap, actorId);
  await syncImages(db, id, input.images);
  await syncCategories(db, id, input.categoryIds);
  await syncCollections(db, id, input.collectionIds);

  return getAdminProduct(env, id);
}

export async function getAdminProduct(env: Env, id: number) {
  const db = getDb(env);
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  const product = rows[0];
  if (!product) throw notFound('Product not found.');

  const [images, options, variants, cats, cols] = await Promise.all([
    db
      .select({
        id: productImages.id,
        assetId: productImages.assetId,
        altText: productImages.altText,
        position: productImages.position,
        url: mediaAssets.url,
      })
      .from(productImages)
      .leftJoin(mediaAssets, eq(mediaAssets.id, productImages.assetId))
      .where(eq(productImages.productId, id))
      .orderBy(productImages.position),
    db.select().from(productOptions).where(eq(productOptions.productId, id)).orderBy(productOptions.position),
    db.select().from(productVariants).where(eq(productVariants.productId, id)).orderBy(productVariants.position),
    db.select({ categoryId: productCategories.categoryId }).from(productCategories).where(eq(productCategories.productId, id)),
    db.select({ collectionId: collectionProducts.collectionId }).from(collectionProducts).where(eq(collectionProducts.productId, id)),
  ]);

  const optionValues = options.length
    ? await db.select().from(productOptionValues).where(
        inArray(productOptionValues.optionId, options.map((o) => o.id)),
      )
    : [];

  const inventory = variants.length
    ? await db.select().from(inventoryItems).where(inArray(inventoryItems.variantId, variants.map((v) => v.id)))
    : [];
  const invByVariant = new Map(inventory.map((i) => [i.variantId, i]));

  return {
    ...product,
    images,
    options: options.map((o) => ({
      ...o,
      values: optionValues.filter((v) => v.optionId === o.id).sort((a, b) => a.position - b.position),
    })),
    variants: variants.map((v) => ({
      ...v,
      inventoryQuantity: invByVariant.get(v.id)?.onHand ?? 0,
      reserved: invByVariant.get(v.id)?.reserved ?? 0,
    })),
    categoryIds: cats.map((c) => c.categoryId),
    collectionIds: cols.map((c) => c.collectionId),
  };
}

export interface AdminProductListParams {
  offset: number;
  pageSize: number;
  search: string | null;
  status: string | null;
  categoryId: number | null;
  sort: string | null;
  order: 'asc' | 'desc';
}

export async function listAdminProducts(env: Env, p: AdminProductListParams) {
  const db = getDb(env);
  const conditions = [sql`${products.deletedAt} IS NULL`];
  if (p.search) conditions.push(or(like(products.name, `%${p.search}%`), like(products.sku, `%${p.search}%`))!);
  if (p.status) conditions.push(eq(products.status, p.status));
  if (p.categoryId) {
    conditions.push(
      sql`${products.id} IN (SELECT product_id FROM product_categories WHERE category_id = ${p.categoryId})`,
    );
  }
  const where = and(...conditions);

  const sortColumn =
    p.sort === 'name' ? products.name : p.sort === 'price' ? products.price : products.updatedAt;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        status: products.status,
        price: products.price,
        featuredImageAssetId: products.featuredImageAssetId,
        updatedAt: products.updatedAt,
        isFeatured: products.isFeatured,
      })
      .from(products)
      .where(where)
      .orderBy(p.order === 'asc' ? sortColumn : desc(sortColumn))
      .limit(p.pageSize)
      .offset(p.offset),
    db.select({ n: sql<number>`count(*)` }).from(products).where(where),
  ]);

  // Attach thumbnail url + total inventory per product.
  const ids = rows.map((r) => r.id);
  const thumbs = ids.length
    ? await db
        .select({ productId: productImages.productId, assetId: productImages.assetId })
        .from(productImages)
        .where(inArray(productImages.productId, ids))
    : [];
  const assetIds = [...new Set([...thumbs.map((t) => t.assetId), ...rows.map((r) => r.featuredImageAssetId).filter((n): n is number => n != null)])];
  const assets = assetIds.length
    ? await db.select({ id: mediaAssets.id, url: mediaAssets.url }).from(mediaAssets).where(inArray(mediaAssets.id, assetIds))
    : [];
  const assetUrl = new Map(assets.map((a) => [a.id, a.url]));

  const stockRows = ids.length
    ? await db
        .select({
          productId: productVariants.productId,
          onHand: sql<number>`coalesce(sum(${inventoryItems.onHand}), 0)`,
        })
        .from(productVariants)
        .leftJoin(inventoryItems, eq(inventoryItems.variantId, productVariants.id))
        .where(inArray(productVariants.productId, ids))
        .groupBy(productVariants.productId)
    : [];
  const stockByProduct = new Map(stockRows.map((s) => [s.productId, s.onHand]));

  const items = rows.map((r) => {
    const firstThumb = thumbs.find((t) => t.productId === r.id);
    const thumbAsset = r.featuredImageAssetId ?? firstThumb?.assetId;
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      status: r.status,
      price: r.price,
      isFeatured: r.isFeatured,
      updatedAt: r.updatedAt,
      thumbnailUrl: thumbAsset ? (assetUrl.get(thumbAsset) ?? null) : null,
      inventory: stockByProduct.get(r.id) ?? 0,
    };
  });

  return { items, total: countRows[0]?.n ?? 0 };
}
