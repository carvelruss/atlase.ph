import { Link } from 'react-router-dom';
import type { StoreMenuLink } from '@/features/storefront/useStoreSettings';
import styles from './Storefront.module.scss';

interface StoreFooterProps {
  storeName: string;
  supportEmail?: string | null;
  nav: StoreMenuLink[];
}

export function StoreFooter({ storeName, supportEmail, nav }: StoreFooterProps) {
  const year = 2026; // build-time constant; keep in sync at release
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className="row g-4">
          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <img src="/favicon.svg" alt="" width={26} height={26} />
              <span className="fw-bold text-white fs-5">{storeName}</span>
            </div>
            <p className="small mb-0" style={{ maxWidth: 320 }}>
              Quality products with fast, reliable delivery across the Philippines.
            </p>
          </div>
          <div className="col-6 col-md-4">
            <h3 className="h6 text-white mb-3">Shop</h3>
            <Link to="/shop" className={styles.footerLink}>
              All products
            </Link>
            {nav.map((item) => (
              <Link key={item.label} to={item.url ?? '#'} className={styles.footerLink}>
                {item.label}
              </Link>
            ))}
          </div>
          <div className="col-6 col-md-4">
            <h3 className="h6 text-white mb-3">Help</h3>
            <Link to="/track-order" className={styles.footerLink}>
              Track order
            </Link>
            <Link to="/pages/shipping-policy" className={styles.footerLink}>
              Shipping policy
            </Link>
            <Link to="/pages/refund-policy" className={styles.footerLink}>
              Returns &amp; refunds
            </Link>
            <Link to="/contact" className={styles.footerLink}>
              Contact us
            </Link>
            {supportEmail && (
              <a href={`mailto:${supportEmail}`} className={styles.footerLink}>
                {supportEmail}
              </a>
            )}
          </div>
        </div>
        <hr className="my-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <div className="d-flex flex-wrap justify-content-between gap-2 small">
          <span>
            © {year} {storeName}. All rights reserved.
          </span>
          <span>Powered by Atlase</span>
        </div>
      </div>
    </footer>
  );
}
