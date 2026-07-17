import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parseJsonBody } from '../../../lib/validation';
import { ok } from '../../../lib/response';
import { badRequest } from '../../../lib/errors';
import { getSettingsGroup } from '../../../lib/settings';
import { writeAudit } from '../../../lib/audit';

const ALLOWED_GROUPS = new Set([
  'store', 'checkout', 'tax', 'charges', 'seo', 'social', 'warehouse', 'shipping',
  'notifications', 'order_numbering', 'security', 'policies',
]);

const bodySchema = z.object({ data: z.record(z.unknown()) });

export const onRequestGet: Fn = async ({ params, env, data }) => {
  const group = String(params.group ?? '');
  if (!ALLOWED_GROUPS.has(group)) throw badRequest('Unknown settings group.');
  const value = await getSettingsGroup(env, group);
  return ok({ group, data: value }, { requestId: data.requestId });
};

export const onRequestPost: Fn = async ({ request, params, env, data }) => {
  const group = String(params.group ?? '');
  if (!ALLOWED_GROUPS.has(group)) throw badRequest('Unknown settings group.');
  const input = await parseJsonBody(request, bodySchema);
  const db = getDb(env);

  const existing = await db.select({ group: schema.storeSettings.group }).from(schema.storeSettings).where(eq(schema.storeSettings.group, group)).limit(1);
  if (existing[0]) {
    await db.update(schema.storeSettings).set({ data: input.data, updatedAt: new Date() }).where(eq(schema.storeSettings.group, group));
  } else {
    await db.insert(schema.storeSettings).values({ group, data: input.data });
  }

  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'settings.update', entityType: 'settings', entityId: group });
  return ok({ group, data: input.data }, { requestId: data.requestId });
};
