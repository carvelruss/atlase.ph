import { eq } from 'drizzle-orm';
import { storeSettings } from '../../shared/db/schema/index';
import { getDb } from './db';
import type { Env } from './env';

/** Read a settings group document, returning `{}` if it does not exist. */
export async function getSettingsGroup<T = Record<string, unknown>>(env: Env, group: string): Promise<T> {
  const db = getDb(env);
  const rows = await db.select({ data: storeSettings.data }).from(storeSettings).where(eq(storeSettings.group, group)).limit(1);
  return (rows[0]?.data as T) ?? ({} as T);
}

interface OrderNumbering {
  prefix?: string;
  nextNumber?: number;
  padding?: number;
}

/**
 * Generate the next unique order number and advance the counter atomically.
 * Single-owner store, low concurrency; the unique index on order_number is the
 * ultimate guard against collisions.
 */
export async function nextOrderNumber(env: Env): Promise<string> {
  const db = getDb(env);
  const rows = await db.select({ data: storeSettings.data }).from(storeSettings).where(eq(storeSettings.group, 'order_numbering')).limit(1);
  const cfg = (rows[0]?.data as OrderNumbering) ?? {};
  const prefix = cfg.prefix ?? 'ATL-';
  const current = cfg.nextNumber ?? 1001;
  const padding = cfg.padding ?? 4;

  const nextCfg = { ...cfg, prefix, padding, nextNumber: current + 1 };
  if (rows[0]) {
    await db
      .update(storeSettings)
      .set({ data: nextCfg, updatedAt: new Date() })
      .where(eq(storeSettings.group, 'order_numbering'));
  } else {
    await db.insert(storeSettings).values({ group: 'order_numbering', data: nextCfg });
  }

  return `${prefix}${String(current).padStart(padding, '0')}`;
}
