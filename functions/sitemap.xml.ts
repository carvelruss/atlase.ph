import { eq } from 'drizzle-orm';
import type { Env } from './lib/env';
import { getDb, schema } from './lib/db';

function url(loc: string, updated?: Date | null): string {
  const lastmod = updated ? `<lastmod>${updated.toISOString().slice(0, 10)}</lastmod>` : '';
  return `<url><loc>${loc}</loc>${lastmod}</url>`;
}

/** Dynamic XML sitemap covering active products, categories, collections, pages, and posts. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const origin = env.PUBLIC_BASE_URL ?? new URL(request.url).origin;
  const db = getDb(env);

  const [products, categories, collections, pages, posts] = await Promise.all([
    db.select({ slug: schema.products.slug, updatedAt: schema.products.updatedAt }).from(schema.products).where(eq(schema.products.status, 'active')).limit(5000),
    db.select({ slug: schema.categories.slug }).from(schema.categories).where(eq(schema.categories.isActive, true)),
    db.select({ slug: schema.collections.slug }).from(schema.collections).where(eq(schema.collections.isActive, true)),
    db.select({ slug: schema.pages.slug, updatedAt: schema.pages.updatedAt }).from(schema.pages).where(eq(schema.pages.status, 'published')),
    db.select({ slug: schema.blogPosts.slug, updatedAt: schema.blogPosts.updatedAt }).from(schema.blogPosts).where(eq(schema.blogPosts.status, 'published')),
  ]);

  const urls: string[] = [
    url(`${origin}/`),
    url(`${origin}/shop`),
    url(`${origin}/blog`),
    ...products.map((p) => url(`${origin}/products/${p.slug}`, p.updatedAt)),
    ...categories.map((c) => url(`${origin}/categories/${c.slug}`)),
    ...collections.map((c) => url(`${origin}/collections/${c.slug}`)),
    ...pages.map((p) => url(`${origin}/pages/${p.slug}`, p.updatedAt)),
    ...posts.map((p) => url(`${origin}/blog/${p.slug}`, p.updatedAt)),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
};
