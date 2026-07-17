import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { RangeSelect } from '@/components/common/RangeSelect';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { money, formatNumber } from '@/lib/format';
import { useProductAnalytics } from '@/features/analytics/api';

export function ProductAnalyticsPage() {
  const [range, setRange] = useState('30d');
  const { data, isLoading } = useProductAnalytics(range);

  return (
    <div>
      <PageHeader title="Product analytics" description="Best sellers and product performance." actions={<RangeSelect value={range} onChange={setRange} />} />
      {isLoading || !data ? <Spinner center /> : (
        <div className="at-card">
          <div className="p-3 p-md-4 border-bottom"><h2 className="h6 mb-0">Top products by revenue</h2></div>
          {data.topProducts.length === 0 ? (
            <EmptyState icon="bi-box" title="No product sales yet" description="Sales appear here once orders come in." />
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead><tr className="small text-body-secondary"><th>Product</th><th className="text-end">Units sold</th><th className="text-end">Revenue</th></tr></thead>
                <tbody>
                  {data.topProducts.map((p) => (
                    <tr key={p.productId}>
                      <td className="fw-semibold">{p.name}</td>
                      <td className="text-end at-mono">{formatNumber(p.units)}</td>
                      <td className="text-end at-mono fw-semibold">{money(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
