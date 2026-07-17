import { desc, sql } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parsePageParams } from '../../../lib/pagination';
import { ok, paginationMeta } from '../../../lib/response';

/** Notification (email/SMS) delivery log viewer. */
export const onRequestGet: Fn = async ({ request, env, data }) => {
  const pp = parsePageParams(new URL(request.url));
  const db = getDb(env);
  const [rows, countRows] = await Promise.all([
    db.select().from(schema.notificationLogs).orderBy(desc(schema.notificationLogs.createdAt)).limit(pp.pageSize).offset(pp.offset),
    db.select({ n: sql<number>`count(*)` }).from(schema.notificationLogs),
  ]);
  return ok({ items: rows }, { requestId: data.requestId, ...paginationMeta(pp.page, pp.pageSize, countRows[0]?.n ?? 0) });
};
