import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Fn } from '../../../../lib/env';
import { getDb, schema } from '../../../../lib/db';
import { parseJsonBody } from '../../../../lib/validation';
import { ok } from '../../../../lib/response';
import { writeAudit } from '../../../../lib/audit';

const bodySchema = z.object({ data: z.record(z.unknown()) });

export const onRequestGet: Fn = async ({ env, data }) => {
  const db = getDb(env);
  const rows = await db.select().from(schema.themeSettings).where(eq(schema.themeSettings.id, 1)).limit(1);
  return ok({ theme: rows[0]?.data ?? {} }, { requestId: data.requestId });
};

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const input = await parseJsonBody(request, bodySchema);
  const db = getDb(env);
  const existing = await db.select({ id: schema.themeSettings.id }).from(schema.themeSettings).where(eq(schema.themeSettings.id, 1)).limit(1);
  if (existing[0]) {
    await db.update(schema.themeSettings).set({ data: input.data, updatedAt: new Date() }).where(eq(schema.themeSettings.id, 1));
  } else {
    await db.insert(schema.themeSettings).values({ id: 1, data: input.data });
  }
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'theme.save', entityType: 'theme' });
  return ok({ theme: input.data }, { requestId: data.requestId });
};
