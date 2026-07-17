import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { timestamps } from './_helpers';

/** Per-group settings documents (store, checkout, tax, seo, social, ...). */
export const storeSettings = sqliteTable('store_settings', {
  group: text('group').primaryKey(),
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  ...timestamps,
});

/** Single-row (id=1) theme + branding document consumed by the storefront. */
export const themeSettings = sqliteTable('theme_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  ...timestamps,
});

export const notificationTemplates = sqliteTable(
  'notification_templates',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    key: text('key').notNull(), // order_confirmation | order_shipped | ...
    channel: text('channel').notNull().default('email'), // email | sms
    subject: text('subject'),
    body: text('body'),
    isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('idx_notification_templates_key').on(t.key, t.channel)],
);

export const notificationLogs = sqliteTable(
  'notification_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    templateKey: text('template_key'),
    channel: text('channel').notNull().default('email'),
    recipient: text('recipient').notNull(),
    subject: text('subject'),
    status: text('status').notNull().default('queued'), // queued | sent | failed
    error: text('error'),
    referenceType: text('reference_type'),
    referenceId: text('reference_id'),
    ...timestamps,
  },
  (t) => [index('idx_notification_logs_recipient').on(t.recipient)],
);

export const integrations = sqliteTable(
  'integrations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    key: text('key').notNull(), // google_analytics | meta_pixel | resend | ...
    name: text('name').notNull(),
    category: text('category').notNull().default('other'),
    isConnected: integer('is_connected', { mode: 'boolean' }).notNull().default(false),
    // Non-secret config. Secrets are stored as Pages secrets, referenced by name here.
    config: text('config', { mode: 'json' }).$type<Record<string, unknown>>(),
    lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
    lastError: text('last_error'),
    ...timestamps,
  },
  (t) => [uniqueIndex('idx_integrations_key').on(t.key)],
);

export const webhooks = sqliteTable('webhooks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull(),
  events: text('events', { mode: 'json' }).$type<string[]>().notNull(),
  signingSecret: text('signing_secret').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
});

export const webhookDeliveries = sqliteTable(
  'webhook_deliveries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    webhookId: integer('webhook_id')
      .notNull()
      .references(() => webhooks.id, { onDelete: 'cascade' }),
    event: text('event').notNull(),
    status: text('status').notNull().default('pending'), // pending | success | failed
    responseCode: integer('response_code'),
    attempts: integer('attempts').notNull().default(0),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
    lastAttemptAt: integer('last_attempt_at', { mode: 'timestamp' }),
    ...timestamps,
  },
  (t) => [index('idx_webhook_deliveries_webhook').on(t.webhookId)],
);
