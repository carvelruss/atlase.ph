import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface HomepageSection {
  id?: number;
  type: string;
  isEnabled: boolean;
  settings: Record<string, unknown>;
}

export function useHomepageSections() {
  return useQuery({ queryKey: ['admin-homepage'], queryFn: () => apiFetch<{ sections: HomepageSection[] }>('/api/admin/appearance/homepage') });
}

export function useSaveHomepage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sections: HomepageSection[]) => apiFetch<{ sections: HomepageSection[] }>('/api/admin/appearance/homepage', { method: 'POST', body: { sections } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-homepage'] });
      void qc.invalidateQueries({ queryKey: ['sf-homepage'] });
    },
  });
}

export function useTheme() {
  return useQuery({ queryKey: ['admin-theme'], queryFn: () => apiFetch<{ theme: Record<string, unknown> }>('/api/admin/appearance/theme') });
}

export function useSaveTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch('/api/admin/appearance/theme', { method: 'POST', body: { data } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-theme'] });
      void qc.invalidateQueries({ queryKey: ['storefront-settings'] });
    },
  });
}
