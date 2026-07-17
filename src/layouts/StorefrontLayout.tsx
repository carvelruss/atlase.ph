import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { StoreHeader } from '@/components/storefront/StoreHeader';
import { StoreFooter } from '@/components/storefront/StoreFooter';
import { useStoreSettings } from '@/features/storefront/useStoreSettings';
import { useCartCount } from '@/features/cart/api';
import { usePageViewTracking } from '@/features/storefront/tracker';
import { Spinner } from '@/components/feedback/Spinner';

export function StorefrontLayout() {
  const { data } = useStoreSettings();
  const cartCount = useCartCount();
  usePageViewTracking();
  const storeName = data?.store.name ?? 'Atlase';
  const headerNav = data?.menus.header ?? [];
  const footerNav = data?.menus.footer ?? headerNav;

  return (
    <div className="d-flex flex-column min-vh-100">
      <a href="#main-content" className="at-skip-link">Skip to content</a>
      <StoreHeader storeName={storeName} nav={headerNav} cartCount={cartCount} />
      <main className="flex-grow-1" id="main-content">
        <Suspense fallback={<Spinner center />}>
          <Outlet />
        </Suspense>
      </main>
      <StoreFooter storeName={storeName} supportEmail={data?.store.supportEmail} nav={footerNav} />
    </div>
  );
}
