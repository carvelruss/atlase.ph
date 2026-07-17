import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetchWithMeta } from '@/lib/api';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatDateTime } from '@/lib/format';

interface AuditLog {
  id: number;
  actorType: string;
  actorId: number | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
}

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [rawSearch, setRawSearch] = useState('');
  const search = useDebouncedValue(rawSearch);
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, search],
    queryFn: () => apiFetchWithMeta<{ items: AuditLog[] }>('/api/admin/audit-logs', { query: { page, q: search || undefined } }),
    placeholderData: (p) => p,
  });
  const items = data?.data.items ?? [];
  const meta = data?.meta;

  return (
    <div>
      <PageHeader title="Audit log" description="A record of important administrator actions." />
      <div className="at-card p-3 mb-3">
        <div className="input-group input-group-sm" style={{ maxWidth: 360 }}>
          <span className="input-group-text bg-transparent"><i className="bi bi-search" /></span>
          <input className="form-control" placeholder="Filter by action…" value={rawSearch} onChange={(e) => { setRawSearch(e.target.value); setPage(1); }} />
        </div>
      </div>
      <div className="at-card">
        {isLoading ? <Spinner center /> : items.length === 0 ? (
          <EmptyState icon="bi-clipboard-check" title="No audit entries" />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead><tr className="small text-body-secondary"><th>Action</th><th>Entity</th><th>Actor</th><th>IP</th><th>When</th></tr></thead>
              <tbody>
                {items.map((l) => (
                  <tr key={l.id}>
                    <td className="at-mono small">{l.action}</td>
                    <td className="small text-body-secondary">{l.entityType}{l.entityId ? ` #${l.entityId}` : ''}</td>
                    <td className="small">{l.actorType}{l.actorId ? ` #${l.actorId}` : ''}</td>
                    <td className="small text-body-secondary">{l.ip ?? '—'}</td>
                    <td className="small text-body-secondary">{formatDateTime(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta && <div className="p-3 border-top"><Pagination page={page} totalPages={meta.totalPages ?? 1} total={meta.total} onPage={setPage} /></div>}
      </div>
    </div>
  );
}
