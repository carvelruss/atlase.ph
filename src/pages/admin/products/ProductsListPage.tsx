import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Pagination } from '@/components/common/Pagination';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/feedback/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { money, formatDate } from '@/lib/format';
import { useProducts, useBulkProducts, useDeleteProduct } from '@/features/products/api';
import { PRODUCT_STATUSES } from '@shared/constants/index';

export function ProductsListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [rawSearch, setRawSearch] = useState('');
  const search = useDebouncedValue(rawSearch);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading, isError, refetch } = useProducts({ page, q: search || undefined, status: status || undefined });
  const bulk = useBulkProducts();
  const del = useDeleteProduct();

  const items = data?.data.items ?? [];
  const meta = data?.meta;
  const allSelected = items.length > 0 && items.every((p) => selected.has(p.id));

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(items.map((p) => p.id)));
  };
  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function runBulk(action: string) {
    if (selected.size === 0) return;
    try {
      await bulk.mutateAsync({ ids: [...selected], action });
      toast.success(`Updated ${selected.size} product${selected.size === 1 ? '' : 's'}.`);
      setSelected(new Set());
    } catch {
      toast.error('Bulk action failed.');
    }
  }

  async function confirmDelete() {
    if (deleteId == null) return;
    try {
      await del.mutateAsync(deleteId);
      toast.success('Product archived.');
    } catch {
      toast.error('Could not archive product.');
    } finally {
      setDeleteId(null);
    }
  }

  const statusOptions = useMemo(() => ['', ...PRODUCT_STATUSES], []);

  return (
    <div>
      <PageHeader
        title="Products"
        description="Create and manage the products in your catalog."
        actions={
          <Link to="/admin/products/new" className="btn btn-primary btn-sm">
            <i className="bi bi-plus-lg me-1" aria-hidden="true" />
            Add product
          </Link>
        }
      />

      <div className="at-card p-3 mb-3">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-transparent">
                <i className="bi bi-search" aria-hidden="true" />
              </span>
              <input
                className="form-control"
                placeholder="Search by name or SKU…"
                value={rawSearch}
                onChange={(e) => {
                  setRawSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search products"
              />
            </div>
          </div>
          <div className="col-auto">
            <select
              className="form-select form-select-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s ? s[0]!.toUpperCase() + s.slice(1) : 'All statuses'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="d-flex align-items-center gap-2 mt-3 p-2 rounded" style={{ background: 'var(--at-primary-soft)' }}>
            <span className="small fw-medium">{selected.size} selected</span>
            <div className="btn-group btn-group-sm ms-auto">
              <button className="btn btn-outline-secondary" onClick={() => runBulk('activate')} disabled={bulk.isPending}>
                Activate
              </button>
              <button className="btn btn-outline-secondary" onClick={() => runBulk('deactivate')} disabled={bulk.isPending}>
                Set draft
              </button>
              <button className="btn btn-outline-secondary" onClick={() => runBulk('archive')} disabled={bulk.isPending}>
                Archive
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="at-card">
        {isLoading ? (
          <Spinner center />
        ) : isError ? (
          <EmptyState icon="bi-exclamation-triangle" title="Couldn't load products" action={<button className="btn btn-sm btn-primary" onClick={() => refetch()}>Retry</button>} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="bi-box-seam"
            title="No products yet"
            description="Add your first product to start selling."
            action={<Link to="/admin/products/new" className="btn btn-primary btn-sm">Add product</Link>}
          />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr className="small text-body-secondary">
                  <th style={{ width: 36 }}>
                    <input type="checkbox" className="form-check-input" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                  </th>
                  <th>Product</th>
                  <th>Status</th>
                  <th className="text-end">Price</th>
                  <th className="text-end">Inventory</th>
                  <th>Updated</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <input type="checkbox" className="form-check-input" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} aria-label={`Select ${p.name}`} />
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="rounded border bg-body-tertiary d-flex align-items-center justify-content-center overflow-hidden" style={{ width: 40, height: 40, flexShrink: 0 }}>
                          {p.thumbnailUrl ? (
                            <img src={p.thumbnailUrl} alt="" width={40} height={40} style={{ objectFit: 'cover' }} />
                          ) : (
                            <i className="bi bi-image text-body-secondary" aria-hidden="true" />
                          )}
                        </div>
                        <div>
                          <Link to={`/admin/products/${p.id}`} className="fw-semibold text-body">
                            {p.name}
                          </Link>
                          {p.isFeatured && <span className="badge text-bg-warning ms-2">Featured</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="text-end at-mono">{money(p.price)}</td>
                    <td className="text-end at-mono">{p.inventory}</td>
                    <td className="small text-body-secondary">{formatDate(p.updatedAt)}</td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-secondary" onClick={() => navigate(`/admin/products/${p.id}`)} aria-label="Edit">
                          <i className="bi bi-pencil" aria-hidden="true" />
                        </button>
                        <button className="btn btn-outline-danger" onClick={() => setDeleteId(p.id)} aria-label="Delete">
                          <i className="bi bi-trash" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta && (
          <div className="p-3 border-top">
            <Pagination page={page} totalPages={meta.totalPages ?? 1} total={meta.total} onPage={setPage} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteId != null}
        title="Archive product?"
        message="This archives the product and hides it from the storefront. Existing orders keep their records."
        confirmLabel="Archive"
        busy={del.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
