import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export function useSettingsGroup(group: string) {
  return useQuery({
    queryKey: ['admin-settings', group],
    queryFn: () => apiFetch<{ group: string; data: Record<string, unknown> }>(`/api/admin/settings/${group}`),
  });
}

export function useSaveSettingsGroup(group: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch(`/api/admin/settings/${group}`, { method: 'POST', body: { data } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-settings', group] });
      void qc.invalidateQueries({ queryKey: ['storefront-settings'] });
    },
  });
}
