import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { money, formatDate } from '@/lib/format';
import { useRefunds } from '@/features/payments/api';

export function RefundsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useRefunds(page);
  const items = data?.data.items ?? [];
  const meta = data?.meta;

  return (
    <div>
      <PageHeader title="Refunds" description="Refunds issued against orders." />
      <div className="at-card">
        {isLoading ? <Spinner center /> : items.length === 0 ? (
          <EmptyState icon="bi-arrow-counterclockwise" title="No refunds yet" />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead><tr className="small text-body-secondary"><th>Order</th><th>Reason</th><th>Date</th><th>Status</th><th className="text-end">Amount</th></tr></thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td><Link to={`/admin/orders/${r.orderId}`} className="fw-semibold">{r.orderNumber}</Link></td>
                    <td className="small">{r.reason ?? '—'}</td>
                    <td className="small text-body-secondary">{formatDate(r.createdAt)}</td>
                    <td><StatusBadge status={r.status === 'completed' ? 'success' : r.status} label={r.status} /></td>
                    <td className="text-end at-mono">{money(r.amount)}</td>
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
