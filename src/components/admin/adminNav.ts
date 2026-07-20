export interface NavChild {
  label: string;
  to: string;
  badgeKey?: string; // optional live count key (wired to overview counts)
}

export interface NavItem {
  label: string;
  icon: string; // bootstrap-icons class
  to: string; // leaf link
  badgeKey?: string; // optional live count key (wired to overview counts)
  children?: NavChild[]; // revealed inline when the section is active
}

/**
 * Admin sidebar information architecture — flat, single-level navigation matching
 * the seller-console reference design. The active section reveals its sub-pages
 * inline beneath it.
 */
export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', icon: 'bi-house-door', to: '/admin' },
  {
    label: 'Orders',
    icon: 'bi-receipt',
    to: '/admin/orders',
    badgeKey: 'ordersPending',
    children: [
      { label: 'All orders', to: '/admin/orders', badgeKey: 'ordersPending' },
      { label: 'Abandoned', to: '/admin/orders/abandoned' },
    ],
  },
  { label: 'Shipping', icon: 'bi-truck', to: '/admin/shipping/methods' },
  { label: 'Products', icon: 'bi-grid', to: '/admin/products' },
  { label: 'Analytics', icon: 'bi-bar-chart', to: '/admin/analytics/sales' },
  { label: 'Payments', icon: 'bi-credit-card', to: '/admin/payments/transactions' },
  { label: 'Discounts', icon: 'bi-percent', to: '/admin/marketing/discounts' },
  { label: 'Audience', icon: 'bi-people', to: '/admin/customers' },
  { label: 'Appearance', icon: 'bi-brush', to: '/admin/appearance/theme' },
  { label: 'Plugins', icon: 'bi-lightning-charge', to: '/admin/integrations' },
  { label: 'Settings', icon: 'bi-gear', to: '/admin/settings' },
];
