import { Link, useNavigate } from 'react-router-dom';
import { useCart, useUpdateCartItem, useRemoveCartItem } from '@/features/cart/api';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { money } from '@/lib/format';

export function CartPage() {
  const navigate = useNavigate();
  const { data: cart, isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  if (isLoading) return <Spinner center />;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container py-5">
        <div className="at-card p-5 mx-auto" style={{ maxWidth: 560 }}>
          <EmptyState
            icon="bi-bag"
            title="Your cart is empty"
            description="Browse the shop to find something you love."
            action={<Link to="/shop" className="btn btn-primary btn-sm">Start shopping</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 py-lg-5">
      <h1 className="h3 mb-4">Your cart</h1>
      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="at-card">
            {cart.items.map((item, idx) => (
              <div key={item.id} className={`d-flex gap-3 p-3 ${idx > 0 ? 'border-top' : ''}`}>
                <Link to={`/products/${item.slug}`} className="flex-shrink-0">
                  <div className="rounded border bg-body-tertiary overflow-hidden" style={{ width: 72, height: 72 }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" width={72} height={72} style={{ objectFit: 'cover' }} />
                    ) : (
                      <div className="d-flex align-items-center justify-content-center h-100 text-body-secondary">
                        <i className="bi bi-image" />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between">
                    <div>
                      <Link to={`/products/${item.slug}`} className="fw-semibold text-body">
                        {item.name}
                      </Link>
                      {item.variantTitle !== 'Default' && <div className="small text-body-secondary">{item.variantTitle}</div>}
                    </div>
                    <button className="btn btn-sm btn-link text-danger p-0" onClick={() => removeItem.mutate(item.id)} aria-label="Remove">
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                  <div className="d-flex justify-content-between align-items-end mt-2">
                    <div className="input-group input-group-sm" style={{ width: 120 }}>
                      <button className="btn btn-outline-secondary" onClick={() => updateItem.mutate({ id: item.id, quantity: item.quantity - 1 })} aria-label="Decrease">
                        −
                      </button>
                      <input className="form-control text-center" value={item.quantity} readOnly aria-label="Quantity" />
                      <button className="btn btn-outline-secondary" onClick={() => updateItem.mutate({ id: item.id, quantity: item.quantity + 1 })} disabled={item.quantity >= item.available} aria-label="Increase">
                        +
                      </button>
                    </div>
                    <div className="fw-semibold at-mono">{money(item.lineTotal)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="at-card p-4">
            <h2 className="h6 mb-3">Order summary</h2>
            <div className="d-flex justify-content-between mb-2">
              <span className="text-body-secondary">Subtotal</span>
              <span className="at-mono">{money(cart.subtotal)}</span>
            </div>
            <div className="d-flex justify-content-between mb-3 small text-body-secondary">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <hr />
            <div className="d-flex justify-content-between mb-3">
              <span className="fw-semibold">Total</span>
              <span className="fw-semibold at-mono">{money(cart.subtotal)}</span>
            </div>
            <button className="btn btn-primary w-100" onClick={() => navigate('/checkout')}>
              Proceed to checkout
            </button>
            <Link to="/shop" className="btn btn-link w-100 mt-1">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
