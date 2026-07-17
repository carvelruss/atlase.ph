import { asc, eq } from 'drizzle-orm';
import type { Fn } from '../../lib/env';
import { getDb, schema } from '../../lib/db';
import { ok } from '../../lib/response';

interface StoreDoc {
  name?: string;
  currency?: string;
  supportEmail?: string;
  phone?: string;
}

/** Public storefront bootstrap: store identity, theme, and header/footer menus. */
export const onRequestGet: Fn = async ({ env, data }) => {
  const db = getDb(env);

  const [storeRow, themeRow, menus, menuItems] = await Promise.all([
    db.select().from(schema.storeSettings).where(eq(schema.storeSettings.group, 'store')).limit(1),
    db.select().from(schema.themeSettings).where(eq(schema.themeSettings.id, 1)).limit(1),
    db.select().from(schema.menus),
    db
      .select()
      .from(schema.menuItems)
      .where(eq(schema.menuItems.isVisible, true))
      .orderBy(asc(schema.menuItems.position)),
  ]);

  const store = (storeRow[0]?.data as StoreDoc | undefined) ?? {};
  const theme = themeRow[0]?.data ?? {};

  const menuByHandle: Record<string, Array<{ label: string; url: string | null }>> = {};
  for (const menu of menus) {
    menuByHandle[menu.handle] = menuItems
      .filter((item) => item.menuId === menu.id)
      .map((item) => ({ label: item.label, url: item.url }));
  }

  return ok(
    {
      store: {
        name: store.name ?? env.PUBLIC_STORE_NAME ?? 'Atlase',
        currency: store.currency ?? env.PUBLIC_CURRENCY ?? 'PHP',
        supportEmail: store.supportEmail ?? null,
        phone: store.phone ?? null,
      },
      theme,
      menus: menuByHandle,
    },
    { requestId: data.requestId },
    200,
    // Public, cacheable at the edge briefly.
    undefined,
  );
};
