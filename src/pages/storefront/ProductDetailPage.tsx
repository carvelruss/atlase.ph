import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStorefrontProduct } from '@/features/storefront/catalogApi';
import { useAddToCart } from '@/features/cart/api';
import { useToast } from '@/components/feedback/Toast';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ApiError } from '@/lib/api';
import { money } from '@/lib/format';
import styles from './ProductDetail.module.scss';

export function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: product, isLoading, isError } = useStorefrontProduct(slug);
  const addToCart = useAddToCart();

  const [selected, setSelected] = useState<Record<number, number>>({});
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);

  const selectedVariant = useMemo(() => {
    if (!product) return null;
    if (product.options.length === 0) return product.variants[0] ?? null;
    const chosen = Object.values(selected);
    if (chosen.length !== product.options.length) return null;
    return product.variants.find((v) => chosen.every((id) => v.optionValueIds.includes(id))) ?? null;
  }, [product, selected]);

  if (isLoading) return <Spinner center />;
  if (isError || !product) {
    return (
      <div className="container py-5">
        <EmptyState icon="bi-box" title="Product not found" description="This product may no longer be available." action={<Link to="/shop" className="btn btn-primary btn-sm">Back to shop</Link>} />
      </div>
    );
  }

  const price = selectedVariant?.price ?? product.price;
  const compareAt = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const onSale = compareAt != null && compareAt > price;
  const canBuy = selectedVariant?.available ?? product.inStock;

  async function onAdd() {
    if (!selectedVariant) {
      toast.error('Please select all options.');
      return;
    }
    try {
      await addToCart.mutateAsync({ variantId: selectedVariant.id, quantity: qty });
      toast.success('Added to cart.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not add to cart.');
    }
  }

  async function onBuyNow() {
    await onAdd();
    if (selectedVariant) navigate('/cart');
  }

  return (
    <div className="container py-4 py-lg-5">
      <nav aria-label="Breadcrumb" className="small mb-3">
        <Link to="/shop">Shop</Link> <span className="text-body-secondary">/ {product.name}</span>
      </nav>

      <div className="row g-4 g-lg-5">
        <div className="col-12 col-lg-6">
          <div className={styles.gallery}>
            <div className={styles.mainImage}>
              {product.images.length > 0 ? (
                <img src={product.images[activeImage]?.url} alt={product.images[activeImage]?.altText ?? product.name} />
              ) : (
                <div className={styles.noImage}>
                  <i className="bi bi-image" aria-hidden="true" />
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className={styles.thumbs}>
                {product.images.map((img, i) => (
                  <button key={i} className={`${styles.thumb} ${i === activeImage ? styles.thumbActive : ''}`} onClick={() => setActiveImage(i)} aria-label={`Image ${i + 1}`}>
                    <img src={img.url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-6">
          {product.brand && <div className="text-body-secondary small text-uppercase">{product.brand}</div>}
          <h1 className="h2 mb-2">{product.name}</h1>

          <div className="d-flex align-items-baseline gap-2 mb-3">
            <span className="h4 mb-0">{money(price)}</span>
            {onSale && <span className="text-body-secondary text-decoration-line-through">{money(compareAt!)}</span>}
            {onSale && <span className="badge text-bg-warning">Sale</span>}
          </div>

          {product.shortDescription && <p className="text-body-secondary">{product.shortDescription}</p>}

          {product.options.map((opt) => (
            <div className="mb-3" key={opt.id}>
              <label className="form-label small fw-semibold">{opt.name}</label>
              <div className="d-flex flex-wrap gap-2">
                {opt.values.map((val) => {
                  const isSel = selected[opt.id] === val.id;
                  return (
                    <button
                      key={val.id}
                      type="button"
                      className={`btn btn-sm ${isSel ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setSelected((prev) => ({ ...prev, [opt.id]: val.id }))}
                    >
                      {val.value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="d-flex align-items-center gap-2 mb-3" style={{ maxWidth: 320 }}>
            <label className="form-label small mb-0">Qty</label>
            <input type="number" min={1} className="form-control form-control-sm" style={{ width: 80 }} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
            <span className={`small ${canBuy ? 'text-success' : 'text-danger'}`}>
              <i className={`bi ${canBuy ? 'bi-check-circle' : 'bi-x-circle'} me-1`} />
              {canBuy ? 'In stock' : 'Out of stock'}
            </span>
          </div>

          <div className="d-flex flex-wrap gap-2 mb-4">
            <button className="btn btn-primary btn-lg flex-grow-1" onClick={onAdd} disabled={!canBuy || addToCart.isPending}>
              {addToCart.isPending ? 'Adding…' : 'Add to cart'}
            </button>
            <button className="btn btn-outline-primary btn-lg flex-grow-1" onClick={onBuyNow} disabled={!canBuy || addToCart.isPending}>
              Buy now
            </button>
          </div>

          {product.description && (
            <div className="pt-3 border-top">
              <h2 className="h6">Details</h2>
              <div dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          )}
        </div>
      </div>

      {product.related.length > 0 && (
        <section className="mt-5">
          <h2 className="h4 mb-3">You may also like</h2>
          <ProductGrid items={product.related} />
        </section>
      )}
    </div>
  );
}
