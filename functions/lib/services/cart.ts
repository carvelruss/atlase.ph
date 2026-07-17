import { and, eq, sql } from 'drizzle-orm';
import { carts, cartItems, products, productVariants, inventoryItems } from '../../../shared/db/schema/index';
import { getDb, type Database } from '../db';
import { hmacSign, hmacVerify, randomToken } from '../crypto';
import { serializeCookie, getCookie, CART_COOKIE } from '../cookies';
import { isProduction, secretOrDev, type Env } from '../env';
import { badRequest, conflict } from '../errors';

const CART_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

async function signCartToken(env: Env, token: string): Promise<string> {
  const sig = await hmacSign(secretOrDev(env, 'CART_TOKEN_SECRET'), token);
  return `${token}.${sig}`;
}

async function readSignedCartToken(env: Env, cookieValue: string | undefined): Promise<string | null> {
  if (!cookieValue) return null;
  const idx = cookieValue.lastIndexOf('.');
  if (idx <= 0) return null;
  const token = cookieValue.slice(0, idx);
  const sig = cookieValue.slice(idx + 1);
  const valid = await hmacVerify(secretOrDev(env, 'CART_TOKEN_SECRET'), token, sig);
  return valid ? token : null;
}

export interface CartResolution {
  cartId: number;
  token: string;
  setCookie?: string;
}

/** Resolve the current guest cart from the signed cookie, creating one if needed. */
export async function getOrCreateCart(env: Env, request: Request): Promise<CartResolution> {
  const db = getDb(env);
  const token = await readSignedCartToken(env, getCookie(request, CART_COOKIE));

  if (token) {
    const rows = await db.select({ id: carts.id }).from(carts).where(and(eq(carts.token, token), eq(carts.status, 'active'))).limit(1);
    if (rows[0]) return { cartId: rows[0].id, token };
  }

  const newToken = randomToken(24);
  const [created] = await db
    .insert(carts)
    .values({ token: newToken, currency: 'PHP', status: 'active', expiresAt: new Date(Date.now() + CART_TTL_SECONDS * 1000) })
    .returning({ id: carts.id });
  if (!created) throw new Error('Failed to create cart.');

  const cookie = serializeCookie(CART_COOKIE, await signCartToken(env, newToken), {
    maxAge: CART_TTL_SECONDS,
    httpOnly: true,
    secure: isProduction(env),
    sameSite: 'Lax',
  });
  return { cartId: created.id, token: newToken, setCookie: cookie };
}

/** Resolve an existing cart without creating one (for read-only views). */
export async function findCart(env: Env, request: Request): Promise<number | null> {
  const db = getDb(env);
  const token = await readSignedCartToken(env, getCookie(request, CART_COOKIE));
  if (!token) return null;
  const rows = await db.select({ id: carts.id }).from(carts).where(and(eq(carts.token, token), eq(carts.status, 'active'))).limit(1);
  return rows[0]?.id ?? null;
}

export interface CartLine {
  id: number;
  productId: number;
  variantId: number;
  name: string;
  slug: string;
  variantTitle: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string | null;
  available: number;
}

export interface CartView {
  id: number;
  currency: string;
  items: CartLine[];
  subtotal: number;
  itemCount: number;
}

