import { useState } from 'react';
import { useStorefrontProducts } from '@/features/storefront/catalogApi';
import { useStoreSettings } from '@/features/storefront/useStoreSettings';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { Pagination } from '@/components/common/Pagination';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'featured', label: 'Featured' },
  { value: 'popularity', label: 'Popularity' },
];

export function ShopPage() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const [category, setCategory] = useState('');
  const [inStock, setInStock] = useState(false);

  const { data, isLoading } = useStorefrontProducts({ page, sort, category: category || undefined, inStock });
  const { data: settings } = useStoreSettings();
  const items = data?.data.items ?? [];
  const meta = data?.meta;

  return (
    <div className="container py-4 py-lg-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h1 className="h3 mb-0">Shop</h1>
        <div className="d-flex gap-2">
          <select className="form-select form-select-sm" style={{ width: 'auto' }} value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} aria-label="Sort">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="row g-4">
        <aside className="col-12 col-lg-3">
          <div className="at-card p-3">
            <h2 className="h6">Filter</h2>
            <div className="mb-3">
              <label className="form-label small">Category</label>
              <select className="form-select form-select-sm" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                <option value="">All categories</option>
                {(settings?.categories ?? []).map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="inStock" checked={inStock} onChange={(e) => { setInStock(e.target.checked); setPage(1); }} />
              <label className="form-check-label small" htmlFor="inStock">In stock only</label>
            </div>
          </div>
        </aside>

        <div className="col-12 col-lg-9">
          <ProductGrid items={items} loading={isLoading} />
          {meta && meta.totalPages && meta.totalPages > 1 && (
            <div className="mt-4">
              <Pagination page={page} totalPages={meta.totalPages} onPage={setPage} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
