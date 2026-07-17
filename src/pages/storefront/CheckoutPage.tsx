import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useCart } from '@/features/cart/api';
import { useShippingRates, useApplyDiscount, useCompleteCheckout, type ShippingOption, type DiscountResult } from '@/features/checkout/api';
import { Spinner } from '@/components/feedback/Spinner';
import { useToast } from '@/components/feedback/Toast';
import { ApiError } from '@/lib/api';
import { money } from '@/lib/format';

const schema = z.object({
  email: z.string().email('Enter a valid email.'),
  phone: z.string().min(5, 'Enter a phone number.'),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  line1: z.string().min(1, 'Required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'Required'),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('PH'),
  paymentMethod: z.enum(['cod', 'bank_transfer']),
  customerNote: z.string().optional(),
  marketingConsent: z.boolean().optional(),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: 'Please accept the terms.' }) }),
});
type FormValues = z.infer<typeof schema>;

function uuid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: cart, isLoading } = useCart();
  const ratesMut = useShippingRates();
  const discountMut = useApplyDiscount();
  const complete = useCompleteCheckout();

  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [shippingMethodId, setShippingMethodId] = useState<number | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState<DiscountResult | null>(null);
  const [idempotencyKey] = useState(uuid);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { country: 'PH', paymentMethod: 'cod' },
  });

  const province = watch('province');
  const country = watch('country');

  // Fetch shipping rates when the destination is known.
  useEffect(() => {
    if (!cart || cart.items.length === 0) return;
    let active = true;
    ratesMut
      .mutateAsync({ country: country || 'PH', province: province || null })
      .then((res) => {
        if (!active) return;
        setOptions(res.options);
        setShippingMethodId((prev) => prev ?? res.options[0]?.id ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, province, cart?.items.length]);

  if (isLoading) return <Spinner center />;
  if (!cart || cart.items.length === 0) {
    return (
      <div className="container py-5 text-center">
        <p className="text-body-secondary">Your cart is empty.</p>
        <button className="btn btn-primary" onClick={() => navigate('/shop')}>
          Continue shopping
        </button>
      </div>
    );
  }

  const selectedOption = options.find((o) => o.id === shippingMethodId) ?? null;
  const shippingCost = discount?.freeShipping ? 0 : (selectedOption?.rate ?? 0);
  const estTotal = Math.max(0, cart.subtotal - (discount?.amount ?? 0) + shippingCost);

  async function applyDiscount() {
    if (!discountCode.trim()) return;
    try {
      const res = await discountMut.mutateAsync(discountCode.trim());
      setDiscount(res);
      toast.success('Discount applied.');
    } catch (err) {
      setDiscount(null);
      toast.error(err instanceof ApiError ? err.message : 'Invalid code.');
    }
  }

  async function onSubmit(values: FormValues) {
    if (options.length > 0 && shippingMethodId == null) {
      toast.error('Please choose a shipping method.');
      return;
    }
    try {
      const result = await complete.mutateAsync({
        email: values.email,
        phone: values.phone,
        shipping: {
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          line1: values.line1,
          line2: values.line2,
          city: values.city,
          province: values.province,
          postalCode: values.postalCode,
          country: values.country,
        },
        billingSameAsShipping: true,
        shippingMethodId: shippingMethodId ?? 0,
        paymentMethod: values.paymentMethod,
        discountCode: discount?.code ?? null,
        customerNote: values.customerNote || null,
        marketingConsent: values.marketingConsent,
        termsAccepted: values.termsAccepted,
        idempotencyKey,
      });
      await qc.invalidateQueries({ queryKey: ['cart'] });
      navigate('/checkout/success', { state: { order: result }, replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not place your order.');
    }
  }

  const inputClass = (field: keyof FormValues) => `form-control ${errors[field] ? 'is-invalid' : ''}`;

  return (
    <div className="container py-4 py-lg-5">
      <h1 className="h3 mb-4">Checkout</h1>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="row g-4">
          <div className="col-12 col-lg-7">
            {/* Contact */}
            <section className="at-card p-4 mb-3">
              <h2 className="h6 mb-3">1. Contact</h2>
              <div className="row g-3">
                <div className="col-md-7">
                  <label className="form-label">Email</label>
                  <input className={inputClass('email')} type="email" {...register('email')} />
                  {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
                </div>
                <div className="col-md-5">
                  <label className="form-label">Phone</label>
                  <input className={inputClass('phone')} {...register('phone')} />
                  {errors.phone && <div className="invalid-feedback">{errors.phone.message}</div>}
                </div>
              </div>
            </section>

            {/* Address */}
            <section className="at-card p-4 mb-3">
              <h2 className="h6 mb-3">2. Delivery address</h2>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">First name</label>
                  <input className={inputClass('firstName')} {...register('firstName')} />
                  {errors.firstName && <div className="invalid-feedback">{errors.firstName.message}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label">Last name</label>
                  <input className={inputClass('lastName')} {...register('lastName')} />
                  {errors.lastName && <div className="invalid-feedback">{errors.lastName.message}</div>}
                </div>
                <div className="col-12">
                  <label className="form-label">Address</label>
                  <input className={inputClass('line1')} {...register('line1')} />
                  {errors.line1 && <div className="invalid-feedback">{errors.line1.message}</div>}
                </div>
                <div className="col-12">
                  <input className="form-control" placeholder="Apartment, suite, etc. (optional)" {...register('line2')} />
                </div>
                <div className="col-md-5">
                  <label className="form-label">City</label>
                  <input className={inputClass('city')} {...register('city')} />
                  {errors.city && <div className="invalid-feedback">{errors.city.message}</div>}
                </div>
                <div className="col-md-4">
                  <label className="form-label">Province</label>
                  <input className="form-control" {...register('province')} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Postal code</label>
                  <input className="form-control" {...register('postalCode')} />
                </div>
              </div>
            </section>

            {/* Shipping method */}
            <section className="at-card p-4 mb-3">
              <h2 className="h6 mb-3">3. Shipping method</h2>
              {ratesMut.isPending && options.length === 0 ? (
                <Spinner size="sm" />
              ) : options.length === 0 ? (
                <p className="text-body-secondary small mb-0">Enter your address to see shipping options.</p>
              ) : (
                <div className="vstack gap-2">
                  {options.map((o) => (
                    <label key={o.id} className={`d-flex align-items-center gap-2 border rounded p-2 ${shippingMethodId === o.id ? 'border-primary' : ''}`} style={{ cursor: 'pointer' }}>
                      <input type="radio" className="form-check-input" name="shipping" checked={shippingMethodId === o.id} onChange={() => setShippingMethodId(o.id)} />
                      <span className="flex-grow-1">
                        <span className="fw-medium">{o.name}</span>
                        {o.estimatedDays && <span className="text-body-secondary small ms-2">{o.estimatedDays}</span>}
                      </span>
                      <span className="fw-semibold at-mono">{o.rate === 0 ? 'Free' : money(o.rate)}</span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            {/* Payment */}
            <section className="at-card p-4 mb-3">
              <h2 className="h6 mb-3">4. Payment</h2>
              <div className="vstack gap-2">
                <label className="d-flex align-items-center gap-2 border rounded p-2" style={{ cursor: 'pointer' }}>
                  <input type="radio" className="form-check-input" value="cod" {...register('paymentMethod')} />
                  <span><i className="bi bi-cash-coin me-2" />Cash on delivery</span>
                </label>
                <label className="d-flex align-items-center gap-2 border rounded p-2" style={{ cursor: 'pointer' }}>
                  <input type="radio" className="form-check-input" value="bank_transfer" {...register('paymentMethod')} />
                  <span><i className="bi bi-bank me-2" />Bank transfer (manual)</span>
                </label>
              </div>
              <div className="mt-3">
                <label className="form-label small">Order notes (optional)</label>
                <textarea className="form-control" rows={2} {...register('customerNote')} />
              </div>
            </section>
          </div>

          {/* Summary */}
          <div className="col-12 col-lg-5">
            <div className="at-card p-4" style={{ position: 'sticky', top: 'calc(var(--at-topbar-height) + 1rem)' }}>
              <h2 className="h6 mb-3">Order summary</h2>
              <div className="vstack gap-2 mb-3">
                {cart.items.map((item) => (
                  <div key={item.id} className="d-flex justify-content-between small">
                    <span>
                      {item.name} {item.variantTitle !== 'Default' && <span className="text-body-secondary">({item.variantTitle})</span>} × {item.quantity}
                    </span>
                    <span className="at-mono">{money(item.lineTotal)}</span>
                  </div>
                ))}
              </div>

              <div className="input-group input-group-sm mb-3">
                <input className="form-control" placeholder="Discount code" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} />
                <button type="button" className="btn btn-outline-secondary" onClick={applyDiscount} disabled={discountMut.isPending}>
                  Apply
                </button>
              </div>

              <div className="d-flex justify-content-between mb-1">
                <span className="text-body-secondary">Subtotal</span>
                <span className="at-mono">{money(cart.subtotal)}</span>
              </div>
              {discount && discount.amount > 0 && (
                <div className="d-flex justify-content-between mb-1 text-success">
                  <span>Discount ({discount.code})</span>
                  <span className="at-mono">−{money(discount.amount)}</span>
                </div>
              )}
              <div className="d-flex justify-content-between mb-1">
                <span className="text-body-secondary">Shipping</span>
                <span className="at-mono">{selectedOption ? (shippingCost === 0 ? 'Free' : money(shippingCost)) : '—'}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between mb-3">
                <span className="fw-semibold">Total</span>
                <span className="fw-semibold at-mono">{money(estTotal)}</span>
              </div>
              <p className="text-body-secondary" style={{ fontSize: '0.7rem' }}>Prices include VAT. Final total is confirmed on placement.</p>

              <div className="form-check mb-2">
                <input className={`form-check-input ${errors.termsAccepted ? 'is-invalid' : ''}`} type="checkbox" id="terms" {...register('termsAccepted')} />
                <label className="form-check-label small" htmlFor="terms">
                  I agree to the terms and conditions
                </label>
              </div>
              <div className="form-check mb-3">
                <input className="form-check-input" type="checkbox" id="marketing" {...register('marketingConsent')} />
                <label className="form-check-label small" htmlFor="marketing">
                  Email me with news and offers
                </label>
              </div>

              <button type="submit" className="btn btn-primary w-100 btn-lg" disabled={complete.isPending}>
                {complete.isPending ? 'Placing order…' : 'Place order'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
