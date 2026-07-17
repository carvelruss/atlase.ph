import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { timestamps } from './_helpers';
import { customers } from './customers';
import { orders } from './commerce';

export const discounts = sqliteTable(
  'discounts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(), // internal name
    code: text('code'), // null for automatic discounts; normalized uppercase
    description: text('description'),
    type: text('type').notNull(), // percentage | fixed_amount | buy_x_get_y | free_product | free_shipping
    value: integer('value').notNull().default(0), // percent (0–100) or minor units
    // Automatic vs coupon.
    isAutomatic: integer('is_automatic', { mode: 'boolean' }).notNull().default(false),
    // Eligibility thresholds.
    minPurchase: integer('min_purchase'), // minor units
    minQuantity: integer('min_quantity'),
    firstOrderOnly: integer('first_order_only', { mode: 'boolean' }).notNull().default(false),
    // Scope: which products/categories/collections/customers it applies to.
    appliesTo: text('applies_to').notNull().default('all'), // all | products | categories | collections
    eligibleProductIds: text('eligible_product_ids', { mode: 'json' }).$type<number[]>(),
    eligibleCategoryIds: text('eligible_category_ids', { mode: 'json' }).$type<number[]>(),
    eligibleCollectionIds: text('eligible_collection_ids', { mode: 'json' }).$type<number[]>(),
    // Usage limits.
    usageLimit: integer('usage_limit'),
    perCustomerLimit: integer('per_customer_limit'),
    usageCount: integer('usage_count').notNull().default(0),
    // Combination rules.
    combinesWithProduct: integer('combines_with_product', { mode: 'boolean' })
      .notNull()
      .default(false),
    combinesWithShipping: integer('combines_with_shipping', { mode: 'boolean' })
      .notNull()
      .default(false),
    // Buy X Get Y config.
    buyQuantity: integer('buy_quantity'),
    getQuantity: integer('get_quantity'),
    // Window.
    startsAt: integer('starts_at', { mode: 'timestamp' }),
    endsAt: integer('ends_at', { mode: 'timestamp' }),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('idx_discounts_code').on(t.code),
    index('idx_discounts_active').on(t.isActive),
  ],
);

export const discountRedemptions = sqliteTable(
  'discount_redemptions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    discountId: integer('discount_id')
      .notNull()
      .references(() => discounts.id, { onDelete: 'cascade' }),
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    amount: integer('amount').notNull().default(0), // minor units discounted
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index('idx_discount_redemptions_discount').on(t.discountId),
    index('idx_discount_redemptions_customer').on(t.customerId),
  ],
);

/** Explicit customer eligibility list for customer-specific discounts. */
export const customersDiscounts = sqliteTable(
  'customers_discounts',
  {
    discountId: integer('discount_id')
      .notNull()
      .references(() => discounts.id, { onDelete: 'cascade' }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
  },
  (t) => [uniqueIndex('idx_customers_discounts_pk').on(t.discountId, t.customerId)],
);

// --- Loyalty (feature-flagged; schema is extensible) -------------------------

export const loyaltyAccounts = sqliteTable(
  'loyalty_accounts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    balance: integer('balance').notNull().default(0),
    lifetimeEarned: integer('lifetime_earned').notNull().default(0),
    lifetimeRedeemed: integer('lifetime_redeemed').notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex('idx_loyalty_accounts_customer').on(t.customerId)],
);

export const loyaltyTransactions = sqliteTable(
  'loyalty_transactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    accountId: integer('account_id')
      .notNull()
      .references(() => loyaltyAccounts.id, { onDelete: 'cascade' }),
    delta: integer('delta').notNull(), // + earned, - redeemed
    reason: text('reason').notNull(), // order | redemption | manual | refund_reversal | expiration
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    note: text('note'),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('idx_loyalty_transactions_account').on(t.accountId)],
);
