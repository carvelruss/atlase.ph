import { and, eq, sql } from 'drizzle-orm';
import {
  carts,
  cartItems,
  products,
  productVariants,
  inventoryItems,
  inventoryAdjustments,
  orders,
  orderItems,
  orderAddresses,
  orderStatusHistory,
  payments,
  customers,
  discounts,
  discountRedemptions,
} from '../../../shared/db/schema/index';
import { getDb, type Database } from '../db';
import { badRequest, conflict, notFound } from '../errors';
import { getSettingsGroup, nextOrderNumber } from '../settings';
import { resolveShippingOption } from './shipping';
import type { AddressInput } from '../validators';
import type { Env } from '../env';

// --- Cart loading (authoritative) --------------------------------------------

export interface CheckoutLine {
  variantId: number;
  productId: number;
  name: string;
  variantTitle: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  weightGrams: number;
  requiresShipping: boolean;
  trackInventory: boolean;
  continueSelling: boolean;
  available: number;
}

export async function loadCartLines(db: Database, cartId: number): Promise<CheckoutLine[]> {
  const rows = await db
    .select({
      variantId: productVariants.id,
      productId: products.id,
      name: products.name,
      variantTitle: productVariants.title,
      sku: productVariants.sku,
      quantity: cartItems.quantity,
      variantPrice: productVariants.price,
      productPrice: products.price,
      variantWeight: productVariants.weightGrams,
      productWeight: products.weightGrams,
      requiresShipping: products.requiresShipping,
      trackInventory: products.trackInventory,
      continueSelling: products.continueSellingWhenOutOfStock,
      status: products.status,
      variantActive: productVariants.isActive,
      onHand: inventoryItems.onHand,
      reserved: inventoryItems.reserved,
    })
    .from(cartItems)
    .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .innerJoin(products, eq(products.id, cartItems.productId))
    .leftJoin(inventoryItems, eq(inventoryItems.variantId, cartItems.variantId))
    .where(eq(cartItems.cartId, cartId));

  return rows
    .filter((r) => r.status === 'active' && r.variantActive)
    .map((r) => ({
      variantId: r.variantId,
      productId: r.productId,
      name: r.name,
      variantTitle: r.variantTitle,
      sku: r.sku,
      quantity: r.quantity,
      unitPrice: r.variantPrice ?? r.productPrice,
      weightGrams: r.variantWeight ?? r.productWeight ?? 0,
      requiresShipping: r.requiresShipping,
      trackInventory: r.trackInventory,
      continueSelling: r.continueSelling,
      available: r.trackInventory && !r.continueSelling ? (r.onHand ?? 0) - (r.reserved ?? 0) : Number.MAX_SAFE_INTEGER,
    }));
}

export function assertLinesPurchasable(lines: CheckoutLine[]): void {
  if (lines.length === 0) throw badRequest('Your cart is empty.');
  for (const line of lines) {
    if (line.quantity > line.available) {
      throw conflict(`"${line.name}" only has ${Math.max(0, line.available)} in stock.`);
    }
  }
}

// --- Discounts ---------------------------------------------------------------

export interface DiscountResult {
  discountId: number;
  code: string;
  amount: number; // minor units off the subtotal
  freeShipping: boolean;
}

export async function validateDiscount(
  env: Env,
  code: string,
  subtotal: number,
  itemCount: number,
): Promise<DiscountResult> {
  const db = getDb(env);
  const normalized = code.trim().toUpperCase();
  const rows = await db.select().from(discounts).where(eq(discounts.code, normalized)).limit(1);
  const d = rows[0];
  if (!d || !d.isActive) throw badRequest('That discount code is not valid.');

  const now = new Date();
  if (d.startsAt && d.startsAt > now) throw badRequest('This discount is not active yet.');
  if (d.endsAt && d.endsAt < now) throw badRequest('This discount has expired.');
  if (d.minPurchase != null && subtotal < d.minPurchase) throw badRequest('Your order does not meet the minimum for this discount.');
  if (d.minQuantity != null && itemCount < d.minQuantity) throw badRequest('Add more items to use this discount.');
  if (d.usageLimit != null && d.usageCount >= d.usageLimit) throw badRequest('This discount has reached its usage limit.');

  let amount = 0;
  let freeShipping = false;
  switch (d.type) {
    case 'percentage':
      amount = Math.min(subtotal, Math.round((subtotal * d.value) / 100));
      break;
    case 'fixed_amount':
      amount = Math.min(subtotal, d.value);
      break;
    case 'free_shipping':
      freeShipping = true;
      break;
    default:
      throw badRequest('This discount cannot be applied at checkout.');
  }

  return { discountId: d.id, code: normalized, amount, freeShipping };
}

// --- Totals ------------------------------------------------------------------

