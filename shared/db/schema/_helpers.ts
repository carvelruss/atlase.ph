import { sql } from 'drizzle-orm';
import { integer } from 'drizzle-orm/sqlite-core';

/**
 * Timestamp columns shared by every table. Stored as integer Unix seconds
 * (drizzle `timestamp` mode) with a SQL-side default so inserts that omit them
 * still get a value. `updatedAt` is bumped explicitly by the application on write.
 */
export const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
};

/** Soft-delete marker for entities that must not be hard-deleted (orders, customers). */
export const softDelete = {
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
};

/**
 * Monetary column factory. Money is ALWAYS stored as an integer in the currency's
 * minor unit (e.g. centavos for PHP). Never floating point.
 */
export const money = (name: string) => integer(name).notNull().default(0);
