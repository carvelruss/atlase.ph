import { desc, sql } from 'drizzle-orm';
import type { Fn } from '../../../../lib/env';
import { getDb, schema } from '../../../../lib/db';
import { parseJsonBody } from '../../../../lib/validation';
import { ok, created } from '../../../../lib/response';
import { ensureUniqueSlug } from '../../../../lib/slugs';
import { blogPostSchema, type BlogPostInput } from '../../../../lib/validators';
import { writeAudit } from '../../../../lib/audit';

export function blogValues(input: BlogPostInput, slug: string) {
  const readTime = input.readTimeMinutes ?? (input.body ? Math.max(1, Math.round(input.body.replace(/<[^>]+>/g, '').split(/\s+/).length / 200)) : null);
  return {
    title: input.title,
    slug,
    excerpt: input.excerpt ?? null,
    overview: input.overview ?? null,
    body: input.body ?? null,
    featuredImageAssetId: input.featuredImageAssetId ?? null,
    imageCaption: input.imageCaption ?? null,
    author: input.author ?? null,
    categoryId: input.categoryId ?? null,
    status: input.status,
    readTimeMinutes: readTime,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    ogImageAssetId: input.ogImageAssetId ?? null,
    publishedAt: input.status === 'published' ? new Date() : null,
  };
}

export const onRequestGet: Fn = async ({ env, data }) => {
  const db = getDb(env);
  const items = await db
    .select({
      id: schema.blogPosts.id,
      title: schema.blogPosts.title,
      slug: schema.blogPosts.slug,
      status: schema.blogPosts.status,
      author: schema.blogPosts.author,
      updatedAt: schema.blogPosts.updatedAt,
      thumbnailUrl: sql<string | null>`(SELECT url FROM media_assets WHERE media_assets.id = blog_posts.featured_image_asset_id)`,
    })
    .from(schema.blogPosts)
    .orderBy(desc(schema.blogPosts.updatedAt));
  return ok({ items }, { requestId: data.requestId });
};

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const input = await parseJsonBody(request, blogPostSchema);
  const db = getDb(env);
  const slug = await ensureUniqueSlug(db, schema.blogPosts, schema.blogPosts.slug, schema.blogPosts.id, input.slug || input.title);
  const [row] = await db.insert(schema.blogPosts).values(blogValues(input, slug)).returning();
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'blog.create', entityType: 'blog_post', entityId: row?.id });
  return created(row, { requestId: data.requestId });
};
