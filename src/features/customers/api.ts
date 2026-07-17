import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchWithMeta } from '@/lib/api';

export interface CustomerListItem {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  marketingConsent: boolean;
  status: string;
}

export interface CustomerDetail extends CustomerListItem {
  note: string | null;
  tags: string[] | null;
  createdAt: string;
  lastLoginAt: string | null;
  orders: { id: number; orderNumber: string; grandTotal: number; status: string; paymentStatus: string; createdAt: string }[];
  addresses: { id: number; line1: string; city: string; province: string | null; country: string }[];
}

export interface CustomerInput {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  marketingConsent?: boolean;
  note?: string | null;
  status?: 'active' | 'disabled';
}

export function useCustomers(params: { page?: number; q?: string }) {
  return useQuery({
    queryKey: ['admin-customers', params],
    queryFn: () => apiFetchWithMeta<{ items: CustomerListItem[] }>('/api/admin/customers', { query: params }),
    placeholderData: (prev) => prev,
  });
}

export function useCustomer(id: number | null) {
  return useQuery({
    queryKey: ['admin-customer', id],
    queryFn: () => apiFetch<CustomerDetail>(`/api/admin/customers/${id}`),
    enabled: id != null,
  });
}

export function useSaveCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: CustomerInput }) =>
      apiFetch<CustomerDetail>(id ? `/api/admin/customers/${id}` : '/api/admin/customers', { method: id ? 'PATCH' : 'POST', body: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-customers'] }),
  });
}
