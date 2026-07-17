import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useToast } from '@/components/feedback/Toast';
import { useCategories, useSaveCategory, useDeleteCategory, type CategoryInput } from '@/features/categories/api';
import type { Category } from '@/features/catalog/types';

const empty: CategoryInput = { name: '', description: '', isActive: true, displayOrder: 0 };

export function CategoriesPage() {
  const toast = useToast();
  const { data, isLoading } = useCategories();
  const save = useSaveCategory();
  const del = useDeleteCategory();
  const [editing, setEditing] = useState<{ id: number | null; input: CategoryInput } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const items = data?.items ?? [];

  function openNew() {
    setEditing({ id: null, input: { ...empty } });
  }
  function openEdit(c: Category) {
    setEditing({ id: c.id, input: { name: c.name, description: c.description, isActive: c.isActive, displayOrder: c.displayOrder, parentId: c.parentId } });
  }

  async function onSubmit() {
    if (!editing) return;
    if (!editing.input.name.trim()) return;
    try {
      await save.mutateAsync(editing);
      toast.success('Category saved.');
      setEditing(null);
    } catch {
      toast.error('Could not save category.');
    }
  }

  async function onDelete() {
    if (deleteId == null) return;
    try {
      await del.mutateAsync(deleteId);
      toast.success('Category deleted.');
    } catch {
      toast.error('Could not delete category.');
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Group your products into browsable categories."
        actions={
          <button className="btn btn-sm btn-primary" onClick={openNew}>
            <i className="bi bi-plus-lg me-1" /> Add category
          </button>
        }
      />

      <div className="at-card">
        {isLoading ? (
          <Spinner center />
        ) : items.length === 0 ? (
          <EmptyState icon="bi-tags" title="No categories yet" description="Create a category to organize your catalog." action={<button className="btn btn-sm btn-primary" onClick={openNew}>Add category</button>} />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr className="small text-body-secondary">
                  <th>Name</th>
                  <th>Slug</th>
                  <th className="text-end">Products</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td className="fw-semibold">{c.name}</td>
                    <td className="text-body-secondary small">/{c.slug}</td>
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
        title={editing?.id ? 'Edit category' : 'New category'}
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
              <input className="form-control" value={editing.input.name} onChange={(e) => setEditing({ ...editing, input: { ...editing.input, name: e.target.value } })} autoFocus />
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={2} value={editing.input.description ?? ''} onChange={(e) => setEditing({ ...editing, input: { ...editing.input, description: e.target.value } })} />
            </div>
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id="catActive" checked={editing.input.isActive ?? true} onChange={(e) => setEditing({ ...editing, input: { ...editing.input, isActive: e.target.checked } })} />
              <label className="form-check-label" htmlFor="catActive">
                Visible on storefront
              </label>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={deleteId != null} title="Delete category?" message="Products in this category won't be deleted, but they'll be removed from it." confirmLabel="Delete" busy={del.isPending} onConfirm={onDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
