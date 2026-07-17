export interface NavChild {
  label: string;
  to: string;
}

export interface NavItem {
  label: string;
  icon: string; // bootstrap-icons class
  to?: string; // leaf link
  children?: NavChild[];
  badgeKey?: string; // optional live count key (wired to overview counts)
}

/** Admin sidebar information architecture (spec §4). */
export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', icon: 'bi-speedometer2', to: '/admin' },
  {
    label: 'Orders',
    icon: 'bi-bag',
    badgeKey: 'ordersPending',
    children: [
      { label: 'All Orders', to: '/admin/orders' },
      { label: 'Abandoned Checkouts', to: '/admin/orders/abandoned' },
      { label: 'Returns', to: '/admin/orders/returns' },
    ],
  },
  {
    label: 'Shipping',
    icon: 'bi-truck',
    children: [
      { label: 'Shipments', to: '/admin/shipping/shipments' },
      { label: 'Delivery Methods', to: '/admin/shipping/methods' },
      { label: 'Shipping Zones', to: '/admin/shipping/zones' },
    ],
  },
  {
    label: 'Products',
    icon: 'bi-box-seam',
    children: [
      { label: 'All Products', to: '/admin/products' },
      { label: 'Categories', to: '/admin/categories' },
      { label: 'Collections', to: '/admin/collections' },
      { label: 'Inventory', to: '/admin/inventory' },
      { label: 'Reviews', to: '/admin/reviews' },
    ],
  },
  { label: 'Customers', icon: 'bi-people', to: '/admin/customers' },
  {
    label: 'Marketing',
    icon: 'bi-megaphone',
    children: [
      { label: 'Discounts', to: '/admin/marketing/discounts' },
      { label: 'Campaigns', to: '/admin/marketing/campaigns' },
      { label: 'Loyalty', to: '/admin/marketing/loyalty' },
    ],
  },
  {
    label: 'Analytics',
    icon: 'bi-graph-up',
    children: [
      { label: 'Sales', to: '/admin/analytics/sales' },
      { label: 'Traffic', to: '/admin/analytics/traffic' },
      { label: 'Products', to: '/admin/analytics/products' },
      { label: 'Customers', to: '/admin/analytics/customers' },
    ],
  },
  {
    label: 'Payments',
    icon: 'bi-credit-card',
    children: [
      { label: 'Transactions', to: '/admin/payments/transactions' },
      { label: 'Refunds', to: '/admin/payments/refunds' },
    ],
  },
  {
    label: 'Content',
    icon: 'bi-file-earmark-text',
    children: [
      { label: 'Pages', to: '/admin/content/pages' },
      { label: 'Blog', to: '/admin/content/blog' },
      { label: 'Media Library', to: '/admin/content/media' },
      { label: 'Navigation', to: '/admin/content/navigation' },
    ],
  },
  {
    label: 'Appearance',
    icon: 'bi-palette',
    children: [
      { label: 'Theme Editor', to: '/admin/appearance/theme' },
      { label: 'Homepage Sections', to: '/admin/appearance/homepage' },
    ],
  },
  { label: 'Integrations', icon: 'bi-plug', to: '/admin/integrations' },
  { label: 'Settings', icon: 'bi-gear', to: '/admin/settings' },
];
