import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { RangeSelect } from '@/components/common/RangeSelect';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { money, formatNumber, formatDate } from '@/lib/format';
import { useSalesAnalytics } from '@/features/analytics/api';

export function SalesAnalyticsPage() {
  const [range, setRange] = useState('30d');
  const { data, isLoading } = useSalesAnalytics(range);

  return (
    <div>
      <PageHeader title="Sales analytics" description="Revenue and order performance." actions={<RangeSelect value={range} onChange={setRange} />} />
      {isLoading || !data ? <Spinner center /> : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-lg-3"><StatCard label="Gross sales" value={money(data.summary.grossSales)} icon="bi-cash-stack" tone="success" /></div>
            <div className="col-6 col-lg-3"><StatCard label="Net sales" value={money(data.summary.netSales)} icon="bi-graph-up-arrow" tone="primary" /></div>
            <div className="col-6 col-lg-3"><StatCard label="Orders" value={formatNumber(data.summary.totalOrders)} icon="bi-bag-check" tone="info" /></div>
            <div className="col-6 col-lg-3"><StatCard label="Avg. order value" value={money(data.summary.averageOrderValue)} icon="bi-receipt" tone="warning" /></div>
          </div>

          <div className="at-card p-3 p-md-4 mb-3">
            <h2 className="h6 mb-3">Sales over time</h2>
            {data.series.length === 0 ? (
              <EmptyState compact icon="bi-graph-up" title="No sales in this period" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.series} margin={{ left: -8, right: 8, top: 8 }}>
                  <defs><linearGradient id="salesA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} /><stop offset="100%" stopColor="#4f46e5" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={70} tickFormatter={(v: number) => money(v).replace(/\.00$/, '')} />
                  <Tooltip formatter={(v: number) => money(v)} labelFormatter={(d) => formatDate(String(d))} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2} fill="url(#salesA)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="at-card p-3 p-md-4" style={{ maxWidth: 480 }}>
            <h2 className="h6 mb-3">Breakdown</h2>
            <Line label="Gross sales" value={money(data.summary.grossSales)} />
            <Line label="Discounts" value={`−${money(data.summary.discounts)}`} />
            <Line label="Refunds" value={`−${money(data.summary.refunds)}`} />
            <Line label="Shipping collected" value={money(data.summary.shipping)} />
            <Line label="Tax" value={money(data.summary.tax)} muted />
            <hr className="my-2" />
            <Line label="Net sales" value={money(data.summary.netSales)} bold />
          </div>
        </>
      )}
    </div>
  );
}

function Line({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return <div className={`d-flex justify-content-between py-1 ${bold ? 'fw-semibold' : ''} ${muted ? 'text-body-secondary small' : ''}`}><span>{label}</span><span className="at-mono">{value}</span></div>;
}
