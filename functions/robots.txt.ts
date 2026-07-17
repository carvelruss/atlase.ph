import type { Env } from './lib/env';

/** robots.txt — allow the storefront, keep private/checkout/admin routes out of the index. */
export const onRequestGet: PagesFunction<Env> = ({ request, env }) => {
  const origin = env.PUBLIC_BASE_URL ?? new URL(request.url).origin;
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /account',
    'Disallow: /api/',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
};