/** Build a cart view with server-recomputed prices (never trusts stored snapshots). */
export async function getCartView(env: Env, cartId: number): Promise<CartView> {
  const db = getDb(env);
  const rows = await db
    .select({
      id: cartItems.id,
      productId: products.id,
      variantId: productVariants.id,
      name: products.name,
      slug: products.slug,
      variantTitle: productVariants.title,
      quantity: cartItems.quantity,
      variantPrice: productVariants.price,
      productPrice: products.price,
      trackInventory: products.trackInventory,
      continueSelling: products.continueSellingWhenOutOfStock,
      onHand: inventoryItems.onHand,
      reserved: inventoryItems.reserved,
      status: products.status,
      imageUrl: sql<string | null>`(SELECT url FROM media_assets WHERE media_assets.id = coalesce(product_variants.image_asset_id, products.featured_image_asset_id, (SELECT asset_id FROM product_images WHERE product_id = products.id ORDER BY position LIMIT 1)))`,
    })
    .from(cartItems)
    .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .innerJoin(products, eq(products.id, cartItems.productId))
    .leftJoin(inventoryItems, eq(inventoryItems.variantId, cartItems.variantId))
    .where(eq(cartItems.cartId, cartId));

  const items: CartLine[] = [];
  let subtotal = 0;
  for (const r of rows) {
    if (r.status !== 'active') continue; // drop unavailable products from view
    const unitPrice = r.variantPrice ?? r.productPrice;
    const available = r.trackInventory && !r.continueSelling ? Math.max(0, (r.onHand ?? 0) - (r.reserved ?? 0)) : Number.MAX_SAFE_INTEGER;
    const qty = Math.min(r.quantity, available === Number.MAX_SAFE_INTEGER ? r.quantity : available);
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;
    items.push({
      id: r.id,
      productId: r.productId,
      variantId: r.variantId,
      name: r.name,
      slug: r.slug,
      variantTitle: r.variantTitle,
      quantity: r.quantity,
      unitPrice,
      lineTotal,
      imageUrl: r.imageUrl,
      available: available === Number.MAX_SAFE_INTEGER ? 9999 : available,
    });
  }

  const [cartRow] = await db.select({ currency: carts.currency }).from(carts).where(eq(carts.id, cartId)).limit(1);
  return {
    id: cartId,
    currency: cartRow?.currency ?? 'PHP',
    items,
    subtotal,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
  };
}

async function assertPurchasable(db: Database, variantId: number, wantQty: number) {
  const rows = await db
    .select({
      variantActive: productVariants.isActive,
      productStatus: products.status,
      trackInventory: products.trackInventory,
      continueSelling: products.continueSellingWhenOutOfStock,
      productId: products.id,
      variantPrice: productVariants.price,
      productPrice: products.price,
      onHand: inventoryItems.onHand,
      reserved: inventoryItems.reserved,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .leftJoin(inventoryItems, eq(inventoryItems.variantId, productVariants.id))
    .where(eq(productVariants.id, variantId))
    .limit(1);
  const v = rows[0];
  if (!v || !v.variantActive || v.productStatus !== 'active') {
    throw badRequest('This item is no longer available.');
  }
  const available = v.trackInventory && !v.continueSelling ? (v.onHand ?? 0) - (v.reserved ?? 0) : Number.MAX_SAFE_INTEGER;
  if (wantQty > available) {
    throw conflict(`Only ${Math.max(0, available)} left in stock.`);
  }
  return { productId: v.productId, unitPrice: v.variantPrice ?? v.productPrice };
}

export async function addCartItem(env: Env, cartId: number, variantId: number, quantity: number) {
  if (quantity < 1) throw badRequest('Quantity must be at least 1.');
  const db = getDb(env);
  const existing = await db
    .select({ id: cartItems.id, quantity: cartItems.quantity })
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)))
    .limit(1);

  const targetQty = (existing[0]?.quantity ?? 0) + quantity;
  const { productId, unitPrice } = await assertPurchasable(db, variantId, targetQty);

  if (existing[0]) {
    await db.update(cartItems).set({ quantity: targetQty, unitPrice, updatedAt: new Date() }).where(eq(cartItems.id, existing[0].id));
  } else {
    await db.insert(cartItems).values({ cartId, productId, variantId, quantity, unitPrice });
  }
}

export async function updateCartItem(env: Env, cartId: number, itemId: number, quantity: number) {
  const db = getDb(env);
  const rows = await db.select({ variantId: cartItems.variantId }).from(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId))).limit(1);
  const item = rows[0];
  if (!item) throw badRequest('Cart item not found.');
  if (quantity < 1) {
    await db.delete(cartItems).where(eq(cartItems.id, itemId));
    return;
  }
  const { unitPrice } = await assertPurchasable(db, item.variantId, quantity);
  await db.update(cartItems).set({ quantity, unitPrice, updatedAt: new Date() }).where(eq(cartItems.id, itemId));
}

export async function removeCartItem(env: Env, cartId: number, itemId: number) {
  const db = getDb(env);
  await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
}
