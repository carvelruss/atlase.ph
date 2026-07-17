import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { timestamps, softDelete, money } from './_helpers';
import { customers } from './customers';

export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    imageAssetId: integer('image_asset_id'),
    parentId: integer('parent_id'),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('idx_categories_slug').on(t.slug),
    index('idx_categories_parent').on(t.parentId),
  ],
);

export const products = sqliteTable(
  'products',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    shortDescription: text('short_description'),
    description: text('description'), // rich text (HTML from TipTap)
    status: text('status').notNull().default('draft'), // draft | active | archived
    // Pricing (minor units). Variant rows can override these.
    price: money('price'),
    compareAtPrice: integer('compare_at_price'),
    costPerItem: integer('cost_per_item'),
    currency: text('currency').notNull().default('PHP'),
    taxable: integer('taxable', { mode: 'boolean' }).notNull().default(true),
    // Default identifiers (single-variant products).
    sku: text('sku'),
    barcode: text('barcode'),
    // Inventory config (defaults; per-variant rows hold actual counts).
    trackInventory: integer('track_inventory', { mode: 'boolean' }).notNull().default(true),
    continueSellingWhenOutOfStock: integer('continue_selling_oos', { mode: 'boolean' })
      .notNull()
      .default(false),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    // Shipping.
    requiresShipping: integer('requires_shipping', { mode: 'boolean' }).notNull().default(true),
    weightGrams: integer('weight_grams'),
    lengthMm: integer('length_mm'),
    widthMm: integer('width_mm'),
    heightMm: integer('height_mm'),
    // Organization.
    brand: text('brand'),
    tags: text('tags', { mode: 'json' }).$type<string[]>(),
    isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
    hasVariants: integer('has_variants', { mode: 'boolean' }).notNull().default(false),
    featuredImageAssetId: integer('featured_image_asset_id'),
    // SEO.
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    ogImageAssetId: integer('og_image_asset_id'),
    canonicalUrl: text('canonical_url'),
    // Ratings rollup.
    ratingAverage: integer('rating_average').notNull().default(0), // 0–500 (x100)
    ratingCount: integer('rating_count').notNull().default(0),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex('idx_products_slug').on(t.slug),
    index('idx_products_status').on(t.status),
    index('idx_products_featured').on(t.isFeatured),
  ],
);

export const productImages = sqliteTable(
  'product_images',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    assetId: integer('asset_id').notNull(),
    altText: text('alt_text'),
    position: integer('position').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('idx_product_images_product').on(t.productId)],
);

export const productOptions = sqliteTable(
  'product_options',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: text('name').notNull(), // Size, Color, Material...
    position: integer('position').notNull().default(0),
  },
  (t) => [index('idx_product_options_product').on(t.productId)],
);

export const productOptionValues = sqliteTable(
  'product_option_values',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    optionId: integer('option_id')
      .notNull()
      .references(() => productOptions.id, { onDelete: 'cascade' }),
    value: text('value').notNull(),
    position: integer('position').notNull().default(0),
  },
  (t) => [index('idx_product_option_values_option').on(t.optionId)],
);

export const productVariants = sqliteTable(
  'product_variants',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('Default'), // "M / Blue"
    // Combination of option value ids, e.g. [12, 34]. Empty for single-variant.
    optionValueIds: text('option_value_ids', { mode: 'json' }).$type<number[]>(),
    sku: text('sku'),
    barcode: text('barcode'),
    price: integer('price'), // override; falls back to product.price
    compareAtPrice: integer('compare_at_price'),
    costPerItem: integer('cost_per_item'),
    weightGrams: integer('weight_grams'),
    imageAssetId: integer('image_asset_id'),
    position: integer('position').notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index('idx_product_variants_product').on(t.productId),
    index('idx_product_variants_sku').on(t.sku),
  ],
);

/** M:N products <-> categories. */
export const productCategories = sqliteTable(
  'product_categories',
  {
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (t) => [
    uniqueIndex('idx_product_categories_pk').on(t.productId, t.categoryId),
    index('idx_product_categories_category').on(t.categoryId),
  ],
);

export const collections = sqliteTable(
  'collections',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    imageAssetId: integer('image_asset_id'),
    type: text('type').notNull().default('manual'), // manual | rule_based
    // Rule set for rule-based collections. Evaluated server-side.
    rules: text('rules', { mode: 'json' }).$type<CollectionRule[]>(),
    rulesMatch: text('rules_match').notNull().default('all'), // all | any
    sortOrder: text('sort_order').notNull().default('manual'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    ...timestamps,
  },
  (t) => [uniqueIndex('idx_collections_slug').on(t.slug)],
);

export interface CollectionRule {
  field: 'tag' | 'category' | 'brand' | 'price' | 'inventory';
  operator: 'equals' | 'not_equals' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  value: string | number;
}

export const collectionProducts = sqliteTable(
  'collection_products',
  {
    collectionId: integer('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
  },
  (t) => [
    uniqueIndex('idx_collection_products_pk').on(t.collectionId, t.productId),
    index('idx_collection_products_product').on(t.productId),
  ],
);

/** One inventory record per sellable variant. */
export const inventoryItems = sqliteTable(
  'inventory_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    variantId: integer('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    onHand: integer('on_hand').notNull().default(0),
    reserved: integer('reserved').notNull().default(0),
    // available = onHand - reserved (computed in app; stored for fast filtering)
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    tracked: integer('tracked', { mode: 'boolean' }).notNull().default(true),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex('idx_inventory_items_variant').on(t.variantId)],
);

/** Append-only inventory ledger. Every change is an idempotent adjustment. */
export const inventoryAdjustments = sqliteTable(
  'inventory_adjustments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    variantId: integer('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    delta: integer('delta').notNull(), // +received, -sold, etc.
    reason: text('reason').notNull(), // received | sold | correction | damaged | returned | order_cancel
    note: text('note'),
    // Guards against double-applying the same event (e.g. order fulfillment).
    idempotencyKey: text('idempotency_key'),
    referenceType: text('reference_type'),
    referenceId: text('reference_id'),
    actorId: integer('actor_id'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index('idx_inventory_adjustments_variant').on(t.variantId),
    uniqueIndex('idx_inventory_adjustments_idem').on(t.idempotencyKey),
  ],
);

export const reviews = sqliteTable(
  'reviews',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    orderId: integer('order_id'),
    authorName: text('author_name').notNull(),
    rating: integer('rating').notNull(), // 1–5
    title: text('title'),
    body: text('body'),
    isVerifiedPurchase: integer('is_verified_purchase', { mode: 'boolean' })
      .notNull()
      .default(false),
    status: text('status').notNull().default('pending'), // pending | approved | rejected | hidden
    adminReply: text('admin_reply'),
    adminReplyAt: integer('admin_reply_at', { mode: 'timestamp' }),
    ...timestamps,
  },
  (t) => [
    index('idx_reviews_product').on(t.productId),
    index('idx_reviews_status').on(t.status),
  ],
);
