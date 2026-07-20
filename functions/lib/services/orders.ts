import { and, desc, eq, getTableColumns, gte, inArray, like, ne, or, sql } from 'drizzle-orm';
import {
  orders,
  orderItems,
  orderAddresses,
  orderStatusHistory,
  orderNotes,
  payments,
  refunds,
  shipments,
  inventoryItems,
  inventoryAdjustments,
  customers,
} from '../../../shared/db/schema/index';
import { getDb, type Database } from '../db';
import { rangeStart } from '../dateRange';
import { notFound, badRequest } from '../errors';
import { sendEmail } from '../email';
import { formatMoney } from '../../../shared/utils/money';
import type { Env } from '../env';

export interface OrderListParams {
  offset: number;
  pageSize: number;
  search: string | null;
  status: string | null; // single status or comma-separated list
  paymentStatus: string | null;
  fulfillmentStatus: string | null;
  range?: string | null;
}

export async function listAdminOrders(env: Env, p: OrderListParams) {
  const db = getDb(env);

  // Base filters shared by the list AND the per-status facet counts — everything
  // except the status filter itself, so the tab counts stay stable while you
  // switch tabs. Drafts (abandoned/incomplete) never surface as real orders.
  const baseConds = [ne(orders.status, 'draft')];
  if (p.search) {
    baseConds.push(or(like(orders.orderNumber, `%${p.search}%`), like(orders.email, `%${p.search}%`), like(orders.phone, `%${p.search}%`))!);
  }
  if (p.paymentStatus) baseConds.push(eq(orders.paymentStatus, p.paymentStatus));
  if (p.fulfillmentStatus) baseConds.push(eq(orders.fulfillmentStatus, p.fulfillmentStatus));
  if (p.range && p.range !== 'lifetime') {
    baseConds.push(gte(orders.createdAt, rangeStart(p.range)));
  }

  const statusList = (p.status ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const where = statusList.length ? and(...baseConds, inArray(orders.status, statusList)) : and(...baseConds);

  const baseSelect = {
    id: orders.id,
    orderNumber: orders.orderNumber,
    email: orders.email,
    customerFirstName: customers.firstName,
    customerLastName: customers.lastName,
    createdAt: orders.createdAt,
    grandTotal: orders.grandTotal,
    status: orders.status,
    paymentStatus: orders.paymentStatus,
    paymentMethod: orders.paymentMethod,
    fulfillmentStatus: orders.fulfillmentStatus,
    shippingMethodName: orders.shippingMethodName,
    itemCount: sql<number>`(SELECT coalesce(sum(quantity),0) FROM order_items WHERE order_id = orders.id)`,
  };

  const [rows, countRows, facetRows] = await Promise.all([
    db
      .select(baseSelect)
      .from(orders)
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(p.pageSize)
      .offset(p.offset),
    db.select({ n: sql<number>`count(*)` }).from(orders).where(where),
    db
      .select({ status: orders.status, n: sql<number>`count(*)` })
      .from(orders)
      .where(and(...baseConds))
      .groupBy(orders.status),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const r of facetRows) statusCounts[r.status] = r.n;

  return { items: rows, total: countRows[0]?.n ?? 0, statusCounts };
}

export async function getAdminOrder(env: Env, id: number) {
  const db = getDb(env);
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  const order = rows[0];
  if (!order) throw notFound('Order not found.');

  const [items, addresses, orderPayments, orderRefunds, orderShipments, history, notes, customer] = await Promise.all([
    db
      .select({
        ...getTableColumns(orderItems),
        // Primary product image (lowest position) resolved to its public URL.
        imageUrl: sql<string | null>`(
          SELECT url FROM media_assets WHERE id = (
            SELECT asset_id FROM product_images
            WHERE product_id = ${orderItems.productId}
            ORDER BY position ASC LIMIT 1
          )
        )`,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, id)),
    db.select().from(orderAddresses).where(eq(orderAddresses.orderId, id)),
    db.select().from(payments).where(eq(payments.orderId, id)),
    db.select().from(refunds).where(eq(refunds.orderId, id)),
    db.select().from(shipments).where(eq(shipments.orderId, id)),
    db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, id)).orderBy(desc(orderStatusHistory.createdAt)),
    db.select().from(orderNotes).where(eq(orderNotes.orderId, id)).orderBy(desc(orderNotes.createdAt)),
    order.customerId ? db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1) : Promise.resolve([]),
  ]);

  return {
    ...order,
    items,
    addresses,
    payments: orderPayments,
    refunds: orderRefunds,
    shipments: orderShipments,
    history,
    notes,
    customer: customer[0] ?? null,
  };
}

