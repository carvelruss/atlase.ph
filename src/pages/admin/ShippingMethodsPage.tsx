import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useToast } from '@/components/feedback/Toast';
import { money } from '@/lib/format';
import { toMinorUnits, toMajorUnits } from '@shared/utils/money';
import { useShippingMethods, useSaveShippingMethod, useDeleteShippingMethod, type ShippingMethod } from '@/features/shipping/api';

interface FormState {
  id: number | null;
  name: string;
  type: string;
  rate: number;
  estimatedDays: string;
  isActive: boolean;
}

const blank: FormState = { id: null, name: '', type: 'flat_rate', rate: 0, estimatedDays: '', isActive: true };

export function ShippingMethodsPage() {
  const toast = useToast();
  const { data, isLoading } = useShippingMethods();
  const save = useSaveShippingMethod();
  const del = useDeleteShippingMethod();
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const items = data?.items ?? [];

  function edit(m: ShippingMethod) {
    setForm({ id: m.id, name: m.name, type: m.type, rate: m.rate, estimatedDays: m.estimatedDays ?? '', isActive: m.isActive });
  }

  async function onSave() {
    if (!form?.name.trim()) return;
    try {
      await save.mutateAsync({ id: form.id, input: { name: form.name, type: form.type, rate: form.type === 'free' || form.type === 'pickup' ? 0 : form.rate, estimatedDays: form.estimatedDays || null, isActive: form.isActive, provider: 'manual' } });
      toast.success('Shipping method saved.');
      setForm(null);
    } catch {
      toast.error('Could not save method.');
    }
  }

  return (
    <div>
      <PageHeader title="Delivery methods" description="Shipping options offered at checkout." actions={<button className="btn btn-sm btn-primary" onClick={() => setForm({ ...blank })}><i className="bi bi-plus-lg me-1" /> Add method</button>} />

      <div className="at-card">
        {isLoading ? (
          <Spinner center />
        ) : items.length === 0 ? (
          <EmptyState icon="bi-truck" title="No shipping methods" description="Add a method so customers can check out." />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr className="small text-body-secondary"><th>Name</th><th>Type</th><th className="text-end">Rate</th><th>Delivery</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id}>
                    <td className="fw-semibold">{m.name}</td>
                    <td className="small text-capitalize">{m.type.replace(/_/g, ' ')}</td>
                    <td className="text-end at-mono">{m.type === 'free' || m.type === 'pickup' ? 'Free' : money(m.rate)}</td>
                    <td className="small text-body-secondary">{m.estimatedDays ?? '—'}</td>
                    <td><StatusBadge status={m.isActive ? 'active' : 'archived'} label={m.isActive ? 'Active' : 'Off'} /></td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-secondary" onClick={() => edit(m)}><i className="bi bi-pencil" /></button>
                        <button className="btn btn-outline-danger" onClick={() => setDeleteId(m.id)}><i className="bi bi-trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={form != null} onClose={() => setForm(null)} title={form?.id ? 'Edit method' : 'New method'} footer={<><button className="btn btn-light" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" onClick={onSave} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button></>}>
        {form && (
          <div className="vstack gap-3">
            <div><label className="form-label">Name</label><input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="flat_rate">Flat rate</option>
                <option value="free">Free shipping</option>
                <option value="pickup">Store pickup</option>
                <option value="local_delivery">Local delivery</option>
              </select>
            </div>
            {form.type !== 'free' && form.type !== 'pickup' && (
              <div><label className="form-label">Rate (₱)</label><input className="form-control" type="number" step="0.01" value={toMajorUnits(form.rate)} onChange={(e) => setForm({ ...form, rate: e.target.value ? toMinorUnits(e.target.value) : 0 })} /></div>
            )}
            <div><label className="form-label">Estimated delivery</label><input className="form-control" placeholder="3–5 business days" value={form.estimatedDays} onChange={(e) => setForm({ ...form, estimatedDays: e.target.value })} /></div>
            <div className="form-check form-switch"><input className="form-check-input" type="checkbox" id="active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /><label className="form-check-label" htmlFor="active">Active</label></div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={deleteId != null} title="Delete method?" message="Customers will no longer see this shipping option." confirmLabel="Delete" busy={del.isPending} onConfirm={async () => { if (deleteId != null) { await del.mutateAsync(deleteId); setDeleteId(null); toast.success('Deleted.'); } }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
