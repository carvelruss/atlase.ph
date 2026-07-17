import { desc } from 'drizzle-orm';
import type { Fn } from '../../../../lib/env';
import { getDb, schema } from '../../../../lib/db';
import { parseJsonBody } from '../../../../lib/validation';
import { ok, created } from '../../../../lib/response';
import { ensureUniqueSlug } from '../../../../lib/slugs';
import { pageSchema, type PageInput } from '../../../../lib/validators';
import { writeAudit } from '../../../../lib/audit';

export function pageValues(input: PageInput, slug: string) {
  return {
    title: input.title,
    slug,
    content: input.content ?? null,
    template: input.template,
    status: input.status,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    ogImageAssetId: input.ogImageAssetId ?? null,
    publishedAt: input.status === 'published' ? new Date() : null,
  };
}

export const onRequestGet: Fn = async ({ env, data }) => {
  const db = getDb(env);
  const items = await db
    .select({ id: schema.pages.id, title: schema.pages.title, slug: schema.pages.slug, status: schema.pages.status, updatedAt: schema.pages.updatedAt })
    .from(schema.pages)
    .orderBy(desc(schema.pages.updatedAt));
  return ok({ items }, { requestId: data.requestId });
};

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const input = await parseJsonBody(request, pageSchema);
  const db = getDb(env);
  const slug = await ensureUniqueSlug(db, schema.pages, schema.pages.slug, schema.pages.id, input.slug || input.title);
  const [row] = await db.insert(schema.pages).values(pageValues(input, slug)).returning();
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'page.create', entityType: 'page', entityId: row?.id });
  return created(row, { requestId: data.requestId });
};
