import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchWithMeta, getCsrfToken } from '@/lib/api';
import type { AdminProductDetail, AdminProductListItem, ProductInput } from '@/features/catalog/types';

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  categoryId?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: ['admin-products', params],
    queryFn: () =>
      apiFetchWithMeta<{ items: AdminProductListItem[] }>('/api/admin/products', {
        query: {
          page: params.page,
          pageSize: params.pageSize,
          q: params.q,
          status: params.status,
          categoryId: params.categoryId,
          sort: params.sort,
          order: params.order,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useProduct(id: number | null) {
  return useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => apiFetch<AdminProductDetail>(`/api/admin/products/${id}`),
    enabled: id != null,
  });
}

export function useSaveProduct(id: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductInput) =>
      apiFetch<AdminProductDetail>(id ? `/api/admin/products/${id}` : '/api/admin/products', {
        method: id ? 'PATCH' : 'POST',
        body: input,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-products'] });
      if (id) void qc.invalidateQueries({ queryKey: ['admin-product', id] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-products'] }),
  });
}

export function useBulkProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids: number[]; action: string; categoryId?: number }) =>
      apiFetch('/api/admin/products/bulk', { method: 'POST', body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-products'] }),
  });
}

export interface UploadedAsset {
  id: number;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

/** Upload an image via multipart form-data (bypasses the JSON api helper). */
export async function uploadImage(
  file: File,
  folder: string,
  opts: { entityId?: number; altText?: string } = {},
): Promise<UploadedAsset> {
  const form = new FormData();
  form.set('file', file);
  form.set('folder', folder);
  if (opts.entityId) form.set('entityId', String(opts.entityId));
  if (opts.altText) form.set('altText', opts.altText);

  const dims = await readImageDimensions(file);
  if (dims) {
    form.set('width', String(dims.width));
    form.set('height', String(dims.height));
  }

  const csrf = getCsrfToken();
  const res = await fetch('/api/admin/uploads', {
    method: 'POST',
    body: form,
    credentials: 'same-origin',
    headers: csrf ? { 'x-csrf-token': csrf } : undefined,
  });
  const json = (await res.json()) as { success: boolean; data: UploadedAsset; error: { message: string } | null };
  if (!json.success) throw new Error(json.error?.message ?? 'Upload failed.');
  return json.data;
}

function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
