import { useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Spinner } from '@/components/feedback/Spinner';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/feedback/Toast';
import { moneyShort, toMajorInput } from '@/lib/format';
import { useOrder, useUpdateOrder, useFulfillOrder, useCancelOrder, useRefundOrder, type OrderDetail } from '@/features/orders/api';
import { OrderStatusPill, PaymentPill, customerName } from '@/features/orders/orderDisplay';
import { useAdminHeading, type AdminHeading } from '@/layouts/adminHeading';
import { toMinorUnits } from '@shared/utils/money';
import styles from './OrderDetailPage.module.scss';

const COUNTRY_NAMES: Record<string, string> = { PH: 'Philippines', US: 'United States', SG: 'Singapore' };
const countryName = (code: string) => COUNTRY_NAMES[code] ?? code;

function paymentMethodLabel(method: string | null): string {
  const m = (method ?? '').toLowerCase();
  if (m.includes('cod') || m.includes('cash')) return 'Cash on Delivery';
  if (!m || m === 'gateway' || m === 'manual') return 'Prepaid';
  return method as string;
}

function activityLabel(field: string, toValue: string): string {
  if (field === 'status') {
    return (
      {
        confirmed: 'Order accepted',
        processing: 'Order processing',
        ready_to_ship: 'Order ready to ship',
        shipped: 'Order shipped',
        delivered: 'Order delivered',
        cancelled: 'Order cancelled',
        refunded: 'Order refunded',
        pending: 'Order placed',
      } as Record<string, string>
    )[toValue] ?? `Order ${toValue.replace(/_/g, ' ')}`;
  }
  if (field === 'payment_status') {
    return ({ paid: 'Payment received', refunded: 'Payment refunded', failed: 'Payment failed' } as Record<string, string>)[toValue] ?? `Payment ${toValue.replace(/_/g, ' ')}`;
  }
  if (field === 'fulfillment_status') return `Fulfillment ${toValue.replace(/_/g, ' ')}`;
  return field.replace(/_/g, ' ');
}

const actorSub = (actorType: string) =>
  ({ system: 'Automated', admin: 'By staff', customer: 'By customer' } as Record<string, string>)[actorType] ?? 'Automated';

