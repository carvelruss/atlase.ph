import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetchWithMeta } from '@/lib/api';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDateTime } from '@/lib/format';

interface NotificationLog {
  id: number;
  templateKey: string | null;
  channel: string;
  recipient: string;
  subject: string | null;
  status: string;
  error: string | null;
  createdAt: string;
}

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['notifications', page], queryFn: () => apiFetchWithMeta<{ items: NotificationLog[] }>('/api/admin/notifications', { query: { page } }), placeholderData: (p) => p });
  const items = data?.data.items ?? [];
  const meta = data?.meta;

  return (
    <div>
      <PageHeader title="Notifications" description="Delivery log for transactional emails and messages." />
      <div className="at-card">
        {isLoading ? <Spinner center /> : items.length === 0 ? (
          <EmptyState icon="bi-envelope" title="No notifications sent yet" description="Emails appear here as orders are placed and updated." />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead><tr className="small text-body-secondary"><th>Recipient</th><th>Subject</th><th>Template</th><th>Status</th><th>When</th></tr></thead>
              <tbody>
                {items.map((n) => (
                  <tr key={n.id}>
                    <td className="small">{n.recipient}</td>
                    <td className="small text-truncate" style={{ maxWidth: 240 }}>{n.subject ?? '—'}</td>
                    <td className="small text-body-secondary at-mono">{n.templateKey ?? '—'}</td>
                    <td><StatusBadge status={n.status === 'sent' ? 'success' : n.status === 'failed' ? 'failed' : 'pending'} label={n.status} /></td>
                    <td className="small text-body-secondary">{formatDateTime(n.createdAt)}</td>
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
