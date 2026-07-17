import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { money, formatDate } from '@/lib/format';
import { useTransactions } from '@/features/payments/api';

export function TransactionsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTransactions(page);
  const items = data?.data.items ?? [];
  const meta = data?.meta;

  return (
    <div>
      <PageHeader title="Transactions" description="All payment records across your orders." />
      <div className="at-card">
        {isLoading ? <Spinner center /> : items.length === 0 ? (
          <EmptyState icon="bi-credit-card" title="No transactions yet" />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead><tr className="small text-body-secondary"><th>Order</th><th>Customer</th><th>Provider</th><th>Method</th><th>Date</th><th>Status</th><th className="text-end">Amount</th></tr></thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id}>
                    <td><Link to={`/admin/orders/${t.orderId}`} className="fw-semibold">{t.orderNumber}</Link></td>
                    <td className="text-truncate small" style={{ maxWidth: 180 }}>{t.email}</td>
                    <td className="text-capitalize small">{t.provider}</td>
                    <td className="text-capitalize small">{t.method?.replace('_', ' ') ?? '—'}</td>
                    <td className="small text-body-secondary">{formatDate(t.createdAt)}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="text-end at-mono">{money(t.amount)}</td>
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
