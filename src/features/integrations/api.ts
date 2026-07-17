import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface IntegrationField { key: string; label: string; secret?: boolean; placeholder?: string }
export interface Integration {
  key: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  fields: IntegrationField[];
  isConnected: boolean;
  config: Record<string, unknown>;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export function useIntegrations() {
  return useQuery({ queryKey: ['admin-integrations'], queryFn: () => apiFetch<{ items: Integration[] }>('/api/admin/integrations') });
}

export function useSaveIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, config, isConnected }: { key: string; config: Record<string, unknown>; isConnected: boolean }) =>
      apiFetch(`/api/admin/integrations/${key}`, { method: 'PUT', body: { config, isConnected } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-integrations'] }),
  });
}

export function useDisconnectIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => apiFetch(`/api/admin/integrations/${key}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-integrations'] }),
  });
}
