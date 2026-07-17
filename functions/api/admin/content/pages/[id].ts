import { eq } from 'drizzle-orm';
import type { Fn } from '../../../../lib/env';
import { getDb, schema } from '../../../../lib/db';
import { parseJsonBody } from '../../../../lib/validation';
import { ok } from '../../../../lib/response';
import { badRequest, notFound } from '../../../../lib/errors';
import { ensureUniqueSlug } from '../../../../lib/slugs';
import { pageSchema } from '../../../../lib/validators';
import { pageValues } from './index';
import { writeAudit } from '../../../../lib/audit';

export const onRequestGet: Fn = async ({ params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid page id.');
  const db = getDb(env);
  const rows = await db.select().from(schema.pages).where(eq(schema.pages.id, id)).limit(1);
  if (!rows[0]) throw notFound('Page not found.');
  return ok(rows[0], { requestId: data.requestId });
};

export const onRequestPatch: Fn = async ({ request, params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid page id.');
  const db = getDb(env);
  const existing = await db.select({ id: schema.pages.id }).from(schema.pages).where(eq(schema.pages.id, id)).limit(1);
  if (!existing.length) throw notFound('Page not found.');
  const input = await parseJsonBody(request, pageSchema);
  const slug = await ensureUniqueSlug(db, schema.pages, schema.pages.slug, schema.pages.id, input.slug || input.title, id);
  const [row] = await db.update(schema.pages).set({ ...pageValues(input, slug), updatedAt: new Date() }).where(eq(schema.pages.id, id)).returning();
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'page.update', entityType: 'page', entityId: id });
  return ok(row, { requestId: data.requestId });
};

export const onRequestDelete: Fn = async ({ params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid page id.');
  const db = getDb(env);
  await db.delete(schema.pages).where(eq(schema.pages.id, id));
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'page.delete', entityType: 'page', entityId: id });
  return ok({ deleted: true }, { requestId: data.requestId });
};
