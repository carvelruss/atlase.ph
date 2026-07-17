import { desc, like, sql } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parsePageParams } from '../../../lib/pagination';
import { ok, paginationMeta } from '../../../lib/response';

export const onRequestGet: Fn = async ({ request, env, data }) => {
  const url = new URL(request.url);
  const pp = parsePageParams(url);
  const action = url.searchParams.get('action');
  const db = getDb(env);

  const conditions = [];
  if (pp.search) conditions.push(like(schema.auditLogs.action, `%${pp.search}%`));
  if (action) conditions.push(like(schema.auditLogs.action, `${action}%`));
  const where = conditions.length ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

  const listQuery = db.select().from(schema.auditLogs);
  const rows = await (where ? listQuery.where(where) : listQuery).orderBy(desc(schema.auditLogs.createdAt)).limit(pp.pageSize).offset(pp.offset);
  const countQuery = db.select({ n: sql<number>`count(*)` }).from(schema.auditLogs);
  const countRows = await (where ? countQuery.where(where) : countQuery);

  return ok({ items: rows }, { requestId: data.requestId, ...paginationMeta(pp.page, pp.pageSize, countRows[0]?.n ?? 0) });
};
