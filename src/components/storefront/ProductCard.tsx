import { Link } from 'react-router-dom';
import { money } from '@/lib/format';
import type { PublicProductCard } from '@/features/catalog/types';
import styles from './ProductCard.module.scss';

export function ProductCard({ product }: { product: PublicProductCard }) {
  const onSale = product.compareAtPrice != null && product.compareAtPrice > product.price;
  return (
    <Link to={`/products/${product.slug}`} className={styles.card}>
      <div className={styles.imageWrap}>
        {product.thumbnailUrl ? (
          <img src={product.thumbnailUrl} alt={product.name} loading="lazy" />
        ) : (
          <div className={styles.placeholder}>
            <i className="bi bi-image" aria-hidden="true" />
          </div>
        )}
        {onSale && <span className={styles.saleTag}>Sale</span>}
        {!product.inStock && <span className={styles.soldOut}>Sold out</span>}
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{product.name}</h3>
        <div className={styles.priceRow}>
          <span className={styles.price}>{money(product.price)}</span>
          {onSale && <span className={styles.compare}>{money(product.compareAtPrice!)}</span>}
        </div>
      </div>
    </Link>
  );
}
