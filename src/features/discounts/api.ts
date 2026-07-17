import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchWithMeta } from '@/lib/api';

export interface Discount {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  type: string;
  value: number;
  isAutomatic: boolean;
  minPurchase: number | null;
  minQuantity: number | null;
  firstOrderOnly: boolean;
  appliesTo: string;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  usageCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

export interface DiscountInput {
  name: string;
  code?: string | null;
  description?: string | null;
  type: string;
  value: number;
  isAutomatic?: boolean;
  minPurchase?: number | null;
  minQuantity?: number | null;
  firstOrderOnly?: boolean;
  appliesTo?: string;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
}

export function useDiscounts(params: { page?: number; q?: string }) {
  return useQuery({
    queryKey: ['admin-discounts', params],
    queryFn: () => apiFetchWithMeta<{ items: Discount[] }>('/api/admin/marketing/discounts', { query: params }),
    placeholderData: (prev) => prev,
  });
}

export function useDiscount(id: number | null) {
  return useQuery({
    queryKey: ['admin-discount', id],
    queryFn: () => apiFetch<Discount>(`/api/admin/marketing/discounts/${id}`),
    enabled: id != null,
  });
}

export function useSaveDiscount(id: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DiscountInput) =>
      apiFetch<Discount>(id ? `/api/admin/marketing/discounts/${id}` : '/api/admin/marketing/discounts', { method: id ? 'PATCH' : 'POST', body: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-discounts'] }),
  });
}

export function useDeleteDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/marketing/discounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-discounts'] }),
  });
}
