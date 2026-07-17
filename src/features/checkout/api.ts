import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface ShippingOption {
  id: number;
  name: string;
  description: string | null;
  rate: number;
  estimatedDays: string | null;
  type: string;
}

export interface AddressForm {
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country: string;
}

export interface CompleteInput {
  email: string;
  phone?: string;
  shipping: AddressForm;
  billingSameAsShipping: boolean;
  billing?: AddressForm | null;
  shippingMethodId: number;
  paymentMethod: 'cod' | 'bank_transfer';
  discountCode?: string | null;
  customerNote?: string | null;
  marketingConsent?: boolean;
  termsAccepted?: boolean;
  idempotencyKey: string;
}

export interface CompleteResult {
  orderId: number;
  orderNumber: string;
  grandTotal: number;
  email: string;
}

export function useShippingRates() {
  return useMutation({
    mutationFn: (body: { country: string; province?: string | null }) =>
      apiFetch<{ options: ShippingOption[] }>('/api/storefront/checkout/shipping-rates', { method: 'POST', body }),
  });
}

export interface DiscountResult {
  discountId: number;
  code: string;
  amount: number;
  freeShipping: boolean;
}

export function useApplyDiscount() {
  return useMutation({
    mutationFn: (code: string) =>
      apiFetch<DiscountResult>('/api/storefront/checkout/apply-discount', { method: 'POST', body: { code } }),
  });
}

export function useCompleteCheckout() {
  return useMutation({
    mutationFn: (body: CompleteInput) =>
      apiFetch<CompleteResult>('/api/storefront/checkout/complete', { method: 'POST', body }),
  });
}
