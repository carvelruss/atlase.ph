import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

/**
 * First-party storefront analytics events. Uses a privacy-conscious rotating
 * session id (no PII). Powers traffic/product/customer analytics dashboards.
 */
export const analyticsEvents = sqliteTable(
  'analytics_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: text('session_id').notNull(), // hashed, rotating
    type: text('type').notNull(), // page_view | product_view | add_to_cart | checkout_start | purchase
    path: text('path'),
    productId: integer('product_id'),
    orderId: integer('order_id'),
    value: integer('value'), // minor units where relevant
    referrer: text('referrer'),
    source: text('source'), // utm_source / derived channel
    device: text('device'), // mobile | tablet | desktop
    country: text('country'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index('idx_analytics_events_type').on(t.type),
    index('idx_analytics_events_session').on(t.sessionId),
    index('idx_analytics_events_created').on(t.createdAt),
  ],
);
