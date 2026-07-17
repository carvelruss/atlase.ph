import { desc, eq, sql } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parsePageParams } from '../../../lib/pagination';
import { ok, paginationMeta } from '../../../lib/response';

export const onRequestGet: Fn = async ({ request, env, data }) => {
  const pp = parsePageParams(new URL(request.url));
  const db = getDb(env);
  const [items, countRows] = await Promise.all([
    db
      .select({
        title: schema.blogPosts.title,
        slug: schema.blogPosts.slug,
        excerpt: schema.blogPosts.excerpt,
        author: schema.blogPosts.author,
        readTimeMinutes: schema.blogPosts.readTimeMinutes,
        publishedAt: schema.blogPosts.publishedAt,
        imageUrl: sql<string | null>`(SELECT url FROM media_assets WHERE media_assets.id = blog_posts.featured_image_asset_id)`,
      })
      .from(schema.blogPosts)
      .where(eq(schema.blogPosts.status, 'published'))
      .orderBy(desc(schema.blogPosts.publishedAt))
      .limit(pp.pageSize)
      .offset(pp.offset),
    db.select({ n: sql<number>`count(*)` }).from(schema.blogPosts).where(eq(schema.blogPosts.status, 'published')),
  ]);
  return ok({ items }, { requestId: data.requestId, ...paginationMeta(pp.page, pp.pageSize, countRows[0]?.n ?? 0) });
};
