import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../../shared/db/schema/index';
import type { Env } from './env';

export type Database = DrizzleD1Database<typeof schema>;

/** Create a Drizzle client bound to the request's D1 database. */
export function getDb(env: Env): Database {
  return drizzle(env.DB, { schema });
}

export { schema };
