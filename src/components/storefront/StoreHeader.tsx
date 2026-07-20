import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import type { StoreMenuLink } from '@/features/storefront/useStoreSettings';
import styles from './Storefront.module.scss';

interface StoreHeaderProps {
  storeName: string;
  nav: StoreMenuLink[];
  announcement?: string;
  cartCount?: number;
}

export function StoreHeader({ storeName, nav, announcement, cartCount = 0 }: StoreHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header>
      {announcement && (
        <div className={styles.announcement}>
          <div className="container text-center small">{announcement}</div>
        </div>
      )}
      <div className={styles.header}>
        <div className="container d-flex align-items-center gap-3">
          <button
            type="button"
            className={`btn btn-link d-lg-none p-0 ${styles.iconButton}`}
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <i className="bi bi-list" />
          </button>

          <Link to="/" className={styles.logo}>
            <img src="/atlase-logo-black.svg" alt="" width={28} height={28} />
            <span>{storeName}</span>
          </Link>

          <nav className={`${styles.desktopNav} d-none d-lg-flex`} aria-label="Primary">
            {nav.map((item) => (
              <NavLink
                key={item.label}
                to={item.url ?? '#'}
                className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ms-auto d-flex align-items-center gap-1">
            <Link to="/search" className={styles.iconButton} aria-label="Search">
              <i className="bi bi-search" />
            </Link>
            <Link to="/account" className={styles.iconButton} aria-label="Account">
              <i className="bi bi-person" />
            </Link>
            <Link to="/cart" className={`${styles.iconButton} position-relative`} aria-label="Cart">
              <i className="bi bi-bag" />
              {cartCount > 0 && <span className={styles.cartBadge}>{cartCount}</span>}
            </Link>
          </div>
        </div>

        {open && (
          <nav className={`${styles.mobileNav} d-lg-none`} aria-label="Mobile">
            {nav.map((item) => (
              <Link key={item.label} to={item.url ?? '#'} onClick={() => setOpen(false)} className={styles.mobileNavLink}>
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
