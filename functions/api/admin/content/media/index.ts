import { desc, like, sql } from 'drizzle-orm';
import type { Fn } from '../../../../lib/env';
import { getDb, schema } from '../../../../lib/db';
import { parsePageParams } from '../../../../lib/pagination';
import { ok, paginationMeta } from '../../../../lib/response';

/** Media library listing (upload/delete are handled by /api/admin/uploads). */
export const onRequestGet: Fn = async ({ request, env, data }) => {
  const url = new URL(request.url);
  const pp = parsePageParams(url);
  const folder = url.searchParams.get('folder');
  const db = getDb(env);

  const conditions = [];
  if (pp.search) conditions.push(like(schema.mediaAssets.fileName, `%${pp.search}%`));
  if (folder) conditions.push(like(schema.mediaAssets.folder, folder));
  const where = conditions.length ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

  const listQuery = db.select().from(schema.mediaAssets);
  const rows = await (where ? listQuery.where(where) : listQuery).orderBy(desc(schema.mediaAssets.createdAt)).limit(pp.pageSize).offset(pp.offset);
  const countQuery = db.select({ n: sql<number>`count(*)` }).from(schema.mediaAssets);
  const countRows = await (where ? countQuery.where(where) : countQuery);

  return ok({ items: rows }, { requestId: data.requestId, ...paginationMeta(pp.page, pp.pageSize, countRows[0]?.n ?? 0) });
};