function buildActivity(order: OrderDetail) {
  const events = [
    ...order.history.map((h) => ({ id: `h${h.id}`, label: activityLabel(h.field, h.toValue), sub: actorSub(h.actorType), at: h.createdAt })),
    ...order.notes.map((n) => ({ id: `n${n.id}`, label: 'Note added', sub: n.body, at: n.createdAt })),
    { id: 'received', label: 'Order received', sub: 'Via online store', at: order.createdAt },
  ];
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function OrderDetailPage() {
  const { orderId } = useParams();
  const id = Number(orderId);
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
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteBody, setNoteBody] = useState('');

  const heading = useMemo<AdminHeading>(() => {
    if (!order) return { title: 'Order', back: '/admin/orders' };
    const canShip = order.status !== 'cancelled' && order.status !== 'delivered' && order.fulfillmentStatus !== 'shipped';
    const canCancel = order.status !== 'cancelled';
    const canRefund = order.grandTotal - order.amountRefunded > 0 && order.paymentStatus !== 'pending';
    const actions =
      canShip || canCancel || canRefund ? (
        <>
          {canRefund && (
            <button type="button" className={styles.ghostBtn} onClick={() => setRefundOpen(true)}>
              Refund
            </button>
          )}
          {canCancel && (
            <button type="button" className={styles.cancelBtn} onClick={() => setCancelOpen(true)}>
              Cancel order
            </button>
          )}
          {canShip && (
            <button type="button" className={styles.shipBtn} onClick={() => setFulfillOpen(true)}>
              <i className="bi bi-truck" aria-hidden="true" />
              Ship order
            </button>
          )}
        </>
      ) : undefined;
    return {
      title: `Order ID #${order.orderNumber}`,
      back: '/admin/orders',
      badge: <OrderStatusPill status={order.status} />,
      actions,
    };
  }, [order]);
  useAdminHeading(heading);

  if (isLoading) return <Spinner center />;
  if (!order) return <div className="at-card p-5 text-center text-body-secondary">Order not found.</div>;

  const shipping = order.addresses.find((a) => a.type === 'shipping') ?? order.addresses[0];
  const refundable = order.grandTotal - order.amountRefunded;
  const activity = buildActivity(order);
  const name = customerName(
    shipping?.firstName ?? order.customer?.firstName,
    shipping?.lastName ?? order.customer?.lastName,
    order.email,
  );

  async function doFulfill() {
    try {
      await fulfill.mutateAsync({ courier: fulfillForm.courier || undefined, trackingNumber: fulfillForm.trackingNumber || undefined, trackingUrl: fulfillForm.trackingUrl || undefined });
      toast.success('Order marked as shipped.');
      setFulfillOpen(false);
    } catch {
      toast.error('Could not ship order.');
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

  async function doAddNote() {
    if (!noteBody.trim()) return;
    try {
      await update.mutateAsync({ addNote: { body: noteBody.trim(), visibility: 'internal' } });
      toast.success('Note added.');
      setNoteBody('');
      setNoteOpen(false);
    } catch {
      toast.error('Could not add note.');
    }
  }

  const addressLine = [shipping?.line1, shipping?.line2].filter(Boolean).join(', ');

  return (
    <div>
      <div className={styles.layout}>
        <div className={styles.col}>
          {/* Order summary */}
          <section className={styles.card}>
            <div className={styles.summaryHead}>
              <div>
                <div className={styles.orderNo}>#{order.orderNumber}</div>
                <div className={styles.orderDate}>{format(new Date(order.createdAt), 'EEEE, hh:mm a')}</div>
              </div>
              <button type="button" className={styles.ghostBtn} onClick={() => window.print()}>
                <i className="bi bi-receipt" aria-hidden="true" />
                Receipt
              </button>
            </div>
            <div className={styles.divider} />

            <div className={styles.itemCount}>
              {order.items.length} item{order.items.length === 1 ? '' : 's'}
            </div>
            {order.items.map((it) => (
              <div key={it.id} className={styles.item}>
                {it.imageUrl ? (
                  <img src={it.imageUrl} alt="" className={styles.thumb} />
                ) : (
                  <span className={`${styles.thumb} ${styles.thumbPlaceholder}`}>
                    <i className="bi bi-image" aria-hidden="true" />
                  </span>
                )}
                <div className={styles.itemMain}>
                  <div className={styles.itemName}>{it.name}</div>
                  <div className={styles.itemQty}>
                    <span className={styles.qtyBox}>{it.quantity}</span>
                    <span>× {moneyShort(it.unitPrice)}</span>
                  </div>
                </div>
                <div className={styles.itemPrice}>{moneyShort(it.totalPrice)}</div>
              </div>
            ))}

            <div className={styles.divider} />
            <div className={styles.totals}>
              <div className={styles.totalRow}>
                <span>Subtotal</span>
                <span>{moneyShort(order.subtotal)}</span>
              </div>
              {order.discountTotal > 0 && (
                <div className={styles.totalRow}>
                  <span>Discount{order.discountCode ? ` (${order.discountCode})` : ''}</span>
                  <span>−{moneyShort(order.discountTotal)}</span>
                </div>
              )}
              <div className={styles.totalRow}>
                <span>Delivery</span>
                {order.shippingTotal > 0 ? <span>{moneyShort(order.shippingTotal)}</span> : <span className={styles.free}>FREE</span>}
              </div>
              {order.taxTotal > 0 && (
                <div className={styles.totalRow}>
                  <span>Tax (incl.)</span>
                  <span>{moneyShort(order.taxTotal)}</span>
                </div>
              )}
              {order.amountRefunded > 0 && (
                <div className={styles.totalRow}>
                  <span>Refunded</span>
                  <span>−{moneyShort(order.amountRefunded)}</span>
                </div>
              )}
            </div>
            <div className={styles.divider} />
            <div className={styles.grandRow}>
              <span className={styles.grandLabel}>Total</span>
              <span className={styles.grandValue}>
                <PaymentPill method={order.paymentMethod} />
                {moneyShort(order.grandTotal)}
              </span>
            </div>
          </section>

          {/* Customer details */}
          <section className={`${styles.card} ${styles.cardBody}`}>
            <h2 className={styles.sectionTitle}>Customer details</h2>
            <div className={styles.detailGrid}>
              <Field label="Name" value={name} />
              <Field label="Email Address" value={<a href={`mailto:${order.email}`}>{order.email}</a>} />
              {addressLine && <Field label="Address" value={addressLine} />}
              <Field label="Phone Number" value={shipping?.phone ?? order.phone ?? '—'} />
              {shipping?.postalCode && <Field label="Zip/Pin Code" value={shipping.postalCode} />}
              {shipping?.province && <Field label="Region" value={shipping.province} />}
              {shipping?.city && <Field label="City" value={shipping.city} />}
              {shipping?.country && <Field label="Country" value={countryName(shipping.country)} />}
              <Field
                label="Payment"
                value={
                  <span className={styles.fieldValuePill}>
                    {paymentMethodLabel(order.paymentMethod)}
                    <PaymentPill method={order.paymentMethod} />
                  </span>
                }
              />
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className={`${styles.col} ${styles.rightCol}`}>
          <section className={styles.card}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Activity</h2>
              <button type="button" className={styles.ghostBtn} onClick={() => setNoteOpen(true)}>
                Add note
              </button>
            </div>
            <ul className={styles.timeline}>
              {activity.map((e, i) => (
                <li key={e.id} className={styles.event}>
                  <span className={`${styles.dot} ${i === 0 ? styles.dotActive : ''}`} />
                  <div>
                    <div className={styles.eventLabel}>{e.label}</div>
                    <div className={styles.eventSub}>{e.sub}</div>
                  </div>
                  <div className={styles.eventTime}>{format(new Date(e.at), 'dd/MM/yy, hh:mm a')}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.card}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Tags</h2>
              <span className={styles.iconEdit} aria-hidden="true">
                <i className="bi bi-pencil" />
              </span>
            </div>
            <div className={styles.tagsBody}>
              <input className={styles.tagInput} placeholder="Search or create tags" aria-label="Order tags" />
            </div>
          </section>
        </div>
      </div>

      <Modal
        open={fulfillOpen}
        onClose={() => setFulfillOpen(false)}
        title="Ship order"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setFulfillOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={doFulfill} disabled={fulfill.isPending}>{fulfill.isPending ? 'Saving…' : 'Ship order'}</button>
          </>
        }
      >
        <div className="vstack gap-3">
          <div><label className="form-label">Courier</label><input className="form-control" placeholder="J&T Express" value={fulfillForm.courier} onChange={(e) => setFulfillForm({ ...fulfillForm, courier: e.target.value })} /></div>
          <div><label className="form-label">Tracking number</label><input className="form-control" value={fulfillForm.trackingNumber} onChange={(e) => setFulfillForm({ ...fulfillForm, trackingNumber: e.target.value })} /></div>
          <div><label className="form-label">Tracking URL</label><input className="form-control" value={fulfillForm.trackingUrl} onChange={(e) => setFulfillForm({ ...fulfillForm, trackingUrl: e.target.value })} /></div>
        </div>
      </Modal>

      <Modal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Refund order"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setRefundOpen(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={doRefund} disabled={refund.isPending}>{refund.isPending ? 'Processing…' : 'Refund'}</button>
          </>
        }
      >
        <div className="vstack gap-3">
          <div className="small text-body-secondary">Refundable: {moneyShort(refundable)}</div>
          <div><label className="form-label">Amount (₱)</label><input className="form-control" type="number" step="0.01" placeholder={toMajorInput(refundable)} value={refundForm.amount} onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })} /></div>
          <div><label className="form-label">Reason</label><input className="form-control" value={refundForm.reason} onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })} /></div>
          <div className="form-check"><input className="form-check-input" type="checkbox" id="restock" checked={refundForm.restock} onChange={(e) => setRefundForm({ ...refundForm, restock: e.target.checked })} /><label className="form-check-label" htmlFor="restock">Restock items</label></div>
        </div>
      </Modal>

      <Modal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Add note"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setNoteOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={doAddNote} disabled={update.isPending || !noteBody.trim()}>{update.isPending ? 'Saving…' : 'Add note'}</button>
          </>
        }
      >
        <textarea className="form-control" rows={4} placeholder="Write an internal note…" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
      </Modal>

      <ConfirmDialog open={cancelOpen} title="Cancel order?" message="This cancels the order and restocks its items. This cannot be undone." confirmLabel="Cancel order" busy={cancel.isPending} onConfirm={doCancel} onCancel={() => setCancelOpen(false)} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.fieldValue}>{value}</div>
    </div>
  );
}
