import { asc, sql } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parseJsonBody } from '../../../lib/validation';
import { ok, created } from '../../../lib/response';
import { ensureUniqueSlug } from '../../../lib/slugs';
import { categorySchema } from '../../../lib/validators';
import { writeAudit } from '../../../lib/audit';

export const onRequestGet: Fn = async ({ env, data }) => {
  const db = getDb(env);
  const rows = await db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      slug: schema.categories.slug,
      description: schema.categories.description,
      parentId: schema.categories.parentId,
      displayOrder: schema.categories.displayOrder,
      isActive: schema.categories.isActive,
      imageAssetId: schema.categories.imageAssetId,
      productCount: sql<number>`(SELECT count(*) FROM product_categories WHERE category_id = ${schema.categories.id})`,
    })
    .from(schema.categories)
    .orderBy(asc(schema.categories.displayOrder), asc(schema.categories.name));
  return ok({ items: rows }, { requestId: data.requestId });
};

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const input = await parseJsonBody(request, categorySchema);
  const db = getDb(env);
  const slug = await ensureUniqueSlug(db, schema.categories, schema.categories.slug, schema.categories.id, input.slug || input.name);
  const [row] = await db
    .insert(schema.categories)
    .values({
      name: input.name,
      slug,
      description: input.description ?? null,
      imageAssetId: input.imageAssetId ?? null,
      parentId: input.parentId ?? null,
      displayOrder: input.displayOrder,
      isActive: input.isActive,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
    })
    .returning();
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'category.create', entityType: 'category', entityId: row?.id });
  return created(row, { requestId: data.requestId });
};
