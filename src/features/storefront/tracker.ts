import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type EventType = 'page_view' | 'product_view' | 'add_to_cart' | 'checkout_start' | 'purchase';

/** Fire a first-party analytics beacon. Non-blocking and failure-tolerant. */
export function track(type: EventType, payload: { path?: string; productId?: number; value?: number } = {}): void {
  try {
    void fetch('/api/storefront/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify({ type, ...payload }),
    }).catch(() => undefined);
  } catch {
    // analytics must never break the storefront
  }
}

/** Fire a page_view on each storefront navigation (never on /admin routes). */
export function usePageViewTracking(): void {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;
    track('page_view', { path: location.pathname });
  }, [location.pathname]);
}
