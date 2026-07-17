import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, setCsrfToken } from '@/lib/api';

export interface CustomerUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface CustomerSession {
  authenticated: boolean;
  customer?: CustomerUser;
  csrfToken?: string;
}

export const CUSTOMER_SESSION_KEY = ['customer-session'] as const;

export function useCustomerSession() {
  return useQuery({
    queryKey: CUSTOMER_SESSION_KEY,
    queryFn: async () => {
      const data = await apiFetch<CustomerSession>('/api/auth/customer/session');
      if (data.authenticated && data.csrfToken) setCsrfToken(data.csrfToken);
      return data;
    },
    staleTime: 60_000,
  });
}

export function useCustomerLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      apiFetch<{ customer: CustomerUser; csrfToken: string }>('/api/auth/customer/login', { method: 'POST', body }),
    onSuccess: (data) => {
      setCsrfToken(data.csrfToken);
      void qc.invalidateQueries({ queryKey: CUSTOMER_SESSION_KEY });
    },
  });
}

export function useCustomerRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string; firstName?: string; lastName?: string; phone?: string; marketingConsent?: boolean }) =>
      apiFetch<{ customer: CustomerUser; csrfToken: string }>('/api/auth/customer/register', { method: 'POST', body }),
    onSuccess: (data) => {
      setCsrfToken(data.csrfToken);
      void qc.invalidateQueries({ queryKey: CUSTOMER_SESSION_KEY });
    },
  });
}

export function useCustomerLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch('/api/auth/customer/logout', { method: 'POST', body: {} }),
    onSuccess: () => {
      setCsrfToken(null);
      void qc.invalidateQueries({ queryKey: CUSTOMER_SESSION_KEY });
    },
  });
}

export interface AccountOrder {
  id: number;
  orderNumber: string;
  grandTotal: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
}

export function useAccountOrders(enabled: boolean) {
  return useQuery({
    queryKey: ['account-orders'],
    queryFn: () => apiFetch<{ items: AccountOrder[] }>('/api/account/orders'),
    enabled,
  });
}