export interface Totals {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  extraChargesTotal: number;
  grandTotal: number;
}

interface TaxSettings {
  enabled?: boolean;
  pricesIncludeTax?: boolean;
  defaultRate?: number;
}
interface ChargeSettings {
  handlingFee?: number;
  codFee?: number;
}

export async function calculateTotals(
  env: Env,
  input: {
    lines: CheckoutLine[];
    shippingRate: number;
    discount: DiscountResult | null;
    paymentMethod: string;
  },
): Promise<Totals> {
  const subtotal = input.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discountTotal = input.discount ? input.discount.amount : 0;
  const shippingTotal = input.discount?.freeShipping ? 0 : input.shippingRate;

  const tax = await getSettingsGroup<TaxSettings>(env, 'tax');
  const charges = await getSettingsGroup<ChargeSettings>(env, 'charges');

  const taxable = Math.max(0, subtotal - discountTotal);
  let taxTotal = 0;
  if (tax.enabled) {
    const rate = tax.defaultRate ?? 0;
    if (tax.pricesIncludeTax) {
      // VAT already inside prices — report the embedded portion, don't add it.
      taxTotal = Math.round(taxable - taxable / (1 + rate / 100));
    } else {
      taxTotal = Math.round((taxable * rate) / 100);
    }
  }

  let extraChargesTotal = charges.handlingFee ?? 0;
  if (input.paymentMethod === 'cod' && charges.codFee) extraChargesTotal += charges.codFee;

  const addedTax = tax.enabled && !tax.pricesIncludeTax ? taxTotal : 0;
  const grandTotal = Math.max(0, subtotal - discountTotal + shippingTotal + addedTax + extraChargesTotal);

  return { subtotal, discountTotal, shippingTotal, taxTotal, extraChargesTotal, grandTotal };
}

export function cartWeight(lines: CheckoutLine[]): number {
  return lines.reduce((w, l) => w + l.weightGrams * l.quantity, 0);
}

// --- Order completion --------------------------------------------------------

export interface CompleteInput {
  email: string;
  phone?: string | null;
  shipping: AddressInput;
  billing?: AddressInput | null;
  shippingMethodId: number;
  paymentMethod: 'cod' | 'bank_transfer';
  discountCode?: string | null;
  customerNote?: string | null;
  marketingConsent?: boolean;
  idempotencyKey: string;
}

export interface CompleteResult {
  orderId: number;
  orderNumber: string;
  grandTotal: number;
  email: string;
  paymentMethod: string;
}

