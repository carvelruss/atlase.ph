import { and, asc, eq, sql } from 'drizzle-orm';
import type { Fn } from '../../lib/env';
import { getDb, schema } from '../../lib/db';
import { ok } from '../../lib/response';
import { listPublicProducts } from '../../lib/services/storefront';

/** Resolved homepage: enabled sections (published settings) + featured data to render them. */
export const onRequestGet: Fn = async ({ env, data }) => {
  const db = getDb(env);

  const [sections, categories, featured] = await Promise.all([
    db
      .select({ id: schema.homepageSections.id, type: schema.homepageSections.type, settings: schema.homepageSections.settings })
      .from(schema.homepageSections)
      .where(eq(schema.homepageSections.isEnabled, true))
      .orderBy(asc(schema.homepageSections.position)),
    db
      .select({
        id: schema.categories.id,
        name: schema.categories.name,
        slug: schema.categories.slug,
        imageUrl: sql<string | null>`(SELECT url FROM media_assets WHERE media_assets.id = ${schema.categories.imageAssetId})`,
      })
      .from(schema.categories)
      .where(and(eq(schema.categories.isActive, true), sql`${schema.categories.parentId} IS NULL`))
      .orderBy(asc(schema.categories.displayOrder))
      .limit(8),
    listPublicProducts(env, { featuredOnly: true, sort: 'featured', offset: 0, pageSize: 8 }),
  ]);

  return ok(
    { sections, featuredCategories: categories, featuredProducts: featured.items },
    { requestId: data.requestId },
  );
};