async function recordStatus(db: Database, orderId: number, field: string, from: string | null, to: string, actorId: number | null) {
  await db.insert(orderStatusHistory).values({ orderId, field, fromValue: from, toValue: to, actorType: 'admin', actorId });
}

type StatusField = 'status' | 'paymentStatus' | 'fulfillmentStatus';
const HISTORY_FIELD: Record<StatusField, string> = {
  status: 'status',
  paymentStatus: 'payment_status',
  fulfillmentStatus: 'fulfillment_status',
};

export async function updateOrderStatus(env: Env, id: number, field: StatusField, value: string, actorId: number | null) {
  const db = getDb(env);
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  const order = rows[0];
  if (!order) throw notFound('Order not found.');

  const from = order[field];
  const set: Partial<typeof orders.$inferInsert> = { updatedAt: new Date() };
  if (field === 'status') set.status = value;
  else if (field === 'paymentStatus') {
    set.paymentStatus = value;
    if (value === 'paid') set.amountPaid = order.grandTotal;
  } else set.fulfillmentStatus = value;

  await db.update(orders).set(set).where(eq(orders.id, id));
  await recordStatus(db, id, HISTORY_FIELD[field], from, value, actorId);
  return getAdminOrder(env, id);
}

export interface FulfillInput {
  courier?: string | null;
  service?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}

export async function fulfillOrder(env: Env, id: number, input: FulfillInput, actorId: number | null) {
  const db = getDb(env);
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  const order = rows[0];
  if (!order) throw notFound('Order not found.');
  if (order.status === 'cancelled') throw badRequest('Cannot fulfill a cancelled order.');

  await db.insert(shipments).values({
    orderId: id,
    provider: 'manual',
    courier: input.courier ?? null,
    service: input.service ?? null,
    trackingNumber: input.trackingNumber ?? null,
    trackingUrl: input.trackingUrl ?? null,
    status: 'in_transit',
    shippedAt: new Date(),
  });

  await db.update(orders).set({ status: 'shipped', fulfillmentStatus: 'shipped', updatedAt: new Date() }).where(eq(orders.id, id));
  await recordStatus(db, id, 'fulfillment_status', order.fulfillmentStatus, 'shipped', actorId);
  await recordStatus(db, id, 'status', order.status, 'shipped', actorId);

  const tracking = input.trackingNumber ? `<p>Tracking: <strong>${input.trackingNumber}</strong>${input.courier ? ` (${input.courier})` : ''}</p>` : '';
  void sendEmail(env, {
    to: order.email,
    subject: `Your order ${order.orderNumber} has shipped`,
    templateKey: 'order_shipped',
    html: `<p>Good news — order <strong>${order.orderNumber}</strong> is on its way.</p>${tracking}`,
    referenceType: 'order',
    referenceId: id,
  });

  return getAdminOrder(env, id);
}

async function restockOrder(db: Database, orderId: number, orderNumber: string) {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    if (item.variantId == null) continue;
    const key = `restock-${orderId}-v${item.variantId}`;
    // Idempotent: skip if this restock already happened.
    const already = await db.select({ id: inventoryAdjustments.id }).from(inventoryAdjustments).where(eq(inventoryAdjustments.idempotencyKey, key)).limit(1);
    if (already[0]) continue;
    await db.batch([
      db.update(inventoryItems).set({ onHand: sql`${inventoryItems.onHand} + ${item.quantity}`, updatedAt: new Date() }).where(eq(inventoryItems.variantId, item.variantId)),
      db.insert(inventoryAdjustments).values({
        variantId: item.variantId,
        delta: item.quantity,
        reason: 'order_cancel',
        note: `Restock ${orderNumber}`,
        idempotencyKey: key,
        referenceType: 'order',
        referenceId: String(orderId),
      }),
    ]);
  }
}

