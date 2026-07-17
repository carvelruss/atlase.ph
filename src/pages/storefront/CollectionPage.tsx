import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCollection } from '@/features/storefront/catalogApi';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { Pagination } from '@/components/common/Pagination';
import { Spinner } from '@/components/feedback/Spinner';

export function CollectionPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('featured');
  const { data, isLoading } = useCollection(slug, page, sort);
  const collection = data?.data.collection;
  const items = data?.data.items ?? [];
  const meta = data?.meta;

  return (
    <div className="container py-4 py-lg-5">
      {isLoading && !data ? (
        <Spinner center />
      ) : (
        <>
          <div className="mb-4">
            <h1 className="h3 mb-1">{collection?.name ?? 'Collection'}</h1>
            {collection?.description && <p className="text-body-secondary">{collection.description}</p>}
          </div>
          <div className="d-flex justify-content-end mb-3">
            <select className="form-select form-select-sm" style={{ width: 'auto' }} value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} aria-label="Sort">
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
          <ProductGrid items={items} loading={isLoading} />
          {meta && meta.totalPages && meta.totalPages > 1 && (
            <div className="mt-4">
              <Pagination page={page} totalPages={meta.totalPages} onPage={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
