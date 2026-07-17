import { and, eq, ne } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { slugify, slugWithSuffix } from '../../shared/utils/slug';
import type { Database } from './db';

/**
 * Produce a slug that is unique within `table.slugColumn`. Appends -2, -3, ...
 * until free. Pass `excludeId` when updating an existing row.
 */
export async function ensureUniqueSlug(
  db: Database,
  table: SQLiteTable,
  slugColumn: SQLiteColumn,
  idColumn: SQLiteColumn,
  desired: string,
  excludeId?: number,
): Promise<string> {
  const base = slugify(desired) || 'item';
  let candidate = base;
  let n = 1;

  for (;;) {
    const where =
      excludeId != null
        ? and(eq(slugColumn, candidate), ne(idColumn, excludeId))
        : eq(slugColumn, candidate);
    const rows = await db.select({ id: idColumn }).from(table).where(where).limit(1);
    if (rows.length === 0) return candidate;
    n += 1;
    candidate = slugWithSuffix(base, n);
  }
}
