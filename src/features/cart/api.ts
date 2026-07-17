import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { track } from '@/features/storefront/tracker';
import type { CartView } from '@/features/catalog/types';

const CART_KEY = ['cart'] as const;

export function useCart() {
  return useQuery({
    queryKey: CART_KEY,
    queryFn: () => apiFetch<CartView>('/api/storefront/cart'),
    staleTime: 10_000,
  });
}

export function useCartCount(): number {
  const { data } = useCart();
  return data?.itemCount ?? 0;
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { variantId: number; quantity: number }) =>
      apiFetch<CartView>('/api/storefront/cart/items', { method: 'POST', body }),
    onSuccess: (data) => {
      qc.setQueryData(CART_KEY, data);
      track('add_to_cart');
    },
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      apiFetch<CartView>(`/api/storefront/cart/items/${id}`, { method: 'PATCH', body: { quantity } }),
    onSuccess: (data) => qc.setQueryData(CART_KEY, data),
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<CartView>(`/api/storefront/cart/items/${id}`, { method: 'DELETE' }),
    onSuccess: (data) => qc.setQueryData(CART_KEY, data),
  });
}
