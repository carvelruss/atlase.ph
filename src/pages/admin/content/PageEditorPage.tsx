import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Spinner } from '@/components/feedback/Spinner';
import { RichTextEditor } from '@/components/forms/RichTextEditor';
import { useToast } from '@/components/feedback/Toast';
import { usePage, useSavePage, type PageInput } from '@/features/content/api';

const blank: PageInput = { title: '', content: '', status: 'draft', seoTitle: '', seoDescription: '' };

export function PageEditorPage() {
  const { pageId } = useParams();
  const isNew = !pageId || pageId === 'new';
  const id = isNew ? null : Number(pageId);
  const navigate = useNavigate();
  const toast = useToast();
  const { data: loaded, isLoading } = usePage(id);
  const save = useSavePage(id);
  const [form, setForm] = useState<PageInput>(blank);

  useEffect(() => {
    if (loaded) setForm({ title: loaded.title, slug: loaded.slug, content: loaded.content ?? '', status: loaded.status as 'draft' | 'published', seoTitle: loaded.seoTitle ?? '', seoDescription: loaded.seoDescription ?? '' });
  }, [loaded]);

  async function onSave() {
    if (!form.title.trim()) { toast.error('Title is required.'); return; }
    try {
      const result = await save.mutateAsync(form);
      toast.success('Page saved.');
      if (isNew) navigate(`/admin/content/pages/${result.id}`, { replace: true });
    } catch { toast.error('Could not save page.'); }
  }

  if (!isNew && isLoading) return <Spinner center />;

  return (
    <div>
      <PageHeader title={isNew ? 'Add page' : form.title || 'Edit page'} breadcrumbs={[{ label: 'Pages', href: '/admin/content/pages' }, { label: isNew ? 'New' : 'Edit' }]}
        actions={<><button className="btn btn-sm btn-light" onClick={() => navigate('/admin/content/pages')}>Cancel</button><button className="btn btn-sm btn-primary" onClick={onSave} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button></>} />
      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="at-card p-3 p-md-4 mb-3">
            <div className="mb-3"><label className="form-label">Title</label><input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <label className="form-label">Content</label>
            <RichTextEditor value={form.content ?? ''} onChange={(html) => setForm({ ...form, content: html })} />
          </div>
          <div className="at-card p-3 p-md-4">
            <h2 className="h6 mb-3">Search engine listing</h2>
            <div className="mb-3"><label className="form-label small">SEO title</label><input className="form-control" value={form.seoTitle ?? ''} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} /></div>
            <div><label className="form-label small">Meta description</label><textarea className="form-control" rows={2} value={form.seoDescription ?? ''} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} /></div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="at-card p-3 p-md-4">
            <h2 className="h6 mb-3">Visibility</h2>
            <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'draft' | 'published' })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
