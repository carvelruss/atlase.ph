import { useRef, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/feedback/Toast';
import { useMedia, useDeleteMedia } from '@/features/content/api';
import { uploadImage } from '@/features/products/api';
import styles from './MediaLibrary.module.scss';

export function MediaLibraryPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = useMedia({ page });
  const del = useDeleteMedia();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const items = data?.data.items ?? [];
  const meta = data?.meta;

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) await uploadImage(file, 'uploads');
      await refetch();
      toast.success('Uploaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function copyUrl(url: string) {
    void navigator.clipboard.writeText(new URL(url, window.location.origin).href);
    toast.success('URL copied.');
  }

  return (
    <div>
      <PageHeader title="Media library" description="Images used across your store." actions={<button className="btn btn-sm btn-primary" onClick={() => inputRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading…' : <><i className="bi bi-upload me-1" />Upload</>}</button>} />
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />

      <div className="at-card p-3">
        {isLoading ? <Spinner center /> : items.length === 0 ? (
          <EmptyState icon="bi-images" title="No media yet" description="Upload images to reuse across products and content." />
        ) : (
          <div className={styles.grid}>
            {items.map((m) => (
              <div key={m.id} className={styles.tile}>
                <img src={m.url} alt={m.altText ?? m.fileName} loading="lazy" />
                <div className={styles.overlay}>
                  <button className="btn btn-sm btn-light" onClick={() => copyUrl(m.url)} title="Copy URL"><i className="bi bi-link-45deg" /></button>
                  <button className="btn btn-sm btn-light text-danger" onClick={() => setDeleteId(m.id)} title="Delete"><i className="bi bi-trash" /></button>
                </div>
                <div className={styles.name} title={m.fileName}>{m.fileName}</div>
              </div>
            ))}
          </div>
        )}
        {meta && <div className="pt-3 mt-2 border-top"><Pagination page={page} totalPages={meta.totalPages ?? 1} total={meta.total} onPage={setPage} /></div>}
      </div>

      <ConfirmDialog open={deleteId != null} title="Delete image?" message="If this image is in use, deletion will be blocked." confirmLabel="Delete" busy={del.isPending} onConfirm={async () => { if (deleteId != null) { try { await del.mutateAsync(deleteId); toast.success('Deleted.'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not delete.'); } setDeleteId(null); } }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
