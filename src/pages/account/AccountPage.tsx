import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from '@/components/feedback/Spinner';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/Toast';
import { ApiError } from '@/lib/api';
import { money, formatDate } from '@/lib/format';
import { useCustomerSession, useCustomerLogin, useCustomerRegister, useCustomerLogout, useAccountOrders } from '@/features/account/api';
import { useSeo } from '@/hooks/useSeo';

export function AccountPage() {
  const { data: session, isLoading } = useCustomerSession();
  useSeo({ title: 'Your account', noindex: true });
  if (isLoading) return <Spinner center />;
  return session?.authenticated ? <Dashboard /> : <AuthForms />;
}

function AuthForms() {
  const toast = useToast();
  const login = useCustomerLogin();
  const register = useCustomerRegister();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (mode === 'login') await login.mutateAsync({ email: form.email, password: form.password });
      else await register.mutateAsync({ email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName });
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  }

  const busy = login.isPending || register.isPending;

  return (
    <div className="container py-5" style={{ maxWidth: 440 }}>
      <div className="at-card p-4 p-md-5">
        <div className="btn-group w-100 mb-4">
          <button className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setMode('login')}>Sign in</button>
          <button className={`btn ${mode === 'register' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setMode('register')}>Register</button>
        </div>
        <form onSubmit={submit} className="vstack gap-3">
          {mode === 'register' && (
            <div className="row g-2">
              <div className="col-6"><input className="form-control" placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
              <div className="col-6"><input className="form-control" placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            </div>
          )}
          <input className="form-control" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="form-control" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          <button className="btn btn-primary" disabled={busy}>{busy ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <p className="text-center text-body-secondary small mt-3 mb-0">
          Prefer not to sign in? <Link to="/track-order">Track an order</Link>
        </p>
      </div>
    </div>
  );
}

function Dashboard() {
  const { data: session } = useCustomerSession();
  const logout = useCustomerLogout();
  const { data: ordersData, isLoading } = useAccountOrders(true);
  const customer = session?.customer;
  const orders = ordersData?.items ?? [];

  return (
    <div className="container py-4 py-lg-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0">My account</h1>
          <p className="text-body-secondary mb-0">{customer?.email}</p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => logout.mutate()}>Sign out</button>
      </div>

      <div className="at-card p-3 p-md-4">
        <h2 className="h6 mb-3">Order history</h2>
        {isLoading ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <EmptyState compact icon="bi-bag" title="No orders yet" action={<Link to="/shop" className="btn btn-sm btn-primary">Start shopping</Link>} />
        ) : (
          <table className="table align-middle mb-0">
            <thead><tr className="small text-body-secondary"><th>Order</th><th>Date</th><th>Status</th><th className="text-end">Total</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="fw-semibold">{o.orderNumber}</td>
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
  );
}
