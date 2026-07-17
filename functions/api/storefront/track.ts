import { z } from 'zod';
import type { Fn } from '../../lib/env';
import { parseJsonBody } from '../../lib/validation';
import { ok } from '../../lib/response';
import { rateLimit } from '../../lib/rateLimit';
import { getClientIp, getUserAgent } from '../../lib/http';
import { randomToken } from '../../lib/crypto';
import { getCookie, serializeCookie, ANALYTICS_COOKIE } from '../../lib/cookies';
import { isProduction } from '../../lib/env';
import { recordEvent } from '../../lib/services/analytics';

const bodySchema = z.object({
  type: z.enum(['page_view', 'product_view', 'add_to_cart', 'checkout_start', 'purchase']),
  path: z.string().max(500).nullable().optional(),
  productId: z.number().int().positive().nullable().optional(),
  value: z.number().int().nonnegative().nullable().optional(),
  source: z.string().max(120).nullable().optional(),
});

function deviceFrom(ua: string | null): string {
  if (!ua) return 'unknown';
  if (/mobile/i.test(ua) && !/ipad|tablet/i.test(ua)) return 'mobile';
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  return 'desktop';
}

/**
 * First-party analytics beacon. Uses a rotating, anonymous session id (HttpOnly
 * cookie, no PII). Rate-limited to blunt abuse. Never returns customer data.
 */
export const onRequestPost: Fn = async ({ request, env, data }) => {
  const ip = getClientIp(request);
  const limit = await rateLimit(env, `track:${ip ?? 'unknown'}`, 120, 60);
  if (!limit.allowed) return ok({ recorded: false }, { requestId: data.requestId });

  const input = await parseJsonBody(request, bodySchema);

  let sid = getCookie(request, ANALYTICS_COOKIE);
  let setCookie: string | undefined;
  if (!sid) {
    sid = randomToken(16);
    setCookie = serializeCookie(ANALYTICS_COOKIE, sid, { maxAge: 60 * 60 * 24, httpOnly: true, secure: isProduction(env), sameSite: 'Lax' });
  }

  const referrer = request.headers.get('Referer');
  const country = request.headers.get('CF-IPCountry');
  await recordEvent(env, {
    sessionId: sid,
    type: input.type,
    path: input.path ?? null,
    productId: input.productId ?? null,
    value: input.value ?? null,
    referrer,
    source: input.source ?? (referrer ? new URL(referrer).hostname : 'direct'),
    device: deviceFrom(getUserAgent(request)),
    country,
  });

  return ok({ recorded: true }, { requestId: data.requestId }, 200, setCookie ? { 'Set-Cookie': setCookie } : undefined);
};
