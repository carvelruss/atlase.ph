import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { RangeSelect } from '@/components/common/RangeSelect';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatNumber, formatPercent } from '@/lib/format';
import { useTrafficAnalytics } from '@/features/analytics/api';

export function TrafficAnalyticsPage() {
  const [range, setRange] = useState('30d');
  const { data, isLoading } = useTrafficAnalytics(range);

  const funnel = data ? [
    { stage: 'Sessions', n: data.summary.sessions },
    { stage: 'Product views', n: data.summary.productViews },
    { stage: 'Add to cart', n: data.summary.addToCart },
    { stage: 'Checkout', n: data.summary.checkoutStarts },
    { stage: 'Purchases', n: data.summary.purchases },
  ] : [];
  const hasData = data && data.summary.sessions > 0;

  return (
    <div>
      <PageHeader title="Traffic analytics" description="First-party visitor and conversion data." actions={<RangeSelect value={range} onChange={setRange} />} />
      {isLoading || !data ? <Spinner center /> : !hasData ? (
        <div className="at-card p-5"><EmptyState icon="bi-bar-chart" title="No traffic recorded yet" description="Traffic data appears once visitors browse your storefront." /></div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-lg-3"><StatCard label="Sessions" value={formatNumber(data.summary.sessions)} icon="bi-people" tone="primary" /></div>
            <div className="col-6 col-lg-3"><StatCard label="Product views" value={formatNumber(data.summary.productViews)} icon="bi-eye" tone="info" /></div>
            <div className="col-6 col-lg-3"><StatCard label="Purchases" value={formatNumber(data.summary.purchases)} icon="bi-bag-check" tone="success" /></div>
            <div className="col-6 col-lg-3"><StatCard label="Conversion rate" value={formatPercent(data.summary.conversionRate)} icon="bi-funnel" tone="warning" /></div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-8">
              <div className="at-card p-3 p-md-4">
                <h2 className="h6 mb-3">Conversion funnel</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={funnel} layout="vertical" margin={{ left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: '#64748b' }} width={90} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Bar dataKey="n" fill="#4f46e5" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <div className="at-card p-3 p-md-4 mb-3">
                <h2 className="h6 mb-3">Top sources</h2>
                {data.sources.map((s) => <div key={s.source} className="d-flex justify-content-between py-1 small"><span className="text-truncate">{s.source}</span><span className="at-mono">{s.n}</span></div>)}
              </div>
              <div className="at-card p-3 p-md-4">
                <h2 className="h6 mb-3">Devices</h2>
                {data.devices.map((d) => <div key={d.device} className="d-flex justify-content-between py-1 small text-capitalize"><span>{d.device}</span><span className="at-mono">{d.n}</span></div>)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
