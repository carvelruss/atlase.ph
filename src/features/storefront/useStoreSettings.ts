import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface StoreMenuLink {
  label: string;
  url: string | null;
}

export interface StoreSettings {
  store: {
    name: string;
    currency: string;
    supportEmail: string | null;
    phone: string | null;
  };
  theme: Record<string, unknown>;
  menus: Record<string, StoreMenuLink[]>;
}

export function useStoreSettings() {
  return useQuery({
    queryKey: ['storefront-settings'],
    queryFn: ({ signal }) => apiFetch<StoreSettings>('/api/storefront/settings', { signal }),
    staleTime: 5 * 60_000,
  });
}
