import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useToast } from '@/components/feedback/Toast';
import { formatDate } from '@/lib/format';
import { usePages, useDeletePage } from '@/features/content/api';
import { useState } from 'react';

export function PagesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isLoading } = usePages();
  const del = useDeletePage();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const items = data?.items ?? [];

  return (
    <div>
      <PageHeader title="Pages" description="Static content pages like About, Contact, and policies." actions={<button className="btn btn-sm btn-primary" onClick={() => navigate('/admin/content/pages/new')}><i className="bi bi-plus-lg me-1" /> Add page</button>} />
      <div className="at-card">
        {isLoading ? <Spinner center /> : items.length === 0 ? (
          <EmptyState icon="bi-file-earmark-text" title="No pages yet" description="Create pages like About or Contact." action={<button className="btn btn-sm btn-primary" onClick={() => navigate('/admin/content/pages/new')}>Add page</button>} />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead><tr className="small text-body-secondary"><th>Title</th><th>Slug</th><th>Status</th><th>Updated</th><th /></tr></thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td className="fw-semibold text-primary" style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/content/pages/${p.id}`)}>{p.title}</td>
                    <td className="text-body-secondary small">/pages/{p.slug}</td>
                    <td><StatusBadge status={p.status === 'published' ? 'active' : 'draft'} label={p.status} /></td>
                    <td className="small text-body-secondary">{formatDate(p.updatedAt)}</td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-secondary" onClick={() => navigate(`/admin/content/pages/${p.id}`)}><i className="bi bi-pencil" /></button>
                        <button className="btn btn-outline-danger" onClick={() => setDeleteId(p.id)}><i className="bi bi-trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmDialog open={deleteId != null} title="Delete page?" message="This permanently deletes the page." confirmLabel="Delete" busy={del.isPending} onConfirm={async () => { if (deleteId != null) { await del.mutateAsync(deleteId); setDeleteId(null); toast.success('Deleted.'); } }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
