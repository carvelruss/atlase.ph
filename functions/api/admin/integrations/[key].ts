import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { parseJsonBody } from '../../../lib/validation';
import { ok } from '../../../lib/response';
import { badRequest, notFound } from '../../../lib/errors';
import { findIntegration, maskConfig } from '../../../lib/integrations';
import { writeAudit } from '../../../lib/audit';

const bodySchema = z.object({ config: z.record(z.unknown()).default({}), isConnected: z.boolean().default(true) });
const MASK = '••••••••';

export const onRequestPut: Fn = async ({ request, params, env, data }) => {
  const key = String(params.key ?? '');
  const def = findIntegration(key);
  if (!def) throw badRequest('Unknown integration.');
  const input = await parseJsonBody(request, bodySchema);
  const db = getDb(env);

  const existing = await db.select().from(schema.integrations).where(eq(schema.integrations.key, key)).limit(1);
  const prevConfig = (existing[0]?.config as Record<string, unknown> | null) ?? {};

  // Preserve existing secret values when the client submits the masked placeholder.
  const secretKeys = new Set(def.fields.filter((f) => f.secret).map((f) => f.key));
  const merged: Record<string, unknown> = { ...prevConfig, ...input.config };
  for (const k of secretKeys) {
    if (input.config[k] === MASK || input.config[k] === undefined) merged[k] = prevConfig[k];
  }

  if (existing[0]) {
    await db.update(schema.integrations).set({ config: merged, isConnected: input.isConnected, name: def.name, category: def.category, updatedAt: new Date() }).where(eq(schema.integrations.key, key));
  } else {
    await db.insert(schema.integrations).values({ key, name: def.name, category: def.category, config: merged, isConnected: input.isConnected });
  }

  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'integration.configure', entityType: 'integration', entityId: key });
  return ok({ key, isConnected: input.isConnected, config: maskConfig(def, merged) }, { requestId: data.requestId });
};

export const onRequestDelete: Fn = async ({ params, env, data }) => {
  const key = String(params.key ?? '');
  const def = findIntegration(key);
  if (!def) throw notFound('Unknown integration.');
  const db = getDb(env);
  await db.update(schema.integrations).set({ isConnected: false, updatedAt: new Date() }).where(eq(schema.integrations.key, key));
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'integration.disconnect', entityType: 'integration', entityId: key });
  return ok({ key, isConnected: false }, { requestId: data.requestId });
};
