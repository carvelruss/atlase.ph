import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { RangeSelect } from '@/components/common/RangeSelect';
import { Spinner } from '@/components/feedback/Spinner';
import { money, formatNumber, formatPercent } from '@/lib/format';
import { useCustomerAnalytics } from '@/features/analytics/api';

export function CustomerAnalyticsPage() {
  const [range, setRange] = useState('30d');
  const { data, isLoading } = useCustomerAnalytics(range);

  return (
    <div>
      <PageHeader title="Customer analytics" description="Acquisition, retention, and top customers." actions={<RangeSelect value={range} onChange={setRange} />} />
      {isLoading || !data ? <Spinner center /> : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-lg-3"><StatCard label="New customers" value={formatNumber(data.summary.newCustomers)} icon="bi-person-plus" tone="primary" /></div>
            <div className="col-6 col-lg-3"><StatCard label="Returning" value={formatNumber(data.summary.returningCustomers)} icon="bi-arrow-repeat" tone="success" /></div>
            <div className="col-6 col-lg-3"><StatCard label="Repeat rate" value={formatPercent(data.summary.repeatPurchaseRate)} icon="bi-heart" tone="warning" /></div>
            <div className="col-6 col-lg-3"><StatCard label="Purchasers" value={formatNumber(data.summary.totalPurchasers)} icon="bi-people" tone="info" /></div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-8">
              <div className="at-card p-3 p-md-4">
                <h2 className="h6 mb-3">Top customers</h2>
                <table className="table align-middle mb-0">
                  <tbody>
                    {data.topCustomers.map((c) => (
                      <tr key={c.id}>
                        <td><Link to={`/admin/customers/${c.id}`} className="fw-semibold">{`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email}</Link></td>
                        <td className="text-center">{c.ordersCount} orders</td>
                        <td className="text-end at-mono fw-semibold">{money(c.totalSpent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <div className="at-card p-3 p-md-4">
                <h2 className="h6 mb-3">By region</h2>
                {data.byRegion.map((r) => <div key={r.region} className="d-flex justify-content-between py-1 small"><span className="text-truncate">{r.region}</span><span className="at-mono">{r.n}</span></div>)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
