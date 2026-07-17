import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { StorefrontLayout } from '@/layouts/StorefrontLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { HomePage } from '@/pages/storefront/HomePage';
import { StorefrontPlaceholder } from '@/pages/storefront/StorefrontPlaceholder';
import { NotFoundPage } from '@/pages/storefront/NotFoundPage';
import { LoginPage } from '@/pages/admin/auth/LoginPage';
import { SetupPage } from '@/pages/admin/auth/SetupPage';
import { ForgotPasswordPage } from '@/pages/admin/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/admin/auth/ResetPasswordPage';
import { PlaceholderPage } from '@/pages/admin/PlaceholderPage';
import { RequireAdmin, LoginRoute, SetupRoute, RedirectIfAuthed } from './guards';

// Route-based code splitting: the dashboard (with charts) loads as its own chunk.
const DashboardPage = lazy(() =>
  import('@/pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);

const ph = (title: string, phase: string, icon?: string) => (
  <PlaceholderPage title={title} phase={phase} icon={icon} />
);
const sf = (title: string, description?: string, icon?: string) => (
  <StorefrontPlaceholder title={title} description={description} icon={icon} />
);

const storefrontRoutes: RouteObject = {
  element: <StorefrontLayout />,
  children: [
    { index: true, element: <HomePage /> },
    { path: 'shop', element: sf('Shop', 'Product browsing is coming with the catalog build.', 'bi-grid') },
    { path: 'products/:slug', element: sf('Product details', undefined, 'bi-box-seam') },
    { path: 'categories/:slug', element: sf('Category', undefined, 'bi-tags') },
    { path: 'collections/:slug', element: sf('Collection', undefined, 'bi-collection') },
    { path: 'search', element: sf('Search', undefined, 'bi-search') },
    { path: 'cart', element: sf('Your cart', 'The cart arrives with the commerce build.', 'bi-bag') },
    { path: 'checkout', element: sf('Checkout', undefined, 'bi-credit-card') },
    { path: 'checkout/success', element: sf('Order confirmed', undefined, 'bi-check-circle') },
    { path: 'track-order', element: sf('Track your order', undefined, 'bi-truck') },
    { path: 'pages/:slug', element: sf('Page', undefined, 'bi-file-text') },
    { path: 'blog', element: sf('Blog', undefined, 'bi-newspaper') },
    { path: 'blog/:slug', element: sf('Article', undefined, 'bi-newspaper') },
    { path: 'contact', element: sf('Contact us', undefined, 'bi-envelope') },
    { path: 'account/*', element: sf('Your account', 'Customer accounts arrive with the commerce build.', 'bi-person') },
    { path: '*', element: <NotFoundPage /> },
  ],
};

const adminAppRoutes: RouteObject = {
  path: 'admin',
  element: <RequireAdmin />,
  children: [
    {
      element: <AdminLayout />,
      children: [
        { index: true, element: <DashboardPage /> },

        { path: 'orders', element: ph('Orders', 'Phase 3', 'bi-bag') },
        { path: 'orders/new', element: ph('Create order', 'Phase 3', 'bi-bag-plus') },
        { path: 'orders/abandoned', element: ph('Abandoned checkouts', 'Phase 3', 'bi-cart-x') },
        { path: 'orders/returns', element: ph('Returns', 'Phase 3', 'bi-arrow-return-left') },
        { path: 'orders/:orderId', element: ph('Order details', 'Phase 3', 'bi-receipt') },

        { path: 'shipping/shipments', element: ph('Shipments', 'Phase 3', 'bi-truck') },
        { path: 'shipping/methods', element: ph('Delivery methods', 'Phase 3', 'bi-truck') },
        { path: 'shipping/zones', element: ph('Shipping zones', 'Phase 3', 'bi-geo-alt') },

        { path: 'products', element: ph('Products', 'Phase 2', 'bi-box-seam') },
        { path: 'products/new', element: ph('Add product', 'Phase 2', 'bi-plus-square') },
        { path: 'products/:productId', element: ph('Edit product', 'Phase 2', 'bi-pencil-square') },
        { path: 'categories', element: ph('Categories', 'Phase 2', 'bi-tags') },
        { path: 'collections', element: ph('Collections', 'Phase 2', 'bi-collection') },
        { path: 'inventory', element: ph('Inventory', 'Phase 2', 'bi-boxes') },
        { path: 'reviews', element: ph('Reviews', 'Phase 2', 'bi-star') },

        { path: 'customers', element: ph('Customers', 'Phase 3', 'bi-people') },
        { path: 'customers/new', element: ph('Add customer', 'Phase 3', 'bi-person-plus') },
        { path: 'customers/:customerId', element: ph('Customer profile', 'Phase 3', 'bi-person') },

        { path: 'marketing/discounts', element: ph('Discounts', 'Phase 4', 'bi-percent') },
        { path: 'marketing/campaigns', element: ph('Campaigns', 'Phase 4', 'bi-megaphone') },
        { path: 'marketing/loyalty', element: ph('Loyalty', 'Phase 4', 'bi-award') },

        { path: 'analytics/sales', element: ph('Sales analytics', 'Phase 5', 'bi-graph-up') },
        { path: 'analytics/traffic', element: ph('Traffic analytics', 'Phase 5', 'bi-bar-chart') },
        { path: 'analytics/products', element: ph('Product analytics', 'Phase 5', 'bi-box') },
        { path: 'analytics/customers', element: ph('Customer analytics', 'Phase 5', 'bi-people') },

        { path: 'payments/transactions', element: ph('Transactions', 'Phase 3', 'bi-credit-card') },
        { path: 'payments/refunds', element: ph('Refunds', 'Phase 3', 'bi-arrow-counterclockwise') },

        { path: 'content/pages', element: ph('Pages', 'Phase 4', 'bi-file-earmark-text') },
        { path: 'content/blog', element: ph('Blog', 'Phase 4', 'bi-newspaper') },
        { path: 'content/media', element: ph('Media library', 'Phase 4', 'bi-images') },
        { path: 'content/navigation', element: ph('Navigation', 'Phase 4', 'bi-diagram-3') },

        { path: 'appearance/theme', element: ph('Theme editor', 'Phase 4', 'bi-palette') },
        { path: 'appearance/homepage', element: ph('Homepage sections', 'Phase 4', 'bi-layout-text-window') },

        { path: 'integrations', element: ph('Integrations', 'Phase 5', 'bi-plug') },
        { path: 'settings', element: ph('Settings', 'Phase 3', 'bi-gear') },
        { path: 'settings/*', element: ph('Settings', 'Phase 3', 'bi-gear') },

        { path: '*', element: ph('Not found', 'this section', 'bi-question-circle') },
      ],
    },
  ],
};

export const router = createBrowserRouter([
  { path: '/admin/login', element: <LoginRoute><LoginPage /></LoginRoute> },
  { path: '/admin/setup', element: <SetupRoute><SetupPage /></SetupRoute> },
  {
    path: '/admin/forgot-password',
    element: (
      <RedirectIfAuthed>
        <ForgotPasswordPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: '/admin/reset-password',
    element: (
      <RedirectIfAuthed>
        <ResetPasswordPage />
      </RedirectIfAuthed>
    ),
  },
  adminAppRoutes,
  { path: '/', ...storefrontRoutes },
]);
