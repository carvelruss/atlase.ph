import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStorefrontProducts } from '@/features/storefront/catalogApi';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { Pagination } from '@/components/common/Pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState(params.get('q') ?? '');
  const q = useDebouncedValue(term);

  const { data, isLoading } = useStorefrontProducts({ page, q: q || undefined });
  const items = data?.data.items ?? [];
  const meta = data?.meta;

  return (
    <div className="container py-4 py-lg-5">
      <h1 className="h3 mb-3">Search</h1>
      <div className="input-group mb-4" style={{ maxWidth: 520 }}>
        <span className="input-group-text bg-transparent">
          <i className="bi bi-search" aria-hidden="true" />
        </span>
        <input
          className="form-control"
          placeholder="Search products…"
          value={term}
          autoFocus
          onChange={(e) => {
            setTerm(e.target.value);
            setPage(1);
            setParams(e.target.value ? { q: e.target.value } : {}, { replace: true });
          }}
          aria-label="Search products"
        />
      </div>

      {q ? (
        <>
          <p className="text-body-secondary">
            {meta?.total ?? 0} result{(meta?.total ?? 0) === 1 ? '' : 's'} for “{q}”
          </p>
          <ProductGrid items={items} loading={isLoading} emptyTitle={`No results for “${q}”`} />
          {meta && meta.totalPages && meta.totalPages > 1 && (
            <div className="mt-4">
              <Pagination page={page} totalPages={meta.totalPages} onPage={setPage} />
            </div>
          )}
        </>
      ) : (
        <p className="text-body-secondary">Start typing to search the catalog.</p>
      )}
    </div>
  );
}
