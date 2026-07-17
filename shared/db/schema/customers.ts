import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { timestamps, softDelete } from './_helpers';

export const customers = sqliteTable(
  'customers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    phone: text('phone'),
    // Nullable: guest customers exist without a password.
    passwordHash: text('password_hash'),
    passwordSalt: text('password_salt'),
    isGuest: integer('is_guest', { mode: 'boolean' }).notNull().default(true),
    marketingConsent: integer('marketing_consent', { mode: 'boolean' }).notNull().default(false),
    status: text('status').notNull().default('active'), // active | disabled
    tags: text('tags', { mode: 'json' }).$type<string[]>(),
    note: text('note'),
    // Denormalized rollups kept in sync when orders are placed (fast list/profile).
    ordersCount: integer('orders_count').notNull().default(0),
    totalSpent: integer('total_spent').notNull().default(0), // minor units
    lastOrderAt: integer('last_order_at', { mode: 'timestamp' }),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [uniqueIndex('idx_customers_email').on(t.email)],
);

export const customerSessions = sqliteTable(
  'customer_sessions',
  {
    id: text('id').primaryKey(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    csrfToken: text('csrf_token').notNull(),
    userAgent: text('user_agent'),
    ip: text('ip'),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    ...timestamps,
  },
  (t) => [index('idx_customer_sessions_customer').on(t.customerId)],
);

export const customerAddresses = sqliteTable(
  'customer_addresses',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    label: text('label'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    company: text('company'),
    phone: text('phone'),
    line1: text('line1').notNull(),
    line2: text('line2'),
    city: text('city').notNull(),
    province: text('province'),
    postalCode: text('postal_code'),
    country: text('country').notNull().default('PH'),
    isDefaultShipping: integer('is_default_shipping', { mode: 'boolean' }).notNull().default(false),
    isDefaultBilling: integer('is_default_billing', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (t) => [index('idx_customer_addresses_customer').on(t.customerId)],
);
