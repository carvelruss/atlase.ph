import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Spinner } from '@/components/feedback/Spinner';
import { RichTextEditor } from '@/components/forms/RichTextEditor';
import { ImageUploader } from '@/components/forms/ImageUploader';
import { useToast } from '@/components/feedback/Toast';
import { useBlogPost, useSaveBlogPost, type BlogInput } from '@/features/content/api';
import type { ProductImageInput } from '@/features/catalog/types';

const blank: BlogInput = { title: '', excerpt: '', body: '', author: '', status: 'draft', featuredImageAssetId: null };

export function BlogEditorPage() {
  const { postId } = useParams();
  const isNew = !postId || postId === 'new';
  const id = isNew ? null : Number(postId);
  const navigate = useNavigate();
  const toast = useToast();
  const { data: loaded, isLoading } = useBlogPost(id);
  const save = useSaveBlogPost(id);
  const [form, setForm] = useState<BlogInput>(blank);
  const [image, setImage] = useState<ProductImageInput[]>([]);

  useEffect(() => {
    if (loaded) {
      setForm({ title: loaded.title, slug: loaded.slug, excerpt: loaded.excerpt ?? '', overview: loaded.overview ?? '', body: loaded.body ?? '', author: loaded.author ?? '', featuredImageAssetId: loaded.featuredImageAssetId, status: loaded.status as 'draft' | 'published', seoTitle: loaded.seoTitle ?? '', seoDescription: loaded.seoDescription ?? '' });
    }
  }, [loaded]);

  async function onSave() {
    if (!form.title.trim()) { toast.error('Title is required.'); return; }
    try {
      const result = await save.mutateAsync({ ...form, featuredImageAssetId: image[0]?.assetId ?? form.featuredImageAssetId ?? null });
      toast.success('Post saved.');
      if (isNew) navigate(`/admin/content/blog/${result.id}`, { replace: true });
    } catch { toast.error('Could not save post.'); }
  }

  if (!isNew && isLoading) return <Spinner center />;

  return (
    <div>
      <PageHeader title={isNew ? 'New post' : form.title || 'Edit post'} breadcrumbs={[{ label: 'Blog', href: '/admin/content/blog' }, { label: isNew ? 'New' : 'Edit' }]}
        actions={<><button className="btn btn-sm btn-light" onClick={() => navigate('/admin/content/blog')}>Cancel</button><button className="btn btn-sm btn-primary" onClick={onSave} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button></>} />
      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="at-card p-3 p-md-4 mb-3">
            <div className="mb-3"><label className="form-label">Title</label><input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="mb-3"><label className="form-label">Excerpt</label><textarea className="form-control" rows={2} value={form.excerpt ?? ''} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></div>
            <label className="form-label">Body</label>
            <RichTextEditor value={form.body ?? ''} onChange={(html) => setForm({ ...form, body: html })} />
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="at-card p-3 p-md-4 mb-3">
            <h2 className="h6 mb-3">Publish</h2>
            <select className="form-select mb-3" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'draft' | 'published' })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <label className="form-label small">Author</label>
            <input className="form-control" value={form.author ?? ''} onChange={(e) => setForm({ ...form, author: e.target.value })} />
          </div>
          <div className="at-card p-3 p-md-4">
            <h2 className="h6 mb-3">Featured image</h2>
            <ImageUploader value={image} onChange={setImage} folder="blog" entityId={id ?? undefined} />
          </div>
        </div>
      </div>
    </div>
  );
}
