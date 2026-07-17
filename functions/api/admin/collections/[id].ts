import { eq } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parseJsonBody } from '../../../lib/validation';
import { ok } from '../../../lib/response';
import { badRequest, notFound } from '../../../lib/errors';
import { ensureUniqueSlug } from '../../../lib/slugs';
import { collectionSchema } from '../../../lib/validators';
import { writeAudit } from '../../../lib/audit';

export const onRequestGet: Fn = async ({ params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid collection id.');
  const db = getDb(env);
  const rows = await db.select().from(schema.collections).where(eq(schema.collections.id, id)).limit(1);
  const collection = rows[0];
  if (!collection) throw notFound('Collection not found.');
  const products = await db
    .select({ productId: schema.collectionProducts.productId })
    .from(schema.collectionProducts)
    .where(eq(schema.collectionProducts.collectionId, id))
    .orderBy(schema.collectionProducts.position);
  return ok({ ...collection, productIds: products.map((p) => p.productId) }, { requestId: data.requestId });
};

export const onRequestPatch: Fn = async ({ request, params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid collection id.');
  const db = getDb(env);
  const existing = await db.select({ id: schema.collections.id }).from(schema.collections).where(eq(schema.collections.id, id)).limit(1);
  if (!existing.length) throw notFound('Collection not found.');

  const input = await parseJsonBody(request, collectionSchema);
  const slug = await ensureUniqueSlug(db, schema.collections, schema.collections.slug, schema.collections.id, input.slug || input.name, id);
  const [row] = await db
    .update(schema.collections)
    .set({
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
      updatedAt: new Date(),
    })
    .where(eq(schema.collections.id, id))
    .returning();

  // Re-sync manual product membership.
  await db.delete(schema.collectionProducts).where(eq(schema.collectionProducts.collectionId, id));
  if (input.type === 'manual' && input.productIds.length) {
    await db.insert(schema.collectionProducts).values(
      input.productIds.map((productId, i) => ({ collectionId: id, productId, position: i })),
    );
  }

  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'collection.update', entityType: 'collection', entityId: id });
  return ok(row, { requestId: data.requestId });
};

export const onRequestDelete: Fn = async ({ params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid collection id.');
  const db = getDb(env);
  await db.delete(schema.collections).where(eq(schema.collections.id, id));
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'collection.delete', entityType: 'collection', entityId: id });
  return ok({ deleted: true }, { requestId: data.requestId });
};
