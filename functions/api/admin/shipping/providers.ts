import type { Fn } from '../../../lib/env';
import { ok } from '../../../lib/response';
import { listCourierProviders } from '../../../lib/providers/courier';

/** Available courier providers and whether each is configured for automated labels. */
export const onRequestGet: Fn = async ({ env, data }) => {
  return ok({ providers: listCourierProviders(env) }, { requestId: data.requestId });
};
