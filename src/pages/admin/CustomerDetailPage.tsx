import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { StatCard } from '@/components/common/StatCard';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { money, formatDate } from '@/lib/format';
import { useCustomer } from '@/features/customers/api';

export function CustomerDetailPage() {
  const { customerId } = useParams();
  const id = Number(customerId);
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(Number.isInteger(id) ? id : null);

  if (isLoading) return <Spinner center />;
  if (!customer) return <div className="at-card p-5 text-center text-body-secondary">Customer not found.</div>;

  const name = `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email;
  const aov = customer.ordersCount > 0 ? Math.round(customer.totalSpent / customer.ordersCount) : 0;

  return (
    <div>
      <PageHeader title={name} breadcrumbs={[{ label: 'Customers', href: '/admin/customers' }, { label: name }]} />

      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3"><StatCard label="Orders" value={String(customer.ordersCount)} icon="bi-bag" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Total spent" value={money(customer.totalSpent)} icon="bi-cash-stack" tone="success" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Avg. order" value={money(aov)} icon="bi-graph-up" tone="info" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Last order" value={customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '—'} icon="bi-clock-history" tone="warning" /></div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="at-card p-3 p-md-4">
            <h2 className="h6 mb-3">Order history</h2>
            {customer.orders.length === 0 ? (
              <EmptyState compact icon="bi-bag" title="No orders yet" />
            ) : (
              <table className="table align-middle mb-0">
                <tbody>
                  {customer.orders.map((o) => (
                    <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/orders/${o.id}`)}>
                      <td className="fw-semibold text-primary">{o.orderNumber}</td>
                      <td className="small text-body-secondary">{formatDate(o.createdAt)}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="text-end at-mono">{money(o.grandTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="at-card p-3 p-md-4 mb-3">
            <h2 className="h6 mb-3">Contact</h2>
            <div className="fw-medium">{name}</div>
            <div className="small text-body-secondary">{customer.email}</div>
            {customer.phone && <div className="small text-body-secondary">{customer.phone}</div>}
            <div className="mt-2"><StatusBadge status={customer.status === 'active' ? 'active' : 'archived'} label={customer.status === 'active' ? 'Active' : 'Disabled'} /></div>
            <div className="small text-body-secondary mt-2">Marketing: {customer.marketingConsent ? 'Subscribed' : 'Not subscribed'}</div>
            <div className="small text-body-secondary">Joined {formatDate(customer.createdAt)}</div>
          </div>

          {customer.note && (
            <div className="at-card p-3 p-md-4">
              <h2 className="h6 mb-2">Notes</h2>
              <p className="small mb-0">{customer.note}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <Link to="/admin/customers" className="btn btn-sm btn-link">← Back to customers</Link>
      </div>
    </div>
  );
}
