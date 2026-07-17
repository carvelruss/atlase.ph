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
