import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Category } from '@/features/catalog/types';

export interface CategoryInput {
  name: string;
  slug?: string;
  description?: string | null;
  parentId?: number | null;
  displayOrder?: number;
  isActive?: boolean;
  imageAssetId?: number | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export function useCategories() {
  return useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => apiFetch<{ items: Category[] }>('/api/admin/categories'),
  });
}

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: CategoryInput }) =>
      apiFetch<Category>(id ? `/api/admin/categories/${id}` : '/api/admin/categories', {
        method: id ? 'PATCH' : 'POST',
        body: input,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-categories'] }),
  });
}