export async function completeCheckout(env: Env, cartId: number, input: CompleteInput): Promise<CompleteResult> {
  const db = getDb(env);

  // Idempotency: a repeat submission returns the already-created order.
  const dup = await db
    .select({ id: orders.id, orderNumber: orders.orderNumber, grandTotal: orders.grandTotal, email: orders.email, paymentMethod: orders.paymentMethod })
    .from(orders)
    .where(eq(orders.idempotencyKey, input.idempotencyKey))
    .limit(1);
  if (dup[0]) {
    return { orderId: dup[0].id, orderNumber: dup[0].orderNumber, grandTotal: dup[0].grandTotal, email: dup[0].email, paymentMethod: dup[0].paymentMethod ?? input.paymentMethod };
  }

  const lines = await loadCartLines(db, cartId);
  assertLinesPurchasable(lines);

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const weight = cartWeight(lines);
  const needsShipping = lines.some((l) => l.requiresShipping);

  // Shipping (server-resolved).
  let shippingRate = 0;
  let shippingName: string | null = null;
  if (needsShipping) {
    const option = await resolveShippingOption(env, input.shippingMethodId, {
      subtotal,
      weightGrams: weight,
      destination: { country: input.shipping.country, province: input.shipping.province },
    });
    if (!option) throw badRequest('The selected shipping method is not available.');
    shippingRate = option.rate;
    shippingName = option.name;
  }

  const discount = input.discountCode ? await validateDiscount(env, input.discountCode, subtotal, itemCount) : null;
  const totals = await calculateTotals(env, { lines, shippingRate, discount, paymentMethod: input.paymentMethod });

  // Customer (upsert by email; guests get a lightweight record).
  const email = input.email.trim().toLowerCase();
  const existingCustomer = await db.select({ id: customers.id }).from(customers).where(eq(customers.email, email)).limit(1);
  let customerId: number;
  if (existingCustomer[0]) {
    customerId = existingCustomer[0].id;
  } else {
    const [c] = await db
      .insert(customers)
      .values({
        email,
        firstName: input.shipping.firstName ?? null,
        lastName: input.shipping.lastName ?? null,
        phone: input.phone ?? input.shipping.phone ?? null,
        isGuest: true,
        marketingConsent: input.marketingConsent ?? false,
      })
      .returning({ id: customers.id });
    customerId = c!.id;
  }

  const orderStatus = input.paymentMethod === 'cod' ? 'confirmed' : 'pending';
  const orderValues = {
    customerId,
    email,
    phone: input.phone ?? input.shipping.phone ?? null,
    currency: 'PHP',
    status: orderStatus,
    paymentStatus: 'pending',
    fulfillmentStatus: 'unfulfilled',
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    shippingTotal: totals.shippingTotal,
    taxTotal: totals.taxTotal,
    extraChargesTotal: totals.extraChargesTotal,
    grandTotal: totals.grandTotal,
    amountPaid: 0,
    discountCode: discount?.code ?? null,
    paymentMethod: input.paymentMethod,
    shippingMethodName: shippingName,
    customerNote: input.customerNote ?? null,
    idempotencyKey: input.idempotencyKey,
    checkoutId: null,
    placedAt: new Date(),
  };

  // Generate a unique order number, retrying on the (rare) collision so concurrent
  // checkouts or a mis-seeded counter can never produce a duplicate.
  let orderId = 0;
  let orderNumber = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    orderNumber = await nextOrderNumber(env);
    try {
      const [order] = await db.insert(orders).values({ ...orderValues, orderNumber }).returning({ id: orders.id });
      orderId = order!.id;
      break;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('UNIQUE constraint failed') && attempt < 4) continue;
      throw err;
    }
  }

  // Line items (snapshot).
  await db.insert(orderItems).values(
    lines.map((l) => ({
      orderId,
      productId: l.productId,
      variantId: l.variantId,
      name: l.name,
      variantTitle: l.variantTitle,
      sku: l.sku,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      totalPrice: l.unitPrice * l.quantity,
      requiresShipping: l.requiresShipping,
    })),
  );

  // Addresses.
  const addr = (type: 'shipping' | 'billing', a: AddressInput) => ({
    orderId,
    type,
    firstName: a.firstName ?? null,
    lastName: a.lastName ?? null,
    company: a.company ?? null,
    phone: a.phone ?? null,
    line1: a.line1,
    line2: a.line2 ?? null,
    city: a.city,
    province: a.province ?? null,
    postalCode: a.postalCode ?? null,
    country: a.country,
  });
  const addresses = [addr('shipping', input.shipping)];
  if (input.billing) addresses.push(addr('billing', input.billing));
  await db.insert(orderAddresses).values(addresses);

  // Payment record.
  await db.insert(payments).values({
    orderId,
    provider: input.paymentMethod === 'cod' ? 'cod' : 'manual',
    method: input.paymentMethod,
    amount: totals.grandTotal,
    currency: 'PHP',
    status: 'pending',
  });

  // Inventory decrement (idempotent per order+variant).
  for (const l of lines.filter((x) => x.trackInventory)) {
    await db.batch([
      db.update(inventoryItems).set({ onHand: sql`${inventoryItems.onHand} - ${l.quantity}`, updatedAt: new Date() }).where(eq(inventoryItems.variantId, l.variantId)),
      db.insert(inventoryAdjustments).values({
        variantId: l.variantId,
        delta: -l.quantity,
        reason: 'sold',
        note: `Order ${orderNumber}`,
        idempotencyKey: `order-${orderId}-v${l.variantId}`,
        referenceType: 'order',
        referenceId: String(orderId),
      }),
    ]);
  }

  // Discount redemption.
  if (discount) {
    await db.batch([
      db.insert(discountRedemptions).values({ discountId: discount.discountId, orderId, customerId, amount: discount.amount }),
      db.update(discounts).set({ usageCount: sql`${discounts.usageCount} + 1` }).where(eq(discounts.id, discount.discountId)),
    ]);
  }

  // Customer rollups.
  await db
    .update(customers)
    .set({
      ordersCount: sql`${customers.ordersCount} + 1`,
      totalSpent: sql`${customers.totalSpent} + ${totals.grandTotal}`,
      lastOrderAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customerId));

  // Status history + cart conversion.
  await db.batch([
    db.insert(orderStatusHistory).values({ orderId, field: 'status', fromValue: null, toValue: orderStatus, actorType: 'system' }),
    db.update(carts).set({ status: 'converted', convertedOrderId: orderId, updatedAt: new Date() }).where(eq(carts.id, cartId)),
  ]);

  return { orderId, orderNumber, grandTotal: totals.grandTotal, email, paymentMethod: input.paymentMethod };
}

// --- Tracking ----------------------------------------------------------------

export async function findOrderForTracking(env: Env, orderNumber: string, email: string) {
  const db = getDb(env);
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderNumber, orderNumber.trim()), eq(orders.email, email.trim().toLowerCase())))
    .limit(1);
  if (!rows[0]) throw notFound('No order found for that order number and email.');
  return rows[0];
}
