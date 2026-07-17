// =============================================================================
// Shared enums and constants. Single source of truth for statuses used across
// the D1 schema, Pages Functions, and the React app. SQLite does not enforce
// enums, so these `as const` tuples are the authority (validated with Zod).
// =============================================================================

export const ORDER_STATUSES = [
  'draft',
  'pending',
  'confirmed',
  'processing',
  'ready_to_ship',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
  'partially_refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'pending',
  'authorized',
  'paid',
  'partially_paid',
  'failed',
  'refunded',
  'partially_refunded',
  'voided',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FULFILLMENT_STATUSES = [
  'unfulfilled',
  'partially_fulfilled',
  'fulfilled',
  'shipped',
  'delivered',
  'returned',
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export const PRODUCT_STATUSES = ['draft', 'active', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const INVENTORY_STATES = ['in_stock', 'low_stock', 'out_of_stock', 'not_tracked'] as const;
export type InventoryState = (typeof INVENTORY_STATES)[number];

export const DISCOUNT_TYPES = [
  'percentage',
  'fixed_amount',
  'buy_x_get_y',
  'free_product',
  'free_shipping',
] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const SHIPMENT_STATUSES = [
  'pending',
  'label_created',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed',
  'returned',
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'hidden'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const CONTENT_STATUSES = ['draft', 'published', 'scheduled', 'archived'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const PAYMENT_METHODS = ['cod', 'bank_transfer', 'gateway'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ADDRESS_TYPES = ['shipping', 'billing'] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];

// --- Locale / currency defaults (Philippines) --------------------------------
export const DEFAULT_CURRENCY = 'PHP';
export const DEFAULT_LOCALE = 'en-PH';
export const CURRENCY_MINOR_UNITS = 2; // centavos

// --- API error codes ----------------------------------------------------------
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  CSRF_INVALID: 'CSRF_INVALID',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INTERNAL: 'INTERNAL',
  SETUP_REQUIRED: 'SETUP_REQUIRED',
  SETUP_COMPLETE: 'SETUP_COMPLETE',
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
