import { useQuery } from '@tanstack/react-query';
import { apiFetchWithMeta } from '@/lib/api';

export interface Transaction {
  id: number;
  orderId: number;
  orderNumber: string;
  email: string;
  provider: string;
  method: string | null;
  reference: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}
export interface RefundRow {
  id: number;
  orderId: number;
  orderNumber: string;
  amount: number;
  currency: string;
  reason: string | null;
  status: string;
  createdAt: string;
}

export function useTransactions(page: number) {
  return useQuery({ queryKey: ['payments-transactions', page], queryFn: () => apiFetchWithMeta<{ items: Transaction[] }>('/api/admin/payments/transactions', { query: { page } }), placeholderData: (p) => p });
}
export function useRefunds(page: number) {
  return useQuery({ queryKey: ['payments-refunds', page], queryFn: () => apiFetchWithMeta<{ items: RefundRow[] }>('/api/admin/payments/refunds', { query: { page } }), placeholderData: (p) => p });
}
