import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchWithMeta } from '@/lib/api';

export interface OrderListItem {
  id: number;
  orderNumber: string;
  email: string;
  customerFirstName: string | null;
  customerLastName: string | null;
  createdAt: string;
  grandTotal: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  fulfillmentStatus: string;
  shippingMethodName: string | null;
  itemCount: number;
}

export interface OrderDetail {
  id: number;
  orderNumber: string;
  email: string;
  phone: string | null;
  currency: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  extraChargesTotal: number;
  grandTotal: number;
  amountPaid: number;
  amountRefunded: number;
  discountCode: string | null;
  paymentMethod: string | null;
  shippingMethodName: string | null;
  customerNote: string | null;
  internalNote: string | null;
  createdAt: string;
  items: { id: number; productId: number | null; name: string; variantTitle: string | null; sku: string | null; quantity: number; unitPrice: number; totalPrice: number; imageUrl: string | null }[];
  addresses: { type: string; firstName: string | null; lastName: string | null; phone: string | null; line1: string | null; line2: string | null; city: string | null; province: string | null; postalCode: string | null; country: string }[];
  payments: { id: number; provider: string; method: string | null; amount: number; status: string }[];
  refunds: { id: number; amount: number; reason: string | null; status: string; createdAt: string }[];
  shipments: { id: number; courier: string | null; trackingNumber: string | null; trackingUrl: string | null; status: string; shippedAt: string | null }[];
  history: { id: number; field: string; fromValue: string | null; toValue: string; actorType: string; createdAt: string }[];
  notes: { id: number; body: string; visibility: string; createdAt: string }[];
  customer: { id: number; email: string; firstName: string | null; lastName: string | null; ordersCount: number; totalSpent: number } | null;
}

export function useOrders(params: {
  page?: number;
  q?: string;
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  range?: string;
}) {
  return useQuery({
    queryKey: ['admin-orders', params],
    queryFn: () =>
      apiFetchWithMeta<{ items: OrderListItem[]; statusCounts: Record<string, number> }>('/api/admin/orders', {
        query: params,
      }),
    placeholderData: (prev) => prev,
  });
}

export function useOrder(id: number | null) {
  return useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => apiFetch<OrderDetail>(`/api/admin/orders/${id}`),
    enabled: id != null,
  });
}

function useOrderMutation<T>(id: number, path: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: T) => apiFetch<OrderDetail>(path, { method: 'POST', body: body as Record<string, unknown> }),
    onSuccess: (data) => {
      qc.setQueryData(['admin-order', id], data);
      void qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}

export function useUpdateOrder(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch<OrderDetail>(`/api/admin/orders/${id}`, { method: 'PATCH', body }),
    onSuccess: (data) => {
      qc.setQueryData(['admin-order', id], data);
      void qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}

export function useFulfillOrder(id: number) {
  return useOrderMutation<{ courier?: string; service?: string; trackingNumber?: string; trackingUrl?: string }>(id, `/api/admin/orders/${id}/fulfill`);
}
export function useCancelOrder(id: number) {
  return useOrderMutation<{ restock: boolean }>(id, `/api/admin/orders/${id}/cancel`);
}
export function useRefundOrder(id: number) {
  return useOrderMutation<{ amount: number; reason?: string; restock: boolean }>(id, `/api/admin/orders/${id}/refund`);
}
