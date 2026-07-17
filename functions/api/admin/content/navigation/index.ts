import { asc, eq } from 'drizzle-orm';
import type { Fn } from '../../../../lib/env';
import { getDb, schema } from '../../../../lib/db';
import { parseJsonBody } from '../../../../lib/validation';
import { ok } from '../../../../lib/response';
import { menuSaveSchema } from '../../../../lib/validators';
import { writeAudit } from '../../../../lib/audit';

export const onRequestGet: Fn = async ({ env, data }) => {
  const db = getDb(env);
  const [menus, items] = await Promise.all([
    db.select().from(schema.menus).orderBy(asc(schema.menus.id)),
    db.select().from(schema.menuItems).orderBy(asc(schema.menuItems.position)),
  ]);
  const result = menus.map((m) => ({ ...m, items: items.filter((i) => i.menuId === m.id) }));
  return ok({ menus: result }, { requestId: data.requestId });
};

/** Upsert a single menu (by handle) and replace its items. */
export const onRequestPost: Fn = async ({ request, env, data }) => {
  const input = await parseJsonBody(request, menuSaveSchema);
  const db = getDb(env);

  const existing = await db.select({ id: schema.menus.id }).from(schema.menus).where(eq(schema.menus.handle, input.handle)).limit(1);
  let menuId: number;
  if (existing[0]) {
    menuId = existing[0].id;
    await db.update(schema.menus).set({ name: input.name, updatedAt: new Date() }).where(eq(schema.menus.id, menuId));
  } else {
    const [m] = await db.insert(schema.menus).values({ handle: input.handle, name: input.name }).returning({ id: schema.menus.id });
    menuId = m!.id;
  }

  await db.delete(schema.menuItems).where(eq(schema.menuItems.menuId, menuId));
  if (input.items.length) {
    await db.insert(schema.menuItems).values(
      input.items.map((item, i) => ({
        menuId,
        label: item.label,
        linkType: item.linkType,
        url: item.url ?? null,
        refId: item.refId ?? null,
        position: i,
        isVisible: item.isVisible,
      })),
    );
  }

  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'navigation.save', entityType: 'menu', entityId: menuId });
  return ok({ menuId }, { requestId: data.requestId });
};
