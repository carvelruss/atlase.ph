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

// Route-based code splitting.
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ProductsListPage = lazy(() => import('@/pages/admin/products/ProductsListPage').then((m) => ({ default: m.ProductsListPage })));
const ProductEditorPage = lazy(() => import('@/pages/admin/products/ProductEditorPage').then((m) => ({ default: m.ProductEditorPage })));
const CategoriesPage = lazy(() => import('@/pages/admin/CategoriesPage').then((m) => ({ default: m.CategoriesPage })));
const CollectionsPage = lazy(() => import('@/pages/admin/CollectionsPage').then((m) => ({ default: m.CollectionsPage })));
const InventoryPage = lazy(() => import('@/pages/admin/InventoryPage').then((m) => ({ default: m.InventoryPage })));

const OrdersListPage = lazy(() => import('@/pages/admin/orders/OrdersListPage').then((m) => ({ default: m.OrdersListPage })));
const OrderDetailPage = lazy(() => import('@/pages/admin/orders/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })));
const CustomersPage = lazy(() => import('@/pages/admin/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const CustomerDetailPage = lazy(() => import('@/pages/admin/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage })));
const ShippingMethodsPage = lazy(() => import('@/pages/admin/ShippingMethodsPage').then((m) => ({ default: m.ShippingMethodsPage })));
const DiscountsPage = lazy(() => import('@/pages/admin/DiscountsPage').then((m) => ({ default: m.DiscountsPage })));
const LoyaltyPage = lazy(() => import('@/pages/admin/LoyaltyPage').then((m) => ({ default: m.LoyaltyPage })));
const PagesPage = lazy(() => import('@/pages/admin/content/PagesPage').then((m) => ({ default: m.PagesPage })));
const PageEditorPage = lazy(() => import('@/pages/admin/content/PageEditorPage').then((m) => ({ default: m.PageEditorPage })));
const BlogPage = lazy(() => import('@/pages/admin/content/BlogPage').then((m) => ({ default: m.BlogPage })));
const BlogEditorPage = lazy(() => import('@/pages/admin/content/BlogEditorPage').then((m) => ({ default: m.BlogEditorPage })));
const MediaLibraryPage = lazy(() => import('@/pages/admin/content/MediaLibraryPage').then((m) => ({ default: m.MediaLibraryPage })));
const NavigationPage = lazy(() => import('@/pages/admin/content/NavigationPage').then((m) => ({ default: m.NavigationPage })));
const HomepageEditorPage = lazy(() => import('@/pages/admin/appearance/HomepageEditorPage').then((m) => ({ default: m.HomepageEditorPage })));
const ThemeEditorPage = lazy(() => import('@/pages/admin/appearance/ThemeEditorPage').then((m) => ({ default: m.ThemeEditorPage })));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const SalesAnalyticsPage = lazy(() => import('@/pages/admin/analytics/SalesAnalyticsPage').then((m) => ({ default: m.SalesAnalyticsPage })));
const TrafficAnalyticsPage = lazy(() => import('@/pages/admin/analytics/TrafficAnalyticsPage').then((m) => ({ default: m.TrafficAnalyticsPage })));
const ProductAnalyticsPage = lazy(() => import('@/pages/admin/analytics/ProductAnalyticsPage').then((m) => ({ default: m.ProductAnalyticsPage })));
const CustomerAnalyticsPage = lazy(() => import('@/pages/admin/analytics/CustomerAnalyticsPage').then((m) => ({ default: m.CustomerAnalyticsPage })));
const TransactionsPage = lazy(() => import('@/pages/admin/payments/TransactionsPage').then((m) => ({ default: m.TransactionsPage })));
const RefundsPage = lazy(() => import('@/pages/admin/payments/RefundsPage').then((m) => ({ default: m.RefundsPage })));
const IntegrationsPage = lazy(() => import('@/pages/admin/IntegrationsPage').then((m) => ({ default: m.IntegrationsPage })));
const AuditLogsPage = lazy(() => import('@/pages/admin/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })));
const NotificationsPage = lazy(() => import('@/pages/admin/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));

const StorefrontContentPage = lazy(() => import('@/pages/storefront/StorefrontContentPage').then((m) => ({ default: m.StorefrontContentPage })));
const BlogListPage = lazy(() => import('@/pages/storefront/BlogListPage').then((m) => ({ default: m.BlogListPage })));
const BlogPostPage = lazy(() => import('@/pages/storefront/BlogPostPage').then((m) => ({ default: m.BlogPostPage })));

const ShopPage = lazy(() => import('@/pages/storefront/ShopPage').then((m) => ({ default: m.ShopPage })));
const ProductDetailPage = lazy(() => import('@/pages/storefront/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })));
const CategoryPage = lazy(() => import('@/pages/storefront/CategoryPage').then((m) => ({ default: m.CategoryPage })));
const CollectionPage = lazy(() => import('@/pages/storefront/CollectionPage').then((m) => ({ default: m.CollectionPage })));
const SearchPage = lazy(() => import('@/pages/storefront/SearchPage').then((m) => ({ default: m.SearchPage })));
const CartPage = lazy(() => import('@/pages/storefront/CartPage').then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('@/pages/storefront/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const CheckoutSuccessPage = lazy(() => import('@/pages/storefront/CheckoutSuccessPage').then((m) => ({ default: m.CheckoutSuccessPage })));
const TrackOrderPage = lazy(() => import('@/pages/storefront/TrackOrderPage').then((m) => ({ default: m.TrackOrderPage })));
const AccountPage = lazy(() => import('@/pages/account/AccountPage').then((m) => ({ default: m.AccountPage })));

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
    { path: 'shop', element: <ShopPage /> },
    { path: 'products/:slug', element: <ProductDetailPage /> },
    { path: 'categories/:slug', element: <CategoryPage /> },
    { path: 'collections/:slug', element: <CollectionPage /> },
    { path: 'search', element: <SearchPage /> },
    { path: 'cart', element: <CartPage /> },
    { path: 'checkout', element: <CheckoutPage /> },
    { path: 'checkout/success', element: <CheckoutSuccessPage /> },
    { path: 'track-order', element: <TrackOrderPage /> },
    { path: 'pages/:slug', element: <StorefrontContentPage /> },
    { path: 'blog', element: <BlogListPage /> },
    { path: 'blog/:slug', element: <BlogPostPage /> },
    { path: 'contact', element: sf('Contact us', undefined, 'bi-envelope') },
    { path: 'account', element: <AccountPage /> },
    { path: 'account/*', element: <AccountPage /> },
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

        { path: 'orders', element: <OrdersListPage /> },
        { path: 'orders/new', element: ph('Create order', 'Phase 4', 'bi-bag-plus') },
        { path: 'orders/abandoned', element: ph('Abandoned checkouts', 'Phase 4', 'bi-cart-x') },
        { path: 'orders/returns', element: ph('Returns', 'Phase 4', 'bi-arrow-return-left') },
        { path: 'orders/:orderId', element: <OrderDetailPage /> },

        { path: 'shipping/shipments', element: ph('Shipments', 'Phase 4', 'bi-truck') },
        { path: 'shipping/methods', element: <ShippingMethodsPage /> },
        { path: 'shipping/zones', element: ph('Shipping zones', 'Phase 4', 'bi-geo-alt') },

        { path: 'products', element: <ProductsListPage /> },
        { path: 'products/new', element: <ProductEditorPage /> },
        { path: 'products/:productId', element: <ProductEditorPage /> },
        { path: 'categories', element: <CategoriesPage /> },
        { path: 'collections', element: <CollectionsPage /> },
        { path: 'inventory', element: <InventoryPage /> },
        { path: 'reviews', element: ph('Reviews', 'Phase 4', 'bi-star') },

        { path: 'customers', element: <CustomersPage /> },
        { path: 'customers/:customerId', element: <CustomerDetailPage /> },

        { path: 'marketing/discounts', element: <DiscountsPage /> },
        { path: 'marketing/discounts/:discountId', element: <DiscountsPage /> },
        { path: 'marketing/campaigns', element: ph('Campaigns', 'Phase 5', 'bi-megaphone') },
        { path: 'marketing/loyalty', element: <LoyaltyPage /> },

        { path: 'analytics/sales', element: <SalesAnalyticsPage /> },
        { path: 'analytics/traffic', element: <TrafficAnalyticsPage /> },
        { path: 'analytics/products', element: <ProductAnalyticsPage /> },
        { path: 'analytics/customers', element: <CustomerAnalyticsPage /> },

        { path: 'payments/transactions', element: <TransactionsPage /> },
        { path: 'payments/refunds', element: <RefundsPage /> },

        { path: 'content/pages', element: <PagesPage /> },
        { path: 'content/pages/new', element: <PageEditorPage /> },
        { path: 'content/pages/:pageId', element: <PageEditorPage /> },
        { path: 'content/blog', element: <BlogPage /> },
        { path: 'content/blog/new', element: <BlogEditorPage /> },
        { path: 'content/blog/:postId', element: <BlogEditorPage /> },
        { path: 'content/media', element: <MediaLibraryPage /> },
        { path: 'content/navigation', element: <NavigationPage /> },

        { path: 'appearance/theme', element: <ThemeEditorPage /> },
        { path: 'appearance/homepage', element: <HomepageEditorPage /> },

        { path: 'integrations', element: <IntegrationsPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'settings/audit', element: <AuditLogsPage /> },
        { path: 'settings/notifications', element: <NotificationsPage /> },
        { path: 'settings/*', element: <SettingsPage /> },

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
