import { useQuery } from '@tanstack/react-query';
import { apiFetchWithMeta, apiFetch } from '@/lib/api';
import type { PublicProductCard, PublicProductDetail } from '@/features/catalog/types';

export interface StorefrontListParams {
  page?: number;
  sort?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  q?: string;
}

export function useStorefrontProducts(params: StorefrontListParams) {
  return useQuery({
    queryKey: ['sf-products', params],
    queryFn: () =>
      apiFetchWithMeta<{ items: PublicProductCard[] }>('/api/storefront/products', {
        query: {
          page: params.page,
          sort: params.sort,
          category: params.category,
          minPrice: params.minPrice,
          maxPrice: params.maxPrice,
          inStock: params.inStock ? 1 : undefined,
          q: params.q,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useStorefrontProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ['sf-product', slug],
    queryFn: () => apiFetch<PublicProductDetail>(`/api/storefront/products/${slug}`),
    enabled: !!slug,
  });
}

export interface CategoryResponse {
  category: { name: string; slug: string; description: string | null; seoTitle: string | null; seoDescription: string | null };
  items: PublicProductCard[];
}
export function useCategory(slug: string | undefined, page: number, sort: string) {
  return useQuery({
    queryKey: ['sf-category', slug, page, sort],
    queryFn: () => apiFetchWithMeta<CategoryResponse>(`/api/storefront/categories/${slug}`, { query: { page, sort } }),
    enabled: !!slug,
    placeholderData: (prev) => prev,
  });
}

export interface CollectionResponse {
  collection: { name: string; slug: string; description: string | null; seoTitle: string | null; seoDescription: string | null };
  items: PublicProductCard[];
}
export function useCollection(slug: string | undefined, page: number, sort: string) {
  return useQuery({
    queryKey: ['sf-collection', slug, page, sort],
    queryFn: () => apiFetchWithMeta<CollectionResponse>(`/api/storefront/collections/${slug}`, { query: { page, sort } }),
    enabled: !!slug,
    placeholderData: (prev) => prev,
  });
}

export interface HomepageResponse {
  sections: { id: number; type: string; settings: Record<string, unknown> | null }[];
  featuredCategories: { id: number; name: string; slug: string; imageUrl: string | null }[];
  featuredProducts: PublicProductCard[];
}
export function useHomepage() {
  return useQuery({
    queryKey: ['sf-homepage'],
    queryFn: () => apiFetch<HomepageResponse>('/api/storefront/homepage'),
    staleTime: 60_000,
  });
}
