// Shared catalog types used by admin + storefront features.

export interface AdminProductListItem {
  id: number;
  name: string;
  slug: string;
  status: string;
  price: number;
  isFeatured: boolean;
  updatedAt: string;
  thumbnailUrl: string | null;
  inventory: number;
}

export interface ProductImageInput {
  assetId: number;
  altText?: string | null;
  url?: string; // client-side only, for preview
}

export interface ProductOptionInput {
  name: string;
  values: string[];
}

export interface ProductVariantInput {
  id?: number;
  optionSelections: string[];
  sku?: string | null;
  barcode?: string | null;
  price?: number | null;
  compareAtPrice?: number | null;
  costPerItem?: number | null;
  weightGrams?: number | null;
  imageAssetId?: number | null;
  isActive: boolean;
  inventoryQuantity: number;
}

export interface ProductInput {
  name: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  status: 'draft' | 'active' | 'archived';
  price: number;
  compareAtPrice?: number | null;
  costPerItem?: number | null;
  taxable: boolean;
  sku?: string | null;
  barcode?: string | null;
  trackInventory: boolean;
  continueSellingWhenOutOfStock: boolean;
  lowStockThreshold: number;
  requiresShipping: boolean;
  weightGrams?: number | null;
  brand?: string | null;
  tags: string[];
  isFeatured: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  featuredImageAssetId?: number | null;
  categoryIds: number[];
  collectionIds: number[];
  images: ProductImageInput[];
  options: ProductOptionInput[];
  variants: ProductVariantInput[];
}

/** Raw product detail as returned by GET /api/admin/products/:id (DB-shaped). */
export interface AdminProductDetail {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  price: number;
  compareAtPrice: number | null;
  costPerItem: number | null;
  taxable: boolean;
  sku: string | null;
  barcode: string | null;
  trackInventory: boolean;
  continueSellingWhenOutOfStock: boolean;
  lowStockThreshold: number;
  requiresShipping: boolean;
  weightGrams: number | null;
  brand: string | null;
  tags: string[] | null;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  featuredImageAssetId: number | null;
  categoryIds: number[];
  collectionIds: number[];
  images: { id: number; assetId: number; altText: string | null; url: string | null; position: number }[];
  options: { id: number; name: string; values: { id: number; value: string; position: number }[] }[];
  variants: {
    id: number;
    title: string;
    sku: string | null;
    price: number | null;
    compareAtPrice: number | null;
    isActive: boolean;
    inventoryQuantity: number;
    optionValueIds: number[];
  }[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  displayOrder: number;
  isActive: boolean;
  imageAssetId: number | null;
  productCount?: number;
}

export interface Collection {
  id: number;
  name: string;
  slug: string;
  type: 'manual' | 'rule_based';
  isActive: boolean;
  imageAssetId: number | null;
  productCount?: number;
}

export interface InventoryRow {
  variantId: number;
  productId: number;
  productName: string;
  variantTitle: string;
  sku: string | null;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  tracked: boolean;
  state: 'in_stock' | 'low_stock' | 'out_of_stock' | 'not_tracked';
}

// --- Storefront ---
export interface PublicProductCard {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  isFeatured: boolean;
  ratingAverage: number;
  ratingCount: number;
  thumbnailUrl: string | null;
  inStock: boolean;
}

export interface PublicProductDetail {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  requiresShipping: boolean;
  brand: string | null;
  tags: string[];
  ratingAverage: number;
  ratingCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  images: { url: string; altText: string | null }[];
  options: { id: number; name: string; values: { id: number; value: string }[] }[];
  variants: {
    id: number;
    title: string;
    optionValueIds: number[];
    price: number;
    compareAtPrice: number | null;
    sku: string | null;
    available: boolean;
    quantityAvailable: number;
  }[];
  inStock: boolean;
  related: PublicProductCard[];
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
  id: number | null;
  currency: string;
  items: CartLine[];
  subtotal: number;
  itemCount: number;
}
