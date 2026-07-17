import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useToast } from '@/components/feedback/Toast';
import { formatDate } from '@/lib/format';
import { useBlogPosts, useDeleteBlogPost } from '@/features/content/api';

export function BlogPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isLoading } = useBlogPosts();
  const del = useDeleteBlogPost();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const items = data?.items ?? [];

  return (
    <div>
      <PageHeader title="Blog" description="Articles and updates for your storefront." actions={<button className="btn btn-sm btn-primary" onClick={() => navigate('/admin/content/blog/new')}><i className="bi bi-plus-lg me-1" /> Write post</button>} />
      <div className="at-card">
        {isLoading ? <Spinner center /> : items.length === 0 ? (
          <EmptyState icon="bi-newspaper" title="No posts yet" description="Publish your first article." action={<button className="btn btn-sm btn-primary" onClick={() => navigate('/admin/content/blog/new')}>Write post</button>} />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead><tr className="small text-body-secondary"><th>Post</th><th>Author</th><th>Status</th><th>Updated</th><th /></tr></thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        {p.thumbnailUrl && <img src={p.thumbnailUrl} alt="" width={40} height={40} className="rounded" style={{ objectFit: 'cover' }} />}
                        <span className="fw-semibold text-primary" style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/content/blog/${p.id}`)}>{p.title}</span>
                      </div>
                    </td>
                    <td className="small text-body-secondary">{p.author ?? '—'}</td>
                    <td><StatusBadge status={p.status === 'published' ? 'active' : 'draft'} label={p.status} /></td>
                    <td className="small text-body-secondary">{formatDate(p.updatedAt)}</td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-secondary" onClick={() => navigate(`/admin/content/blog/${p.id}`)}><i className="bi bi-pencil" /></button>
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
      <ConfirmDialog open={deleteId != null} title="Delete post?" message="This permanently deletes the post." confirmLabel="Delete" busy={del.isPending} onConfirm={async () => { if (deleteId != null) { await del.mutateAsync(deleteId); setDeleteId(null); toast.success('Deleted.'); } }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