export async function cancelOrder(env: Env, id: number, restock: boolean, actorId: number | null) {
  const db = getDb(env);
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  const order = rows[0];
  if (!order) throw notFound('Order not found.');
  if (order.status === 'cancelled') throw badRequest('Order is already cancelled.');

  if (restock) await restockOrder(db, id, order.orderNumber);

  await db.update(orders).set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() }).where(eq(orders.id, id));
  await db.update(payments).set({ status: 'voided', updatedAt: new Date() }).where(and(eq(payments.orderId, id), eq(payments.status, 'pending')));
  await recordStatus(db, id, 'status', order.status, 'cancelled', actorId);

  void sendEmail(env, {
    to: order.email,
    subject: `Order ${order.orderNumber} cancelled`,
    templateKey: 'order_cancelled',
    html: `<p>Your order <strong>${order.orderNumber}</strong> has been cancelled.${restock ? '' : ''}</p>`,
    referenceType: 'order',
    referenceId: id,
  });

  return getAdminOrder(env, id);
}

export async function refundOrder(env: Env, id: number, amount: number, reason: string | null, restock: boolean, actorId: number | null) {
  const db = getDb(env);
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  const order = rows[0];
  if (!order) throw notFound('Order not found.');
  const remaining = order.grandTotal - order.amountRefunded;
  if (amount <= 0 || amount > remaining) throw badRequest(`Refund must be between 1 and ${remaining} (minor units).`);

  const paymentRow = await db.select({ id: payments.id }).from(payments).where(eq(payments.orderId, id)).limit(1);
  await db.insert(refunds).values({ orderId: id, paymentId: paymentRow[0]?.id ?? null, amount, currency: order.currency, reason, status: 'completed', restock, actorId });

  const newRefunded = order.amountRefunded + amount;
  const fullyRefunded = newRefunded >= order.grandTotal;
  await db.update(orders).set({
    amountRefunded: newRefunded,
    paymentStatus: fullyRefunded ? 'refunded' : 'partially_refunded',
    status: fullyRefunded ? 'refunded' : order.status,
    updatedAt: new Date(),
  }).where(eq(orders.id, id));

  if (restock) await restockOrder(db, id, order.orderNumber);
  await recordStatus(db, id, 'payment_status', order.paymentStatus, fullyRefunded ? 'refunded' : 'partially_refunded', actorId);

  void sendEmail(env, {
    to: order.email,
    subject: `Refund issued for order ${order.orderNumber}`,
    templateKey: 'refund_confirmation',
    html: `<p>We've issued a refund of <strong>${formatMoney(amount, order.currency)}</strong> for order ${order.orderNumber}.</p>`,
    referenceType: 'order',
    referenceId: id,
  });

  return getAdminOrder(env, id);
}

/** Customer-safe order view for tracking (no internal notes / audit data). */
export async function getPublicOrder(env: Env, order: typeof orders.$inferSelect) {
  const db = getDb(env);
  const [items, addresses, orderShipments] = await Promise.all([
    db.select({ name: orderItems.name, variantTitle: orderItems.variantTitle, quantity: orderItems.quantity, unitPrice: orderItems.unitPrice, totalPrice: orderItems.totalPrice }).from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(orderAddresses).where(and(eq(orderAddresses.orderId, order.id), eq(orderAddresses.type, 'shipping'))),
    db.select({ courier: shipments.courier, trackingNumber: shipments.trackingNumber, trackingUrl: shipments.trackingUrl, status: shipments.status, shippedAt: shipments.shippedAt, estimatedDeliveryAt: shipments.estimatedDeliveryAt }).from(shipments).where(eq(shipments.orderId, order.id)),
  ]);

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    createdAt: order.createdAt,
    currency: order.currency,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    shippingTotal: order.shippingTotal,
    taxTotal: order.taxTotal,
    grandTotal: order.grandTotal,
    paymentMethod: order.paymentMethod,
    shippingMethodName: order.shippingMethodName,
    items,
    shippingAddress: addresses[0] ?? null,
    shipments: orderShipments,
  };
}
