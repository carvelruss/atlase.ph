import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
  imageAssetId: z.number().int().positive().nullable().optional(),
  parentId: z.number().int().positive().nullable().optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
});
export type CategoryInput = z.infer<typeof categorySchema>;

const collectionRule = z.object({
  field: z.enum(['tag', 'category', 'brand', 'price', 'inventory']),
  operator: z.enum(['equals', 'not_equals', 'gt', 'lt', 'gte', 'lte', 'contains']),
  value: z.union([z.string(), z.number()]),
});

export const collectionSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
  imageAssetId: z.number().int().positive().nullable().optional(),
  type: z.enum(['manual', 'rule_based']).default('manual'),
  rules: z.array(collectionRule).default([]),
  rulesMatch: z.enum(['all', 'any']).default('all'),
  isActive: z.boolean().default(true),
  productIds: z.array(z.number().int().positive()).default([]),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
});
export type CollectionInput = z.infer<typeof collectionSchema>;

export const inventoryAdjustSchema = z.object({
  variantId: z.number().int().positive(),
  delta: z.number().int(),
  reason: z.enum(['received', 'correction', 'damaged', 'returned', 'manual']).default('manual'),
  note: z.string().max(500).nullable().optional(),
});
export type InventoryAdjustInput = z.infer<typeof inventoryAdjustSchema>;

export const shippingMethodSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  type: z.enum(['flat_rate', 'free', 'local_delivery', 'pickup', 'weight_based', 'price_based', 'courier']).default('flat_rate'),
  rate: z.number().int().nonnegative().default(0),
  estimatedDays: z.string().max(60).nullable().optional(),
  minOrder: z.number().int().nonnegative().nullable().optional(),
  maxOrder: z.number().int().nonnegative().nullable().optional(),
  minWeightGrams: z.number().int().nonnegative().nullable().optional(),
  maxWeightGrams: z.number().int().nonnegative().nullable().optional(),
  zoneId: z.number().int().positive().nullable().optional(),
  provider: z.string().max(60).default('manual'),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});
export type ShippingMethodInput = z.infer<typeof shippingMethodSchema>;

export const shippingZoneSchema = z.object({
  name: z.string().min(1).max(120),
  countries: z.array(z.string().max(4)).default([]),
  provinces: z.array(z.string().max(80)).default([]),
  isActive: z.boolean().default(true),
});
export type ShippingZoneInput = z.infer<typeof shippingZoneSchema>;

export const customerSchema = z.object({
  email: z.string().email().max(200),
  firstName: z.string().max(80).nullable().optional(),
  lastName: z.string().max(80).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  marketingConsent: z.boolean().optional(),
  note: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().max(60)).optional(),
  status: z.enum(['active', 'disabled']).optional(),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const addressSchema = z.object({
  firstName: z.string().max(80).nullable().optional(),
  lastName: z.string().max(80).nullable().optional(),
  company: z.string().max(120).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).nullable().optional(),
  city: z.string().min(1).max(120),
  province: z.string().max(120).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  country: z.string().max(4).default('PH'),
});
export type AddressInput = z.infer<typeof addressSchema>;
