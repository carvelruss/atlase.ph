import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { ok } from '../../../lib/response';
import { INTEGRATION_CATALOG, maskConfig } from '../../../lib/integrations';

/** List all catalog integrations merged with stored connection state. */
export const onRequestGet: Fn = async ({ env, data }) => {
  const db = getDb(env);
  const stored = await db.select().from(schema.integrations);
  const byKey = new Map(stored.map((s) => [s.key, s]));

  const items = INTEGRATION_CATALOG.map((def) => {
    const row = byKey.get(def.key);
    return {
      key: def.key,
      name: def.name,
      category: def.category,
      description: def.description,
      icon: def.icon,
      fields: def.fields,
      isConnected: row?.isConnected ?? false,
      config: maskConfig(def, row?.config),
      lastSyncedAt: row?.lastSyncedAt ?? null,
      lastError: row?.lastError ?? null,
    };
  });

  return ok({ items }, { requestId: data.requestId });
};
