import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { timestamps, money } from './_helpers';
import { customers } from './customers';
import { products, productVariants } from './catalog';

// -----------------------------------------------------------------------------
// Cart & checkout
// -----------------------------------------------------------------------------

export const carts = sqliteTable(
  'carts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    token: text('token').notNull(), // signed opaque id stored in guest cookie
    customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    currency: text('currency').notNull().default('PHP'),
    discountCode: text('discount_code'),
    status: text('status').notNull().default('active'), // active | converted | abandoned
    convertedOrderId: integer('converted_order_id'),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('idx_carts_token').on(t.token),
    index('idx_carts_customer').on(t.customerId),
  ],
);

export const cartItems = sqliteTable(
  'cart_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    cartId: integer('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    variantId: integer('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
    // Snapshot of unit price at add-time (revalidated server-side at checkout).
    unitPrice: money('unit_price'),
    ...timestamps,
  },
  (t) => [
    index('idx_cart_items_cart').on(t.cartId),
    uniqueIndex('idx_cart_items_unique').on(t.cartId, t.variantId),
  ],
);

/** A checkout captures contact info and is what powers abandoned-checkout tracking. */
export const checkouts = sqliteTable(
  'checkouts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    token: text('token').notNull(),
    cartId: integer('cart_id').references(() => carts.id, { onDelete: 'set null' }),
    customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    email: text('email'),
    phone: text('phone'),
    currency: text('currency').notNull().default('PHP'),
    // Progress + recovery.
    step: text('step').notNull().default('contact'), // contact|address|shipping|payment|review
    discountCode: text('discount_code'),
    subtotal: money('subtotal'),
    discountTotal: money('discount_total'),
    shippingTotal: money('shipping_total'),
    taxTotal: money('tax_total'),
    grandTotal: money('grand_total'),
    // Abandoned-checkout lifecycle.
    completedAt: integer('completed_at', { mode: 'timestamp' }),
    abandonedAt: integer('abandoned_at', { mode: 'timestamp' }),
    recoveredAt: integer('recovered_at', { mode: 'timestamp' }),
    recoveryEmailSentAt: integer('recovery_email_sent_at', { mode: 'timestamp' }),
    lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('idx_checkouts_token').on(t.token),
    index('idx_checkouts_abandoned').on(t.abandonedAt),
  ],
);

export const checkoutItems = sqliteTable(
  'checkout_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    checkoutId: integer('checkout_id')
      .notNull()
      .references(() => checkouts.id, { onDelete: 'cascade' }),
    productId: integer('product_id').notNull(),
    variantId: integer('variant_id').notNull(),
    name: text('name').notNull(),
    variantTitle: text('variant_title'),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: money('unit_price'),
  },
  (t) => [index('idx_checkout_items_checkout').on(t.checkoutId)],
);

// -----------------------------------------------------------------------------
// Orders
// -----------------------------------------------------------------------------

export const orders = sqliteTable(
  'orders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderNumber: text('order_number').notNull(), // server-generated, unique
    customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    email: text('email').notNull(),
    phone: text('phone'),
    currency: text('currency').notNull().default('PHP'),
    // Lifecycle statuses (see shared/constants).
    status: text('status').notNull().default('pending'),
    paymentStatus: text('payment_status').notNull().default('pending'),
    fulfillmentStatus: text('fulfillment_status').notNull().default('unfulfilled'),
    // Money (all minor units, computed server-side).
    subtotal: money('subtotal'),
    discountTotal: money('discount_total'),
    shippingTotal: money('shipping_total'),
    taxTotal: money('tax_total'),
    extraChargesTotal: money('extra_charges_total'),
    grandTotal: money('grand_total'),
    amountPaid: money('amount_paid'),
    amountRefunded: money('amount_refunded'),
    // Applied discount snapshot.
    discountCode: text('discount_code'),
    // Payment + shipping method used.
    paymentMethod: text('payment_method'), // cod | bank_transfer | gateway
    shippingMethodName: text('shipping_method_name'),
    // Notes.
    customerNote: text('customer_note'),
    internalNote: text('internal_note'),
    // Extra structured metadata (charges breakdown, source, etc.).
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
    // Idempotency for order creation (prevents duplicate submissions).
    idempotencyKey: text('idempotency_key'),
    checkoutId: integer('checkout_id'),
    placedAt: integer('placed_at', { mode: 'timestamp' }),
    cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('idx_orders_number').on(t.orderNumber),
    uniqueIndex('idx_orders_idempotency').on(t.idempotencyKey),
    index('idx_orders_customer').on(t.customerId),
    index('idx_orders_status').on(t.status),
    index('idx_orders_created').on(t.createdAt),
  ],
);

export const orderItems = sqliteTable(
  'order_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: integer('product_id'),
    variantId: integer('variant_id'),
    // Snapshot at purchase time — never joins to live product for pricing.
    name: text('name').notNull(),
    variantTitle: text('variant_title'),
    sku: text('sku'),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: money('unit_price'),
    totalPrice: money('total_price'),
    fulfilledQuantity: integer('fulfilled_quantity').notNull().default(0),
    refundedQuantity: integer('refunded_quantity').notNull().default(0),
    requiresShipping: integer('requires_shipping', { mode: 'boolean' }).notNull().default(true),
  },
  (t) => [index('idx_order_items_order').on(t.orderId)],
);

