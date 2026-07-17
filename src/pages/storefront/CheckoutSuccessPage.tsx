import { Link, useLocation } from 'react-router-dom';
import { money } from '@/lib/format';

interface OrderState {
  orderNumber: string;
  grandTotal: number;
  email: string;
}

export function CheckoutSuccessPage() {
  const location = useLocation();
  const order = (location.state as { order?: OrderState } | null)?.order ?? null;

  return (
    <div className="container py-5">
      <div className="at-card p-4 p-md-5 mx-auto text-center" style={{ maxWidth: 560 }}>
        <div className="d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--at-success-soft)', color: 'var(--at-success)' }}>
          <i className="bi bi-check-lg" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
        </div>
        <h1 className="h3 mb-2">Thank you for your order!</h1>
        {order ? (
          <>
            <p className="text-body-secondary mb-4">
              Your order <strong>{order.orderNumber}</strong> has been placed. A confirmation was sent to {order.email}.
            </p>
            <div className="d-flex justify-content-between border rounded p-3 mb-4">
              <span className="text-body-secondary">Order total</span>
              <span className="fw-semibold at-mono">{money(order.grandTotal)}</span>
            </div>
            <div className="d-flex flex-wrap gap-2 justify-content-center">
              <Link to="/track-order" className="btn btn-outline-secondary">
                Track your order
              </Link>
              <Link to="/shop" className="btn btn-primary">
                Continue shopping
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-body-secondary mb-4">Your order has been placed successfully.</p>
            <Link to="/shop" className="btn btn-primary">
              Continue shopping
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
