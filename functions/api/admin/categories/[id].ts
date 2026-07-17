import { eq } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parseJsonBody } from '../../../lib/validation';
import { ok } from '../../../lib/response';
import { badRequest, notFound } from '../../../lib/errors';
import { ensureUniqueSlug } from '../../../lib/slugs';
import { categorySchema } from '../../../lib/validators';
import { writeAudit } from '../../../lib/audit';

export const onRequestPatch: Fn = async ({ request, params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid category id.');
  const db = getDb(env);
  const existing = await db.select({ id: schema.categories.id }).from(schema.categories).where(eq(schema.categories.id, id)).limit(1);
  if (!existing.length) throw notFound('Category not found.');

  const input = await parseJsonBody(request, categorySchema);
  const slug = await ensureUniqueSlug(db, schema.categories, schema.categories.slug, schema.categories.id, input.slug || input.name, id);
  const [row] = await db
    .update(schema.categories)
    .set({
      name: input.name,
      slug,
      description: input.description ?? null,
      imageAssetId: input.imageAssetId ?? null,
      parentId: input.parentId ?? null,
      displayOrder: input.displayOrder,
      isActive: input.isActive,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      updatedAt: new Date(),
    })
    .where(eq(schema.categories.id, id))
    .returning();
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'category.update', entityType: 'category', entityId: id });
  return ok(row, { requestId: data.requestId });
};

export const onRequestDelete: Fn = async ({ params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid category id.');
  const db = getDb(env);
  await db.delete(schema.categories).where(eq(schema.categories.id, id));
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'category.delete', entityType: 'category', entityId: id });
  return ok({ deleted: true }, { requestId: data.requestId });
};
