import { and, eq, sql } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { okPublic } from '../../../lib/response';
import { notFound } from '../../../lib/errors';

export const onRequestGet: Fn = async ({ params, env, data }) => {
  const slug = String(params.slug ?? '');
  const db = getDb(env);
  const rows = await db
    .select({
      title: schema.blogPosts.title,
      slug: schema.blogPosts.slug,
      excerpt: schema.blogPosts.excerpt,
      overview: schema.blogPosts.overview,
      body: schema.blogPosts.body,
      author: schema.blogPosts.author,
      imageCaption: schema.blogPosts.imageCaption,
      readTimeMinutes: schema.blogPosts.readTimeMinutes,
      publishedAt: schema.blogPosts.publishedAt,
      seoTitle: schema.blogPosts.seoTitle,
      seoDescription: schema.blogPosts.seoDescription,
      imageUrl: sql<string | null>`(SELECT url FROM media_assets WHERE media_assets.id = blog_posts.featured_image_asset_id)`,
    })
    .from(schema.blogPosts)
    .where(and(eq(schema.blogPosts.slug, slug), eq(schema.blogPosts.status, 'published')))
    .limit(1);
  if (!rows[0]) throw notFound('Post not found.');
  return okPublic(rows[0], { requestId: data.requestId });
};
