import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { StatusBadge } from '@/components/common/StatusBadge';
import { money, formatDate } from '@/lib/format';

interface TrackedOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  grandTotal: number;
  paymentMethod: string | null;
  shippingMethodName: string | null;
  items: { name: string; variantTitle: string | null; quantity: number; totalPrice: number }[];
  shipments: { courier: string | null; trackingNumber: string | null; trackingUrl: string | null; status: string }[];
}

export function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<TrackedOrder>('/api/storefront/track-order', { method: 'POST', body: { orderNumber, email } });
      setOrder(res);
    } catch (err) {
      setOrder(null);
      setError(err instanceof ApiError ? err.message : 'Could not find that order.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-4 py-lg-5" style={{ maxWidth: 680 }}>
      <h1 className="h3 mb-3">Track your order</h1>
      <p className="text-body-secondary">Enter your order number and the email used at checkout.</p>

      <form onSubmit={onSubmit} className="at-card p-4 mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-md-5">
            <label className="form-label">Order number</label>
            <input className="form-control" placeholder="ATL-1001" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} required />
          </div>
          <div className="col-md-5">
            <label className="form-label">Email</label>
            <input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="col-md-2">
            <button className="btn btn-primary w-100" disabled={loading}>
              {loading ? '…' : 'Track'}
            </button>
          </div>
        </div>
        {error && <div className="alert alert-warning py-2 small mt-3 mb-0">{error}</div>}
      </form>

      {order && (
        <div className="at-card p-4">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h2 className="h5 mb-1">{order.orderNumber}</h2>
              <div className="small text-body-secondary">Placed {formatDate(order.createdAt)}</div>
            </div>
            <StatusBadge status={order.status} />
          </div>

          <div className="d-flex flex-wrap gap-2 mb-3">
            <StatusBadge status={order.paymentStatus} label={`Payment: ${order.paymentStatus.replace('_', ' ')}`} />
            <StatusBadge status={order.fulfillmentStatus} label={`Fulfillment: ${order.fulfillmentStatus.replace('_', ' ')}`} />
          </div>

          {order.shipments.length > 0 && order.shipments[0]?.trackingNumber && (
            <div className="alert alert-info py-2 small">
              <i className="bi bi-truck me-2" />
              {order.shipments[0].courier ?? 'Courier'} — Tracking: <strong>{order.shipments[0].trackingNumber}</strong>
              {order.shipments[0].trackingUrl && (
                <a href={order.shipments[0].trackingUrl} target="_blank" rel="noreferrer" className="ms-2">
                  Track shipment
                </a>
              )}
            </div>
          )}

          <table className="table table-sm">
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i}>
                  <td>
                    {item.name} {item.variantTitle && item.variantTitle !== 'Default' && <span className="text-body-secondary">({item.variantTitle})</span>} × {item.quantity}
                  </td>
                  <td className="text-end at-mono">{money(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th>Total</th>
                <th className="text-end at-mono">{money(order.grandTotal)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
