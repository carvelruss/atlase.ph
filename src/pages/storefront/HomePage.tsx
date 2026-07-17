import { Link } from 'react-router-dom';
import { useHomepage } from '@/features/storefront/catalogApi';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { Spinner } from '@/components/feedback/Spinner';
import styles from '@/components/storefront/Storefront.module.scss';

const HIGHLIGHTS = [
  { icon: 'bi-truck', title: 'Nationwide delivery', text: 'Fast, tracked shipping across the Philippines.' },
  { icon: 'bi-shield-check', title: 'Secure checkout', text: 'COD and trusted payment options.' },
  { icon: 'bi-arrow-repeat', title: 'Easy returns', text: 'Hassle-free returns within the return window.' },
];

interface HeroSettings {
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function HomePage() {
  const { data, isLoading } = useHomepage();
  if (isLoading) return <Spinner center />;

  const hero = (data?.sections.find((s) => s.type === 'hero')?.settings ?? {}) as HeroSettings;
  const announcement = data?.sections.find((s) => s.type === 'announcement')?.settings as { text?: string } | undefined;
  const featured = data?.featuredProducts ?? [];
  const categories = data?.featuredCategories ?? [];

  return (
    <div>
      {announcement?.text && (
        <div className="text-center py-2 small text-white" style={{ background: 'var(--at-heading)' }}>
          {announcement.text}
        </div>
      )}

      <div className="container py-4 py-lg-5">
        <section className={styles.hero}>
          <div className="row align-items-center g-4">
            <div className="col-lg-7">
              <h1 className="display-5 fw-bold mb-3">{hero.heading ?? 'Everyday essentials, thoughtfully made.'}</h1>
              <p className="fs-5 text-body-secondary mb-4" style={{ maxWidth: 520 }}>
                {hero.subheading ?? 'Discover quality products, delivered fast across the Philippines.'}
              </p>
              <div className="d-flex flex-wrap gap-2">
                <Link to={hero.ctaHref ?? '/shop'} className="btn btn-primary btn-lg">
                  {hero.ctaLabel ?? 'Shop now'}
                </Link>
                <Link to="/collections/best-sellers" className="btn btn-outline-secondary btn-lg">
                  Best sellers
                </Link>
              </div>
            </div>
            <div className="col-lg-5 text-center d-none d-lg-block">
              <div className="d-inline-flex align-items-center justify-content-center" style={{ width: 240, height: 240, borderRadius: '50%', background: 'var(--at-primary)', color: '#fff' }} aria-hidden="true">
                <i className="bi bi-bag-heart" style={{ fontSize: '6rem' }} />
              </div>
            </div>
          </div>
        </section>

        {categories.length > 0 && (
          <section className="mt-5">
            <h2 className="h4 mb-3">Shop by category</h2>
            <div className="row g-3">
              {categories.map((c) => (
                <div className="col-6 col-md-3" key={c.id}>
                  <Link to={`/categories/${c.slug}`} className="at-card d-block p-4 text-center text-decoration-none text-body h-100">
                    <i className="bi bi-grid-3x3-gap fs-3 text-primary" aria-hidden="true" />
                    <div className="fw-semibold mt-2">{c.name}</div>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-5">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h4 mb-0">Featured products</h2>
            <Link to="/shop" className="btn btn-sm btn-link">View all</Link>
          </div>
          {featured.length > 0 ? (
            <ProductGrid items={featured} />
          ) : (
            <div className="text-center text-body-secondary py-4">
              <p>No featured products yet.</p>
              <Link to="/shop" className="btn btn-primary btn-sm">Browse the shop</Link>
            </div>
          )}
        </section>

        <section className="row g-3 mt-4">
          {HIGHLIGHTS.map((h) => (
            <div className="col-12 col-md-4" key={h.title}>
              <div className="at-card p-4 h-100">
                <i className={`bi ${h.icon} fs-3 text-primary`} aria-hidden="true" />
                <h3 className="h6 mt-2 mb-1">{h.title}</h3>
                <p className="text-body-secondary small mb-0">{h.text}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
