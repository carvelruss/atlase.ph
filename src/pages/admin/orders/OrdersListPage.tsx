import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Pagination } from '@/components/common/Pagination';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { money, formatDate } from '@/lib/format';
import { useOrders } from '@/features/orders/api';
import { ORDER_STATUSES } from '@shared/constants/index';

export function OrdersListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [rawSearch, setRawSearch] = useState('');
  const search = useDebouncedValue(rawSearch);
  const [status, setStatus] = useState('');

  const { data, isLoading, isError } = useOrders({ page, q: search || undefined, status: status || undefined });
  const items = data?.data.items ?? [];
  const meta = data?.meta;

  return (
    <div>
      <PageHeader title="Orders" description="Review and process customer orders." />

      <div className="at-card p-3 mb-3">
        <div className="row g-2">
          <div className="col-12 col-md">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-transparent"><i className="bi bi-search" /></span>
              <input className="form-control" placeholder="Search order #, email, phone…" value={rawSearch} onChange={(e) => { setRawSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
          <div className="col-auto">
            <select className="form-select form-select-sm" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="at-card">
        {isLoading ? (
          <Spinner center />
        ) : isError ? (
          <EmptyState icon="bi-exclamation-triangle" title="Couldn't load orders" />
        ) : items.length === 0 ? (
          <EmptyState icon="bi-bag" title="No orders yet" description="Orders will appear here as customers check out." />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr className="small text-body-secondary">
                  <th>Order</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th className="text-center">Items</th>
                  <th>Payment</th>
                  <th>Fulfillment</th>
                  <th>Status</th>
                  <th className="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/orders/${o.id}`)}>
                    <td className="fw-semibold text-primary">{o.orderNumber}</td>
                    <td className="small text-body-secondary">{formatDate(o.createdAt)}</td>
                    <td className="text-truncate" style={{ maxWidth: 180 }}>{o.email}</td>
                    <td className="text-center">{o.itemCount}</td>
                    <td><StatusBadge status={o.paymentStatus} /></td>
                    <td><StatusBadge status={o.fulfillmentStatus} /></td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="text-end at-mono">{money(o.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta && (
          <div className="p-3 border-top">
            <Pagination page={page} totalPages={meta.totalPages ?? 1} total={meta.total} onPage={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
