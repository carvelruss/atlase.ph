import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useToast } from '@/components/feedback/Toast';
import {
  useCollections,
  useSaveCollection,
  useDeleteCollection,
  type CollectionInput,
  type CollectionRuleInput,
} from '@/features/collections/api';
import type { Collection } from '@/features/catalog/types';

const empty: CollectionInput = { name: '', description: '', type: 'manual', isActive: true, rules: [], rulesMatch: 'all' };

export function CollectionsPage() {
  const toast = useToast();
  const { data, isLoading } = useCollections();
  const save = useSaveCollection();
  const del = useDeleteCollection();
  const [editing, setEditing] = useState<{ id: number | null; input: CollectionInput } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const items = data?.items ?? [];
  const set = (patch: Partial<CollectionInput>) => editing && setEditing({ ...editing, input: { ...editing.input, ...patch } });

  function openEdit(c: Collection) {
    setEditing({ id: c.id, input: { name: c.name, type: c.type, isActive: c.isActive, rules: [], rulesMatch: 'all' } });
  }

  async function onSubmit() {
    if (!editing?.input.name.trim()) return;
    try {
      await save.mutateAsync(editing);
      toast.success('Collection saved.');
      setEditing(null);
    } catch {
      toast.error('Could not save collection.');
    }
  }

  const rules = editing?.input.rules ?? [];
  const updateRule = (i: number, patch: Partial<CollectionRuleInput>) => set({ rules: rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });

  return (
    <div>
      <PageHeader
        title="Collections"
        description="Curated or automatic groupings that appear on your storefront."
        actions={
          <button className="btn btn-sm btn-primary" onClick={() => setEditing({ id: null, input: { ...empty } })}>
            <i className="bi bi-plus-lg me-1" /> Add collection
          </button>
        }
      />

      <div className="at-card">
        {isLoading ? (
          <Spinner center />
        ) : items.length === 0 ? (
          <EmptyState icon="bi-collection" title="No collections yet" description="Group products manually or with rules." />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr className="small text-body-secondary">
                  <th>Name</th>
                  <th>Type</th>
                  <th className="text-end">Products</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td className="fw-semibold">{c.name}</td>
                    <td className="text-capitalize small">{c.type.replace('_', ' ')}</td>
                    <td className="text-end">{c.productCount ?? 0}</td>
                    <td>
                      <StatusBadge status={c.isActive ? 'active' : 'archived'} label={c.isActive ? 'Active' : 'Hidden'} />
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-secondary" onClick={() => openEdit(c)} aria-label="Edit">
                          <i className="bi bi-pencil" />
                        </button>
                        <button className="btn btn-outline-danger" onClick={() => setDeleteId(c.id)} aria-label="Delete">
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={editing != null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit collection' : 'New collection'}
        size="lg"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={onSubmit} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        {editing && (
          <div className="vstack gap-3">
            <div>
              <label className="form-label">Name</label>
              <input className="form-control" value={editing.input.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
            </div>
            <div>
              <label className="form-label">Type</label>
              <select className="form-select" value={editing.input.type} onChange={(e) => set({ type: e.target.value as 'manual' | 'rule_based' })}>
                <option value="manual">Manual — pick products in the product editor</option>
                <option value="rule_based">Automatic — match products by rules</option>
              </select>
            </div>

            {editing.input.type === 'rule_based' && (
              <div>
                <label className="form-label">Match</label>
                <select className="form-select mb-2" value={editing.input.rulesMatch} onChange={(e) => set({ rulesMatch: e.target.value as 'all' | 'any' })}>
                  <option value="all">Products matching ALL conditions</option>
                  <option value="any">Products matching ANY condition</option>
                </select>
                {rules.map((r, i) => (
                  <div className="row g-2 mb-2" key={i}>
                    <div className="col-4">
                      <select className="form-select form-select-sm" value={r.field} onChange={(e) => updateRule(i, { field: e.target.value as CollectionRuleInput['field'] })}>
                        <option value="tag">Tag</option>
                        <option value="brand">Brand</option>
                        <option value="price">Price</option>
                        <option value="inventory">In stock</option>
                      </select>
                    </div>
                    <div className="col-3">
                      <select className="form-select form-select-sm" value={r.operator} onChange={(e) => updateRule(i, { operator: e.target.value as CollectionRuleInput['operator'] })}>
                        <option value="equals">is</option>
                        <option value="contains">contains</option>
                        <option value="gt">greater than</option>
                        <option value="lt">less than</option>
                      </select>
                    </div>
                    <div className="col">
                      <input className="form-control form-control-sm" value={String(r.value)} onChange={(e) => updateRule(i, { value: e.target.value })} />
                    </div>
                    <div className="col-auto">
                      <button className="btn btn-sm btn-outline-danger" onClick={() => set({ rules: rules.filter((_, idx) => idx !== i) })} aria-label="Remove rule">
                        <i className="bi bi-x" />
                      </button>
                    </div>
                  </div>
                ))}
                <button className="btn btn-sm btn-outline-secondary" onClick={() => set({ rules: [...rules, { field: 'tag', operator: 'equals', value: '' }] })}>
                  <i className="bi bi-plus-lg me-1" /> Add rule
                </button>
              </div>
            )}

            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id="colActive" checked={editing.input.isActive ?? true} onChange={(e) => set({ isActive: e.target.checked })} />
              <label className="form-check-label" htmlFor="colActive">
                Visible on storefront
              </label>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={deleteId != null} title="Delete collection?" message="This removes the collection. Products are not deleted." confirmLabel="Delete" busy={del.isPending} onConfirm={async () => { if (deleteId != null) { await del.mutateAsync(deleteId); setDeleteId(null); toast.success('Collection deleted.'); } }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
