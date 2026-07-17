import { eq } from 'drizzle-orm';
import type { Fn } from '../../../../lib/env';
import { getDb, schema } from '../../../../lib/db';
import { parseJsonBody } from '../../../../lib/validation';
import { ok } from '../../../../lib/response';
import { badRequest, notFound } from '../../../../lib/errors';
import { ensureUniqueSlug } from '../../../../lib/slugs';
import { blogPostSchema } from '../../../../lib/validators';
import { blogValues } from './index';
import { writeAudit } from '../../../../lib/audit';

export const onRequestGet: Fn = async ({ params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid post id.');
  const db = getDb(env);
  const rows = await db.select().from(schema.blogPosts).where(eq(schema.blogPosts.id, id)).limit(1);
  if (!rows[0]) throw notFound('Post not found.');
  return ok(rows[0], { requestId: data.requestId });
};

export const onRequestPatch: Fn = async ({ request, params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid post id.');
  const db = getDb(env);
  const existing = await db.select({ id: schema.blogPosts.id }).from(schema.blogPosts).where(eq(schema.blogPosts.id, id)).limit(1);
  if (!existing.length) throw notFound('Post not found.');
  const input = await parseJsonBody(request, blogPostSchema);
  const slug = await ensureUniqueSlug(db, schema.blogPosts, schema.blogPosts.slug, schema.blogPosts.id, input.slug || input.title, id);
  const [row] = await db.update(schema.blogPosts).set({ ...blogValues(input, slug), updatedAt: new Date() }).where(eq(schema.blogPosts.id, id)).returning();
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'blog.update', entityType: 'blog_post', entityId: id });
  return ok(row, { requestId: data.requestId });
};

export const onRequestDelete: Fn = async ({ params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid post id.');
  const db = getDb(env);
  await db.delete(schema.blogPosts).where(eq(schema.blogPosts.id, id));
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'blog.delete', entityType: 'blog_post', entityId: id });
  return ok({ deleted: true }, { requestId: data.requestId });
};
