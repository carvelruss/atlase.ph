import type { Env } from '../lib/env';

/** Public read-through of R2 media at /media/{objectKey}. Long-cached + immutable. */
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const keyParam = params.key;
  const key = Array.isArray(keyParam) ? keyParam.join('/') : String(keyParam ?? '');
  if (!key) return new Response('Not found', { status: 404 });

  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
};
