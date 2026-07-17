import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface ShippingMethod {
  id: number;
  name: string;
  description: string | null;
  type: string;
  rate: number;
  estimatedDays: string | null;
  minOrder: number | null;
  zoneId: number | null;
  provider: string;
  isActive: boolean;
  displayOrder: number;
}

export interface ShippingZone {
  id: number;
  name: string;
  countries: string[] | null;
  provinces: string[] | null;
  isActive: boolean;
}

export function useShippingMethods() {
  return useQuery({ queryKey: ['shipping-methods'], queryFn: () => apiFetch<{ items: ShippingMethod[] }>('/api/admin/shipping/methods') });
}

export function useSaveShippingMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: Record<string, unknown> }) =>
      apiFetch(id ? `/api/admin/shipping/methods/${id}` : '/api/admin/shipping/methods', { method: id ? 'PATCH' : 'POST', body: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['shipping-methods'] }),
  });
}

export function useDeleteShippingMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/shipping/methods/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['shipping-methods'] }),
  });
}

export function useShippingZones() {
  return useQuery({ queryKey: ['shipping-zones'], queryFn: () => apiFetch<{ items: ShippingZone[] }>('/api/admin/shipping/zones') });
}

export function useSaveShippingZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: Record<string, unknown> }) =>
      apiFetch(id ? `/api/admin/shipping/zones/${id}` : '/api/admin/shipping/zones', { method: id ? 'PATCH' : 'POST', body: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['shipping-zones'] }),
  });
}

export function useDeleteShippingZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/shipping/zones/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['shipping-zones'] }),
  });
}
