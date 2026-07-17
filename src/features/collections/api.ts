import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Collection } from '@/features/catalog/types';

export interface CollectionRuleInput {
  field: 'tag' | 'category' | 'brand' | 'price' | 'inventory';
  operator: 'equals' | 'not_equals' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  value: string | number;
}

export interface CollectionInput {
  name: string;
  slug?: string;
  description?: string | null;
  type: 'manual' | 'rule_based';
  rules?: CollectionRuleInput[];
  rulesMatch?: 'all' | 'any';
  isActive?: boolean;
  productIds?: number[];
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export function useCollections() {
  return useQuery({
    queryKey: ['admin-collections'],
    queryFn: () => apiFetch<{ items: Collection[] }>('/api/admin/collections'),
  });
}

export function useSaveCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: CollectionInput }) =>
      apiFetch<Collection>(id ? `/api/admin/collections/${id}` : '/api/admin/collections', {
        method: id ? 'PATCH' : 'POST',
        body: input,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-collections'] }),
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/collections/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-collections'] }),
  });
}
