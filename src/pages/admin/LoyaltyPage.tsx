import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/common/PageHeader';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';

interface LoyaltyAccount {
  id: number;
  customerId: number;
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export function LoyaltyPage() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-loyalty'], queryFn: () => apiFetch<{ items: LoyaltyAccount[] }>('/api/admin/marketing/loyalty') });
  const items = data?.items ?? [];

  return (
    <div>
      <PageHeader title="Loyalty" description="Reward points balances. Points are earned on orders and can be adjusted manually." />
      <div className="alert alert-info small">
        <i className="bi bi-info-circle me-2" />
        Loyalty is a foundation module — earning/redemption rules and the storefront widget are configurable. Adjust a customer's balance from their profile.
      </div>
      <div className="at-card">
        {isLoading ? <Spinner center /> : items.length === 0 ? (
          <EmptyState icon="bi-award" title="No loyalty accounts yet" description="Accounts appear once customers earn points." />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead><tr className="small text-body-secondary"><th>Customer</th><th className="text-end">Balance</th><th className="text-end">Earned</th><th className="text-end">Redeemed</th></tr></thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td>{`${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || a.email}</td>
                    <td className="text-end at-mono fw-semibold">{a.balance}</td>
                    <td className="text-end at-mono">{a.lifetimeEarned}</td>
                    <td className="text-end at-mono">{a.lifetimeRedeemed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
