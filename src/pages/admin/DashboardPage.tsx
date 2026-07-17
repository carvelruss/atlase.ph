import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { money, formatNumber, formatDate } from '@/lib/format';

interface Overview {
  range: string;
  summary: {
    grossSales: number;
    netSales: number;
    totalOrders: number;
    averageOrderValue: number;
    newCustomers: number;
    lowStockCount: number;
  };
  salesOverTime: { day: string; total: number; orders: number }[];
  paymentBreakdown: { status: string; n: number }[];
  recentOrders: {
    id: number;
    orderNumber: string;
    email: string;
    grandTotal: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
  }[];
  lowStock: { name: string; sku: string | null; available: number; threshold: number }[];
}

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'lifetime', label: 'Lifetime' },
];

export function DashboardPage() {
  const [range, setRange] = useState('30d');
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-overview', range],
    queryFn: () => apiFetch<Overview>('/api/admin/overview', { query: { range } }),
  });

  return (
    <div>
      <PageHeader
        title="Business Overview"
        description="Key metrics for your store, straight from your live data."
        actions={
          <>
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={range}
              onChange={(e) => setRange(e.target.value)}
              aria-label="Date range"
            >
              {RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => refetch()} disabled={isFetching}>
              <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
              Refresh
            </button>
            <Link to="/admin/products/new" className="btn btn-sm btn-primary">
              <i className="bi bi-plus-lg me-1" aria-hidden="true" />
              Add product
            </Link>
          </>
        }
      />

      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <div className="at-card p-5">
          <EmptyState
            icon="bi-exclamation-triangle"
            title="Couldn't load your dashboard"
            description="There was a problem fetching your metrics."
            action={
              <button className="btn btn-primary btn-sm" onClick={() => refetch()}>
                Try again
              </button>
            }
          />
        </div>
      ) : data ? (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-lg-3">
              <StatCard label="Gross sales" value={money(data.summary.grossSales)} icon="bi-cash-stack" tone="success" />
            </div>
            <div className="col-6 col-lg-3">
              <StatCard label="Total orders" value={formatNumber(data.summary.totalOrders)} icon="bi-bag-check" tone="primary" />
            </div>
            <div className="col-6 col-lg-3">
              <StatCard label="Avg. order value" value={money(data.summary.averageOrderValue)} icon="bi-graph-up-arrow" tone="info" />
            </div>
            <div className="col-6 col-lg-3">
              <StatCard label="New customers" value={formatNumber(data.summary.newCustomers)} icon="bi-person-plus" tone="warning" />
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-xl-8">
              <div className="at-card p-3 p-sm-4 h-100">
                <h2 className="h6 mb-3">Sales over time</h2>
                {data.salesOverTime.length === 0 ? (
                  <EmptyState compact icon="bi-graph-up" title="No sales yet" description="Sales will appear here once orders come in." />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={data.salesOverTime} margin={{ left: -12, right: 8, top: 8 }}>
                      <defs>
                        <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(d: string) => d.slice(5)} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v: number) => money(v).replace(/\.00$/, '')} width={72} />
                      <Tooltip
                        formatter={(v: number) => money(v)}
                        labelFormatter={(d) => formatDate(String(d))}
                        contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                      />
                      <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2} fill="url(#salesFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="col-12 col-xl-4">
              <div className="at-card p-3 p-sm-4 h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h6 mb-0">Low stock</h2>
                  <Link to="/admin/inventory" className="small">
                    View all
                  </Link>
                </div>
                {data.lowStock.length === 0 ? (
                  <EmptyState compact icon="bi-check2-circle" title="All stocked up" />
                ) : (
                  <ul className="list-unstyled mb-0">
                    {data.lowStock.map((item) => (
                      <li key={item.sku ?? item.name} className="d-flex justify-content-between py-2 border-bottom">
                        <span className="text-truncate me-2">{item.name}</span>
                        <span className="at-mono text-danger fw-semibold">{item.available}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="at-card p-3 p-sm-4 mt-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h6 mb-0">Recent orders</h2>
              <Link to="/admin/orders" className="small">
                View all orders
              </Link>
            </div>
            {data.recentOrders.length === 0 ? (
              <EmptyState compact icon="bi-bag" title="No orders yet" description="Your most recent orders will show up here." />
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr className="small text-body-secondary">
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link to={`/admin/orders/${o.id}`} className="fw-semibold">
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="text-truncate" style={{ maxWidth: 200 }}>
                          {o.email}
                        </td>
                        <td className="small text-body-secondary">{formatDate(o.createdAt)}</td>
                        <td>
                          <StatusBadge status={o.paymentStatus} />
                        </td>
                        <td>
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="text-end at-mono">{money(o.grandTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
