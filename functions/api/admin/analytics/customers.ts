import type { Fn } from '../../../lib/env';
import { ok } from '../../../lib/response';
import { customerAnalytics } from '../../../lib/services/analytics';

export const onRequestGet: Fn = async ({ request, env, data }) => {
  const range = new URL(request.url).searchParams.get('range') ?? '30d';
  return ok(await customerAnalytics(env, range), { requestId: data.requestId });
};
