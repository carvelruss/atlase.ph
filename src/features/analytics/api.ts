import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface SalesAnalytics {
  summary: { grossSales: number; netSales: number; discounts: number; refunds: number; shipping: number; tax: number; totalOrders: number; averageOrderValue: number };
  series: { day: string; total: number; orders: number }[];
}
export interface TrafficAnalytics {
  summary: { sessions: number; productViews: number; addToCart: number; checkoutStarts: number; purchases: number; conversionRate: number };
  sources: { source: string; n: number }[];
  devices: { device: string; n: number }[];
  series: { day: string; sessions: number }[];
}
export interface ProductAnalytics {
  topProducts: { productId: number; name: string; units: number; revenue: number }[];
  mostViewed: { productId: number; views: number }[];
}
export interface CustomerAnalytics {
  summary: { newCustomers: number; returningCustomers: number; repeatPurchaseRate: number; totalPurchasers: number };
  topCustomers: { id: number; email: string; firstName: string | null; lastName: string | null; totalSpent: number; ordersCount: number }[];
  byRegion: { region: string; n: number }[];
}

function useAnalytics<T>(kind: string, range: string) {
  return useQuery({ queryKey: ['analytics', kind, range], queryFn: () => apiFetch<T>(`/api/admin/analytics/${kind}`, { query: { range } }) });
}
export const useSalesAnalytics = (range: string) => useAnalytics<SalesAnalytics>('sales', range);
export const useTrafficAnalytics = (range: string) => useAnalytics<TrafficAnalytics>('traffic', range);
export const useProductAnalytics = (range: string) => useAnalytics<ProductAnalytics>('products', range);
export const useCustomerAnalytics = (range: string) => useAnalytics<CustomerAnalytics>('customers', range);
