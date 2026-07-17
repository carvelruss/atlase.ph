import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parseJsonBody } from '../../../lib/validation';
import { ok } from '../../../lib/response';
import { badRequest } from '../../../lib/errors';
import { writeAudit } from '../../../lib/audit';

const bodySchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
  action: z.enum(['activate', 'deactivate', 'archive', 'delete', 'assign_category']),
  categoryId: z.number().int().positive().optional(),
});

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const { ids, action, categoryId } = await parseJsonBody(request, bodySchema);
  const db = getDb(env);
  const now = new Date();

  switch (action) {
    case 'activate':
      await db.update(schema.products).set({ status: 'active', publishedAt: now, updatedAt: now }).where(inArray(schema.products.id, ids));
      break;
    case 'deactivate':
      await db.update(schema.products).set({ status: 'draft', updatedAt: now }).where(inArray(schema.products.id, ids));
      break;
    case 'archive':
      await db.update(schema.products).set({ status: 'archived', updatedAt: now }).where(inArray(schema.products.id, ids));
      break;
    case 'delete':
      await db.update(schema.products).set({ status: 'archived', deletedAt: now, updatedAt: now }).where(inArray(schema.products.id, ids));
      break;
    case 'assign_category': {
      if (!categoryId) throw badRequest('categoryId is required for assign_category.');
      // Idempotent: skip existing pairs.
      const existing = await db
        .select({ productId: schema.productCategories.productId })
        .from(schema.productCategories)
        .where(inArray(schema.productCategories.productId, ids));
      const have = new Set(existing.filter((e) => e.productId).map((e) => e.productId));
      const toInsert = ids.filter((id) => !have.has(id)).map((productId) => ({ productId, categoryId }));
      if (toInsert.length) await db.insert(schema.productCategories).values(toInsert);
      break;
    }
  }

  await writeAudit(env, {
    actorId: data.admin?.id ?? null,
    action: `product.bulk.${action}`,
    entityType: 'product',
    metadata: { count: ids.length, categoryId },
  });

  return ok({ updated: ids.length }, { requestId: data.requestId });
};