export const orderAddresses = sqliteTable(
  'order_addresses',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // shipping | billing
    firstName: text('first_name'),
    lastName: text('last_name'),
    company: text('company'),
    phone: text('phone'),
    line1: text('line1'),
    line2: text('line2'),
    city: text('city'),
    province: text('province'),
    postalCode: text('postal_code'),
    country: text('country').notNull().default('PH'),
  },
  (t) => [index('idx_order_addresses_order').on(t.orderId)],
);

export const orderStatusHistory = sqliteTable(
  'order_status_history',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    field: text('field').notNull(), // status | payment_status | fulfillment_status
    fromValue: text('from_value'),
    toValue: text('to_value').notNull(),
    note: text('note'),
    actorType: text('actor_type').notNull().default('admin'),
    actorId: integer('actor_id'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('idx_order_status_history_order').on(t.orderId)],
);

export const orderNotes = sqliteTable(
  'order_notes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    visibility: text('visibility').notNull().default('internal'), // internal | customer
    actorId: integer('actor_id'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('idx_order_notes_order').on(t.orderId)],
);

// -----------------------------------------------------------------------------
// Payments & refunds
// -----------------------------------------------------------------------------

export const payments = sqliteTable(
  'payments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // manual | cod | paymongo | stripe | ...
    method: text('method'), // cod | bank_transfer | card | ewallet
    // Provider reference / payment intent id.
    reference: text('reference'),
    amount: money('amount'),
    currency: text('currency').notNull().default('PHP'),
    status: text('status').notNull().default('pending'),
    failureReason: text('failure_reason'),
    // Raw provider metadata (never card data).
    gatewayResponse: text('gateway_response', { mode: 'json' }).$type<Record<string, unknown>>(),
    idempotencyKey: text('idempotency_key'),
    paidAt: integer('paid_at', { mode: 'timestamp' }),
    ...timestamps,
  },
  (t) => [
    index('idx_payments_order').on(t.orderId),
    index('idx_payments_reference').on(t.reference),
    uniqueIndex('idx_payments_idempotency').on(t.idempotencyKey),
  ],
);

/** Append-only log of provider events (incl. deduped webhooks). */
export const paymentEvents = sqliteTable(
  'payment_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    paymentId: integer('payment_id').references(() => payments.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    eventType: text('event_type').notNull(),
    // Provider event id — unique to dedupe repeated webhook deliveries.
    externalEventId: text('external_event_id'),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex('idx_payment_events_external').on(t.provider, t.externalEventId)],
);

export const refunds = sqliteTable(
  'refunds',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    paymentId: integer('payment_id').references(() => payments.id, { onDelete: 'set null' }),
    amount: money('amount'),
    currency: text('currency').notNull().default('PHP'),
    reason: text('reason'),
    status: text('status').notNull().default('pending'), // pending | completed | failed
    restock: integer('restock', { mode: 'boolean' }).notNull().default(true),
    reference: text('reference'),
    actorId: integer('actor_id'),
    ...timestamps,
  },
  (t) => [index('idx_refunds_order').on(t.orderId)],
);

// -----------------------------------------------------------------------------
// Shipping
// -----------------------------------------------------------------------------

export const shippingZones = sqliteTable('shipping_zones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  // Match rules: countries/regions/provinces/postal patterns.
  countries: text('countries', { mode: 'json' }).$type<string[]>(),
  provinces: text('provinces', { mode: 'json' }).$type<string[]>(),
  postalPatterns: text('postal_patterns', { mode: 'json' }).$type<string[]>(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
});

export const shippingMethods = sqliteTable(
  'shipping_methods',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    description: text('description'),
    type: text('type').notNull().default('flat_rate'),
    // flat_rate | free | local_delivery | pickup | weight_based | price_based | courier
    rate: money('rate'),
    estimatedDays: text('estimated_days'), // "2–5 business days"
    minOrder: integer('min_order'),
    maxOrder: integer('max_order'),
    minWeightGrams: integer('min_weight_grams'),
    maxWeightGrams: integer('max_weight_grams'),
    zoneId: integer('zone_id').references(() => shippingZones.id, { onDelete: 'set null' }),
    provider: text('provider').notNull().default('manual'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    displayOrder: integer('display_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('idx_shipping_methods_zone').on(t.zoneId)],
);

/** Tiered rate rows for weight/price-based methods. */
export const shippingRates = sqliteTable(
  'shipping_rates',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    methodId: integer('method_id')
      .notNull()
      .references(() => shippingMethods.id, { onDelete: 'cascade' }),
    minValue: integer('min_value').notNull().default(0), // grams or minor units
    maxValue: integer('max_value'),
    rate: money('rate'),
  },
  (t) => [index('idx_shipping_rates_method').on(t.methodId)],
);

export const shipments = sqliteTable(
  'shipments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull().default('manual'),
    courier: text('courier'),
    service: text('service'),
    trackingNumber: text('tracking_number'),
    trackingUrl: text('tracking_url'),
    labelAssetId: integer('label_asset_id'),
    status: text('status').notNull().default('pending'),
    shippedAt: integer('shipped_at', { mode: 'timestamp' }),
    estimatedDeliveryAt: integer('estimated_delivery_at', { mode: 'timestamp' }),
    deliveredAt: integer('delivered_at', { mode: 'timestamp' }),
    ...timestamps,
  },
  (t) => [
    index('idx_shipments_order').on(t.orderId),
    index('idx_shipments_tracking').on(t.trackingNumber),
  ],
);

export const shipmentEvents = sqliteTable(
  'shipment_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    shipmentId: integer('shipment_id')
      .notNull()
      .references(() => shipments.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    description: text('description'),
    location: text('location'),
    occurredAt: integer('occurred_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('idx_shipment_events_shipment').on(t.shipmentId)],
);
