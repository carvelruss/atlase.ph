import { ProductCard } from './ProductCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import type { PublicProductCard } from '@/features/catalog/types';

interface ProductGridProps {
  items: PublicProductCard[];
  loading?: boolean;
  emptyTitle?: string;
}

export function ProductGrid({ items, loading, emptyTitle = 'No products found' }: ProductGridProps) {
  if (loading) {
    return (
      <div className="row g-3 g-md-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div className="col-6 col-md-4 col-lg-3" key={i}>
            <div className="placeholder-glow">
              <div className="placeholder col-12 rounded" style={{ aspectRatio: '1', display: 'block' }} />
              <div className="placeholder col-8 mt-2" />
              <div className="placeholder col-4 mt-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState icon="bi-search" title={emptyTitle} description="Try adjusting your filters or search." />;
  }

  return (
    <div className="row g-3 g-md-4">
      {items.map((p) => (
        <div className="col-6 col-md-4 col-lg-3" key={p.id}>
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}
