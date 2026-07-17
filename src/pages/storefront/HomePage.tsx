import { Link } from 'react-router-dom';
import { useStoreSettings } from '@/features/storefront/useStoreSettings';
import { Spinner } from '@/components/feedback/Spinner';
import styles from '@/components/storefront/Storefront.module.scss';

const HIGHLIGHTS = [
  { icon: 'bi-truck', title: 'Nationwide delivery', text: 'Fast, tracked shipping across the Philippines.' },
  { icon: 'bi-shield-check', title: 'Secure checkout', text: 'COD and trusted payment options.' },
  { icon: 'bi-arrow-repeat', title: 'Easy returns', text: 'Hassle-free returns within the return window.' },
];

export function HomePage() {
  const { data, isLoading } = useStoreSettings();
  const storeName = data?.store.name ?? 'Atlase';

  if (isLoading) return <Spinner center />;

  return (
    <div className="container py-4 py-lg-5">
      <section className={styles.hero}>
        <div className="row align-items-center g-4">
          <div className="col-lg-7">
            <span className="badge rounded-pill text-bg-light mb-3">New collection</span>
            <h1 className="display-5 fw-bold mb-3">Everyday essentials, thoughtfully made.</h1>
            <p className="fs-5 text-body-secondary mb-4" style={{ maxWidth: 520 }}>
              Discover quality products from {storeName}, delivered fast across the Philippines.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <Link to="/shop" className="btn btn-primary btn-lg">
                Shop now
              </Link>
              <Link to="/collections/best-sellers" className="btn btn-outline-secondary btn-lg">
                Best sellers
              </Link>
            </div>
          </div>
          <div className="col-lg-5 text-center d-none d-lg-block">
            <div
              className="d-inline-flex align-items-center justify-content-center"
              style={{ width: 240, height: 240, borderRadius: '50%', background: 'var(--at-primary)', color: '#fff' }}
              aria-hidden="true"
            >
              <i className="bi bi-bag-heart" style={{ fontSize: '6rem' }} />
            </div>
          </div>
        </div>
      </section>

      <section className="row g-3 mt-4">
        {HIGHLIGHTS.map((h) => (
          <div className="col-12 col-md-4" key={h.title}>
            <div className="at-card p-4 h-100">
              <i className={`bi ${h.icon} fs-3 text-primary`} aria-hidden="true" />
              <h2 className="h6 mt-2 mb-1">{h.title}</h2>
              <p className="text-body-secondary small mb-0">{h.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="text-center mt-5">
        <h2 className="h4 mb-2">Featured products</h2>
        <p className="text-body-secondary">
          Our catalog is being wired up — browse the shop to see what&apos;s in store.
        </p>
        <Link to="/shop" className="btn btn-primary">
          Browse the shop
        </Link>
      </section>
    </div>
  );
}
