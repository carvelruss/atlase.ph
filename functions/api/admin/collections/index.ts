import { asc, sql } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parseJsonBody } from '../../../lib/validation';
import { ok, created } from '../../../lib/response';
import { ensureUniqueSlug } from '../../../lib/slugs';
import { collectionSchema } from '../../../lib/validators';
import { writeAudit } from '../../../lib/audit';

export const onRequestGet: Fn = async ({ env, data }) => {
  const db = getDb(env);
  const rows = await db
    .select({
      id: schema.collections.id,
      name: schema.collections.name,
      slug: schema.collections.slug,
      type: schema.collections.type,
      isActive: schema.collections.isActive,
      imageAssetId: schema.collections.imageAssetId,
      productCount: sql<number>`(SELECT count(*) FROM collection_products WHERE collection_id = ${schema.collections.id})`,
    })
    .from(schema.collections)
    .orderBy(asc(schema.collections.name));
  return ok({ items: rows }, { requestId: data.requestId });
};

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const input = await parseJsonBody(request, collectionSchema);
  const db = getDb(env);
  const slug = await ensureUniqueSlug(db, schema.collections, schema.collections.slug, schema.collections.id, input.slug || input.name);
  const [row] = await db
    .insert(schema.collections)
    .values({
      name: input.name,
      slug,
      description: input.description ?? null,
      imageAssetId: input.imageAssetId ?? null,
      type: input.type,
      rules: input.rules,
      rulesMatch: input.rulesMatch,
      isActive: input.isActive,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
    })
    .returning();

  if (row && input.type === 'manual' && input.productIds.length) {
    await db.insert(schema.collectionProducts).values(
      input.productIds.map((productId, i) => ({ collectionId: row.id, productId, position: i })),
    );
  }

  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'collection.create', entityType: 'collection', entityId: row?.id });
  return created(row, { requestId: data.requestId });
};
