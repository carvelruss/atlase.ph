import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useToast } from '@/components/feedback/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { money, formatDate } from '@/lib/format';
import { useCustomers, useSaveCustomer, type CustomerInput } from '@/features/customers/api';

const empty: CustomerInput = { email: '', firstName: '', lastName: '', phone: '', marketingConsent: false };

export function CustomersPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [rawSearch, setRawSearch] = useState('');
  const search = useDebouncedValue(rawSearch);
  const [creating, setCreating] = useState<CustomerInput | null>(null);

  const { data, isLoading } = useCustomers({ page, q: search || undefined });
  const save = useSaveCustomer();
  const items = data?.data.items ?? [];
  const meta = data?.meta;

  async function onCreate() {
    if (!creating?.email.trim()) return;
    try {
      await save.mutateAsync({ id: null, input: creating });
      toast.success('Customer added.');
      setCreating(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add customer.');
    }
  }

  return (
    <div>
      <PageHeader title="Customers" description="Everyone who has shopped with you." actions={<button className="btn btn-sm btn-primary" onClick={() => setCreating({ ...empty })}><i className="bi bi-plus-lg me-1" /> Add customer</button>} />

      <div className="at-card p-3 mb-3">
        <div className="input-group input-group-sm" style={{ maxWidth: 360 }}>
          <span className="input-group-text bg-transparent"><i className="bi bi-search" /></span>
          <input className="form-control" placeholder="Search name, email, phone…" value={rawSearch} onChange={(e) => { setRawSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="at-card">
        {isLoading ? (
          <Spinner center />
        ) : items.length === 0 ? (
          <EmptyState icon="bi-people" title="No customers yet" />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr className="small text-body-secondary">
                  <th>Name</th>
                  <th>Email</th>
                  <th className="text-center">Orders</th>
                  <th className="text-end">Total spent</th>
                  <th>Last order</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/customers/${c.id}`)}>
                    <td className="fw-semibold">{`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || '—'}</td>
                    <td className="text-truncate" style={{ maxWidth: 220 }}>{c.email}</td>
                    <td className="text-center">{c.ordersCount}</td>
                    <td className="text-end at-mono">{money(c.totalSpent)}</td>
                    <td className="small text-body-secondary">{c.lastOrderAt ? formatDate(c.lastOrderAt) : '—'}</td>
                    <td><StatusBadge status={c.status === 'active' ? 'active' : 'archived'} label={c.status === 'active' ? 'Active' : 'Disabled'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta && <div className="p-3 border-top"><Pagination page={page} totalPages={meta.totalPages ?? 1} total={meta.total} onPage={setPage} /></div>}
      </div>

      <Modal open={creating != null} onClose={() => setCreating(null)} title="Add customer" footer={<><button className="btn btn-light" onClick={() => setCreating(null)}>Cancel</button><button className="btn btn-primary" onClick={onCreate} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button></>}>
        {creating && (
          <div className="row g-3">
            <div className="col-12"><label className="form-label">Email</label><input className="form-control" type="email" value={creating.email} onChange={(e) => setCreating({ ...creating, email: e.target.value })} /></div>
            <div className="col-6"><label className="form-label">First name</label><input className="form-control" value={creating.firstName ?? ''} onChange={(e) => setCreating({ ...creating, firstName: e.target.value })} /></div>
            <div className="col-6"><label className="form-label">Last name</label><input className="form-control" value={creating.lastName ?? ''} onChange={(e) => setCreating({ ...creating, lastName: e.target.value })} /></div>
            <div className="col-12"><label className="form-label">Phone</label><input className="form-control" value={creating.phone ?? ''} onChange={(e) => setCreating({ ...creating, phone: e.target.value })} /></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
