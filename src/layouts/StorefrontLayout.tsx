import { Outlet } from 'react-router-dom';
import { StoreHeader } from '@/components/storefront/StoreHeader';
import { StoreFooter } from '@/components/storefront/StoreFooter';
import { useStoreSettings } from '@/features/storefront/useStoreSettings';

export function StorefrontLayout() {
  const { data } = useStoreSettings();
  const storeName = data?.store.name ?? 'Atlase';
  const headerNav = data?.menus.header ?? [];
  const footerNav = data?.menus.footer ?? headerNav;

  return (
    <div className="d-flex flex-column min-vh-100">
      <StoreHeader storeName={storeName} nav={headerNav} />
      <main className="flex-grow-1">
        <Outlet />
      </main>
      <StoreFooter storeName={storeName} supportEmail={data?.store.supportEmail} nav={footerNav} />
    </div>
  );
}
