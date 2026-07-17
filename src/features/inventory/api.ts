import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchWithMeta } from '@/lib/api';
import type { InventoryRow } from '@/features/catalog/types';

export function useInventory(params: { page?: number; q?: string; state?: string }) {
  return useQuery({
    queryKey: ['admin-inventory', params],
    queryFn: () =>
      apiFetchWithMeta<{ items: InventoryRow[] }>('/api/admin/inventory', {
        query: { page: params.page, q: params.q, state: params.state },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useAdjustInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { variantId: number; delta: number; reason: string; note?: string }) =>
      apiFetch('/api/admin/inventory/adjust', { method: 'POST', body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-inventory'] }),
  });
}
