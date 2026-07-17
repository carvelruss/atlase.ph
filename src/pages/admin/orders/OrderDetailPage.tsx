import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Spinner } from '@/components/feedback/Spinner';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/feedback/Toast';
import { money, formatDateTime, toMajorInput } from '@/lib/format';
import { useOrder, useUpdateOrder, useFulfillOrder, useCancelOrder, useRefundOrder } from '@/features/orders/api';
import { toMinorUnits } from '@shared/utils/money';

export function OrderDetailPage() {
  const { orderId } = useParams();
  const id = Number(orderId);
  const navigate = useNavigate();
  const toast = useToast();
  const { data: order, isLoading } = useOrder(Number.isInteger(id) ? id : null);
  const update = useUpdateOrder(id);
  const fulfill = useFulfillOrder(id);
  const cancel = useCancelOrder(id);
  const refund = useRefundOrder(id);

  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [fulfillForm, setFulfillForm] = useState({ courier: '', trackingNumber: '', trackingUrl: '' });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '', restock: true });

  if (isLoading) return <Spinner center />;
  if (!order) return <div className="at-card p-5 text-center text-body-secondary">Order not found.</div>;

  const shipping = order.addresses.find((a) => a.type === 'shipping');
  const refundable = order.grandTotal - order.amountRefunded;

  async function setStatus(field: string, value: string) {
    try {
      await update.mutateAsync({ [field]: value });
      toast.success('Order updated.');
    } catch {
      toast.error('Update failed.');
    }
  }

  async function doFulfill() {
    try {
      await fulfill.mutateAsync({ courier: fulfillForm.courier || undefined, trackingNumber: fulfillForm.trackingNumber || undefined, trackingUrl: fulfillForm.trackingUrl || undefined });
      toast.success('Order marked as shipped.');
      setFulfillOpen(false);
    } catch {
      toast.error('Could not fulfill order.');
    }
  }

  async function doCancel() {
    try {
      await cancel.mutateAsync({ restock: true });
      toast.success('Order cancelled and restocked.');
      setCancelOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed.');
    }
  }

  async function doRefund() {
    const amount = toMinorUnits(refundForm.amount);
    if (amount <= 0) {
      toast.error('Enter a refund amount.');
      return;
    }
    try {
      await refund.mutateAsync({ amount, reason: refundForm.reason || undefined, restock: refundForm.restock });
      toast.success('Refund recorded.');
      setRefundOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Refund failed.');
    }
  }

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        breadcrumbs={[{ label: 'Orders', href: '/admin/orders' }, { label: order.orderNumber }]}
        actions={
          <>
            {order.status !== 'cancelled' && order.fulfillmentStatus !== 'shipped' && (
              <button className="btn btn-sm btn-primary" onClick={() => setFulfillOpen(true)}>
                <i className="bi bi-truck me-1" /> Mark shipped
              </button>
            )}
            {refundable > 0 && order.paymentStatus !== 'pending' && (
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setRefundOpen(true)}>Refund</button>
            )}
            {order.status !== 'cancelled' && (
              <button className="btn btn-sm btn-outline-danger" onClick={() => setCancelOpen(true)}>Cancel</button>
            )}
          </>
        }
      />

      <div className="d-flex flex-wrap gap-2 mb-3">
        <StatusBadge status={order.status} />
        <StatusBadge status={order.paymentStatus} label={`Payment: ${order.paymentStatus.replace(/_/g, ' ')}`} />
        <StatusBadge status={order.fulfillmentStatus} label={`Fulfillment: ${order.fulfillmentStatus.replace(/_/g, ' ')}`} />
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="at-card p-3 p-md-4 mb-3">
            <h2 className="h6 mb-3">Items</h2>
            <table className="table align-middle mb-0">
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <div className="fw-medium">{it.name}</div>
                      {it.variantTitle && it.variantTitle !== 'Default' && <div className="small text-body-secondary">{it.variantTitle}</div>}
                      {it.sku && <div className="small text-body-secondary at-mono">{it.sku}</div>}
                    </td>
                    <td className="text-center">{money(it.unitPrice)} × {it.quantity}</td>
                    <td className="text-end at-mono">{money(it.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <hr />
            <div className="ms-auto" style={{ maxWidth: 300 }}>
              <Row label="Subtotal" value={money(order.subtotal)} />
              {order.discountTotal > 0 && <Row label={`Discount${order.discountCode ? ` (${order.discountCode})` : ''}`} value={`−${money(order.discountTotal)}`} />}
              <Row label="Shipping" value={money(order.shippingTotal)} />
              {order.taxTotal > 0 && <Row label="Tax (incl.)" value={money(order.taxTotal)} muted />}
              {order.extraChargesTotal > 0 && <Row label="Charges" value={money(order.extraChargesTotal)} />}
              <hr className="my-2" />
              <Row label="Total" value={money(order.grandTotal)} bold />
              {order.amountRefunded > 0 && <Row label="Refunded" value={`−${money(order.amountRefunded)}`} />}
            </div>
          </div>

          <div className="at-card p-3 p-md-4">
            <h2 className="h6 mb-3">Timeline</h2>
            <ul className="list-unstyled mb-0">
              {order.history.map((h) => (
                <li key={h.id} className="d-flex gap-2 py-1 small">
                  <i className="bi bi-circle-fill text-primary" style={{ fontSize: '0.5rem', marginTop: 6 }} />
                  <div>
                    <span className="fw-medium">{h.field.replace(/_/g, ' ')}</span> → {h.toValue.replace(/_/g, ' ')}
                    <span className="text-body-secondary ms-2">{formatDateTime(h.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="at-card p-3 p-md-4 mb-3">
            <h2 className="h6 mb-3">Customer</h2>
            <div className="fw-medium">{order.customer ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim() || order.email : order.email}</div>
            <div className="small text-body-secondary">{order.email}</div>
            {order.phone && <div className="small text-body-secondary">{order.phone}</div>}
            {order.customer && (
              <button className="btn btn-sm btn-link p-0 mt-1" onClick={() => navigate(`/admin/customers/${order.customer!.id}`)}>
                View profile ({order.customer.ordersCount} orders)
              </button>
            )}
          </div>

          {shipping && (
            <div className="at-card p-3 p-md-4 mb-3">
              <h2 className="h6 mb-3">Shipping address</h2>
              <address className="small mb-0">
                {shipping.firstName} {shipping.lastName}<br />
                {shipping.line1}{shipping.line2 ? `, ${shipping.line2}` : ''}<br />
                {shipping.city}{shipping.province ? `, ${shipping.province}` : ''} {shipping.postalCode}<br />
                {shipping.country}
              </address>
              {order.shippingMethodName && <div className="small text-body-secondary mt-2">via {order.shippingMethodName}</div>}
            </div>
          )}

          <div className="at-card p-3 p-md-4">
            <h2 className="h6 mb-3">Status controls</h2>
            <label className="form-label small">Payment</label>
            <select className="form-select form-select-sm mb-2" value={order.paymentStatus} onChange={(e) => setStatus('paymentStatus', e.target.value)}>
              {['pending', 'paid', 'partially_paid', 'failed', 'refunded', 'voided'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <label className="form-label small">Order status</label>
            <select className="form-select form-select-sm" value={order.status} onChange={(e) => setStatus('status', e.target.value)}>
              {['pending', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <div className="small text-body-secondary mt-2">Payment: {order.paymentMethod ?? '—'}</div>
          </div>
        </div>
      </div>

      <Modal open={fulfillOpen} onClose={() => setFulfillOpen(false)} title="Mark as shipped" footer={<><button className="btn btn-light" onClick={() => setFulfillOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={doFulfill} disabled={fulfill.isPending}>{fulfill.isPending ? 'Saving…' : 'Mark shipped'}</button></>}>
        <div className="vstack gap-3">
          <div><label className="form-label">Courier</label><input className="form-control" placeholder="J&T Express" value={fulfillForm.courier} onChange={(e) => setFulfillForm({ ...fulfillForm, courier: e.target.value })} /></div>
          <div><label className="form-label">Tracking number</label><input className="form-control" value={fulfillForm.trackingNumber} onChange={(e) => setFulfillForm({ ...fulfillForm, trackingNumber: e.target.value })} /></div>
          <div><label className="form-label">Tracking URL</label><input className="form-control" value={fulfillForm.trackingUrl} onChange={(e) => setFulfillForm({ ...fulfillForm, trackingUrl: e.target.value })} /></div>
        </div>
      </Modal>

      <Modal open={refundOpen} onClose={() => setRefundOpen(false)} title="Refund order" footer={<><button className="btn btn-light" onClick={() => setRefundOpen(false)}>Cancel</button><button className="btn btn-danger" onClick={doRefund} disabled={refund.isPending}>{refund.isPending ? 'Processing…' : 'Refund'}</button></>}>
        <div className="vstack gap-3">
          <div className="small text-body-secondary">Refundable: {money(refundable)}</div>
          <div><label className="form-label">Amount (₱)</label><input className="form-control" type="number" step="0.01" placeholder={toMajorInput(refundable)} value={refundForm.amount} onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })} /></div>
          <div><label className="form-label">Reason</label><input className="form-control" value={refundForm.reason} onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })} /></div>
          <div className="form-check"><input className="form-check-input" type="checkbox" id="restock" checked={refundForm.restock} onChange={(e) => setRefundForm({ ...refundForm, restock: e.target.checked })} /><label className="form-check-label" htmlFor="restock">Restock items</label></div>
        </div>
      </Modal>

      <ConfirmDialog open={cancelOpen} title="Cancel order?" message="This cancels the order and restocks its items. This cannot be undone." confirmLabel="Cancel order" busy={cancel.isPending} onConfirm={doCancel} onCancel={() => setCancelOpen(false)} />
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`d-flex justify-content-between ${bold ? 'fw-semibold' : ''} ${muted ? 'text-body-secondary small' : ''}`}>
      <span>{label}</span>
      <span className="at-mono">{value}</span>
    </div>
  );
}
