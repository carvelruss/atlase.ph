import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Modal } from '@/components/common/Modal';
import { Pagination } from '@/components/common/Pagination';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useToast } from '@/components/feedback/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useInventory, useAdjustInventory } from '@/features/inventory/api';
import type { InventoryRow } from '@/features/catalog/types';

const STATE_LABEL: Record<string, string> = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
  not_tracked: 'Not tracked',
};
const STATE_BADGE: Record<string, string> = { in_stock: 'active', low_stock: 'pending', out_of_stock: 'failed', not_tracked: 'draft' };

export function InventoryPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [rawSearch, setRawSearch] = useState('');
  const search = useDebouncedValue(rawSearch);
  const [stateFilter, setStateFilter] = useState('');
  const [adjust, setAdjust] = useState<{ row: InventoryRow; delta: string; reason: string; note: string } | null>(null);

  const { data, isLoading } = useInventory({ page, q: search || undefined, state: stateFilter || undefined });
  const adjustMut = useAdjustInventory();
  const items = data?.data.items ?? [];
  const meta = data?.meta;

  async function submitAdjust() {
    if (!adjust) return;
    const delta = Number(adjust.delta);
    if (!Number.isFinite(delta) || delta === 0) {
      toast.error('Enter a non-zero adjustment.');
      return;
    }
    try {
      await adjustMut.mutateAsync({ variantId: adjust.row.variantId, delta, reason: adjust.reason, note: adjust.note || undefined });
      toast.success('Inventory adjusted.');
      setAdjust(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Adjustment failed.');
    }
  }

  return (
    <div>
      <PageHeader title="Inventory" description="Track and adjust stock across your product variants." />

      <div className="at-card p-3 mb-3">
        <div className="row g-2">
          <div className="col-12 col-md">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-transparent">
                <i className="bi bi-search" />
              </span>
              <input className="form-control" placeholder="Search by product or SKU…" value={rawSearch} onChange={(e) => { setRawSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
          <div className="col-auto">
            <select className="form-select form-select-sm" value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}>
              <option value="">All stock</option>
              <option value="low_stock">Low stock</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </div>
        </div>
      </div>

      <div className="at-card">
        {isLoading ? (
          <Spinner center />
        ) : items.length === 0 ? (
          <EmptyState icon="bi-boxes" title="No inventory yet" description="Inventory appears once you add products with tracked stock." />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr className="small text-body-secondary">
                  <th>Product</th>
                  <th>SKU</th>
                  <th className="text-end">On hand</th>
                  <th className="text-end">Reserved</th>
                  <th className="text-end">Available</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.variantId}>
                    <td>
                      <div className="fw-semibold">{r.productName}</div>
                      {r.variantTitle !== 'Default' && <div className="small text-body-secondary">{r.variantTitle}</div>}
                    </td>
                    <td className="small text-body-secondary at-mono">{r.sku ?? '—'}</td>
                    <td className="text-end at-mono">{r.onHand}</td>
                    <td className="text-end at-mono">{r.reserved}</td>
                    <td className="text-end at-mono fw-semibold">{r.available}</td>
                    <td>
                      <StatusBadge status={STATE_BADGE[r.state] ?? 'draft'} label={STATE_LABEL[r.state]} />
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setAdjust({ row: r, delta: '', reason: 'received', note: '' })}>
                        Adjust
                      </button>
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

      <Modal
        open={adjust != null}
        onClose={() => setAdjust(null)}
        title="Adjust inventory"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setAdjust(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={submitAdjust} disabled={adjustMut.isPending}>
              {adjustMut.isPending ? 'Saving…' : 'Apply adjustment'}
            </button>
          </>
        }
      >
        {adjust && (
          <div className="vstack gap-3">
            <div>
              <div className="fw-semibold">{adjust.row.productName}</div>
              <div className="small text-body-secondary">Current available: {adjust.row.available}</div>
            </div>
            <div>
              <label className="form-label">Change (use negative to remove)</label>
              <input type="number" className="form-control" value={adjust.delta} onChange={(e) => setAdjust({ ...adjust, delta: e.target.value })} autoFocus />
            </div>
            <div>
              <label className="form-label">Reason</label>
              <select className="form-select" value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })}>
                <option value="received">Stock received</option>
                <option value="correction">Correction</option>
                <option value="damaged">Damaged</option>
                <option value="returned">Returned</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="form-label">Note (optional)</label>
              <input className="form-control" value={adjust.note} onChange={(e) => setAdjust({ ...adjust, note: e.target.value })} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
