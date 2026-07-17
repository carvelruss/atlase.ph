import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useToast } from '@/components/feedback/Toast';
import { money } from '@/lib/format';
import { toMinorUnits, toMajorUnits } from '@shared/utils/money';
import { useDiscounts, useSaveDiscount, useDeleteDiscount, type Discount, type DiscountInput } from '@/features/discounts/api';

interface FormState extends DiscountInput { id: number | null }
const blank: FormState = { id: null, name: '', code: '', type: 'percentage', value: 10, appliesTo: 'all', isActive: true };

export function DiscountsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useDiscounts({ page });
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const save = useSaveDiscount(form?.id ?? null);
  const del = useDeleteDiscount();

  const items = data?.data.items ?? [];
  const meta = data?.meta;

  function edit(d: Discount) {
    setForm({ id: d.id, name: d.name, code: d.code ?? '', type: d.type, value: d.value, appliesTo: d.appliesTo, minPurchase: d.minPurchase, usageLimit: d.usageLimit, isActive: d.isActive });
  }

  async function onSave() {
    if (!form?.name.trim()) return;
    try {
      await save.mutateAsync({ ...form, code: form.code?.trim() || null });
      toast.success('Discount saved.');
      setForm(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save discount.');
    }
  }

  const valueLabel = (d: Discount) => (d.type === 'percentage' ? `${d.value}%` : d.type === 'fixed_amount' ? money(d.value) : d.type === 'free_shipping' ? 'Free shipping' : '—');

  return (
    <div>
      <PageHeader title="Discounts" description="Create coupon codes and automatic discounts." actions={<button className="btn btn-sm btn-primary" onClick={() => setForm({ ...blank })}><i className="bi bi-plus-lg me-1" /> Create discount</button>} />

      <div className="at-card">
        {isLoading ? (
          <Spinner center />
        ) : items.length === 0 ? (
          <EmptyState icon="bi-percent" title="No discounts yet" description="Create your first coupon or automatic discount." />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead><tr className="small text-body-secondary"><th>Name</th><th>Code</th><th>Value</th><th className="text-center">Used</th><th>Status</th><th /></tr></thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id}>
                    <td className="fw-semibold">{d.name}</td>
                    <td className="at-mono">{d.code ?? <span className="text-body-secondary">Automatic</span>}</td>
                    <td>{valueLabel(d)}</td>
                    <td className="text-center">{d.usageCount}{d.usageLimit ? `/${d.usageLimit}` : ''}</td>
                    <td><StatusBadge status={d.isActive ? 'active' : 'archived'} label={d.isActive ? 'Active' : 'Off'} /></td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-secondary" onClick={() => edit(d)}><i className="bi bi-pencil" /></button>
                        <button className="btn btn-outline-danger" onClick={() => setDeleteId(d.id)}><i className="bi bi-trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta && <div className="p-3 border-top"><Pagination page={page} totalPages={meta.totalPages ?? 1} total={meta.total} onPage={setPage} /></div>}
      </div>

      <Modal open={form != null} onClose={() => setForm(null)} title={form?.id ? 'Edit discount' : 'New discount'} size="lg" footer={<><button className="btn btn-light" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" onClick={onSave} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button></>}>
        {form && (
          <div className="row g-3">
            <div className="col-md-6"><label className="form-label">Internal name</label><input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="col-md-6"><label className="form-label">Coupon code</label><input className="form-control text-uppercase" placeholder="Leave blank for automatic" value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div className="col-md-6"><label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed amount</option>
                <option value="free_shipping">Free shipping</option>
              </select>
            </div>
            {form.type !== 'free_shipping' && (
              <div className="col-md-6"><label className="form-label">{form.type === 'percentage' ? 'Percent (%)' : 'Amount (₱)'}</label>
                {form.type === 'percentage'
                  ? <input className="form-control" type="number" min="0" max="100" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) || 0 })} />
                  : <input className="form-control" type="number" step="0.01" value={toMajorUnits(form.value)} onChange={(e) => setForm({ ...form, value: e.target.value ? toMinorUnits(e.target.value) : 0 })} />}
              </div>
            )}
            <div className="col-md-6"><label className="form-label">Minimum purchase (₱)</label><input className="form-control" type="number" step="0.01" value={form.minPurchase != null ? toMajorUnits(form.minPurchase) : ''} onChange={(e) => setForm({ ...form, minPurchase: e.target.value ? toMinorUnits(e.target.value) : null })} /></div>
            <div className="col-md-6"><label className="form-label">Total usage limit</label><input className="form-control" type="number" value={form.usageLimit ?? ''} onChange={(e) => setForm({ ...form, usageLimit: e.target.value ? Number(e.target.value) : null })} /></div>
            <div className="col-12"><div className="form-check form-switch"><input className="form-check-input" type="checkbox" id="dActive" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /><label className="form-check-label" htmlFor="dActive">Active</label></div></div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={deleteId != null} title="Delete discount?" message="This removes the discount. Past redemptions are kept." confirmLabel="Delete" busy={del.isPending} onConfirm={async () => { if (deleteId != null) { await del.mutateAsync(deleteId); setDeleteId(null); toast.success('Deleted.'); } }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
