import { asc } from 'drizzle-orm';
import type { Fn } from '../../../../lib/env';
import { getDb, schema } from '../../../../lib/db';
import { parseJsonBody } from '../../../../lib/validation';
import { ok } from '../../../../lib/response';
import { homepageSaveSchema } from '../../../../lib/validators';
import { writeAudit } from '../../../../lib/audit';

export const onRequestGet: Fn = async ({ env, data }) => {
  const db = getDb(env);
  const sections = await db.select().from(schema.homepageSections).orderBy(asc(schema.homepageSections.position));
  return ok({ sections }, { requestId: data.requestId });
};

/** Replace the full homepage section set (handles reorder / add / remove / toggle). */
export const onRequestPost: Fn = async ({ request, env, data }) => {
  const input = await parseJsonBody(request, homepageSaveSchema);
  const db = getDb(env);
  await db.delete(schema.homepageSections);
  if (input.sections.length) {
    await db.insert(schema.homepageSections).values(
      input.sections.map((s, i) => ({ type: s.type, position: i, isEnabled: s.isEnabled, settings: s.settings })),
    );
  }
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'homepage.save', entityType: 'homepage', metadata: { count: input.sections.length } });
  const sections = await db.select().from(schema.homepageSections).orderBy(asc(schema.homepageSections.position));
  return ok({ sections }, { requestId: data.requestId });
};
