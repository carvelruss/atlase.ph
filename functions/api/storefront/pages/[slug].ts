import { and, eq } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { ok } from '../../../lib/response';
import { notFound } from '../../../lib/errors';

export const onRequestGet: Fn = async ({ params, env, data }) => {
  const slug = String(params.slug ?? '');
  const db = getDb(env);
  const rows = await db
    .select({ title: schema.pages.title, slug: schema.pages.slug, content: schema.pages.content, seoTitle: schema.pages.seoTitle, seoDescription: schema.pages.seoDescription, updatedAt: schema.pages.updatedAt })
    .from(schema.pages)
    .where(and(eq(schema.pages.slug, slug), eq(schema.pages.status, 'published')))
    .limit(1);
  if (!rows[0]) throw notFound('Page not found.');
  return ok(rows[0], { requestId: data.requestId });
};
