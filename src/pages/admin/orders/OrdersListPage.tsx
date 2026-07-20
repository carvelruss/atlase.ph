import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '@/components/common/Pagination';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAdminHeading } from '@/layouts/adminHeading';
import { moneyShort } from '@/lib/format';
import { useOrders, type OrderListItem } from '@/features/orders/api';
import {
  OrderStatusPill,
  PaymentPill,
  STATUS_DISPLAY,
  customerName,
  orderDate,
  paymentStyle,
} from '@/features/orders/orderDisplay';
import styles from './OrdersListPage.module.scss';

const TABS = [
  { key: 'all', label: 'All', statuses: [] as string[] },
  { key: 'pending', label: 'Pending', statuses: ['pending'] },
  { key: 'accepted', label: 'Accepted', statuses: ['confirmed', 'processing', 'ready_to_ship'] },
  { key: 'shipped', label: 'Shipped', statuses: ['shipped'] },
  { key: 'delivered', label: 'Delivered', statuses: ['delivered'] },
  { key: 'others', label: 'Others', statuses: ['cancelled', 'refunded', 'partially_refunded'] },
];

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'lifetime', label: 'Lifetime' },
];

function tabCount(counts: Record<string, number>, statuses: string[]): number {
  if (statuses.length === 0) return Object.values(counts).reduce((a, b) => a + b, 0);
  return statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
}

function exportCsv(items: OrderListItem[]) {
  const rows = [
    ['Order ID', 'Date', 'Customer', 'Items', 'Payment', 'Status', 'Amount'],
    ...items.map((o) => [
      o.orderNumber,
      orderDate(o.createdAt),
      customerName(o.customerFirstName, o.customerLastName, o.email),
      String(o.itemCount),
      paymentStyle(o.paymentMethod).label,
      STATUS_DISPLAY[o.status]?.label ?? o.status,
      (o.grandTotal / 100).toFixed(2),
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'orders.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function OrdersListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [rawSearch, setRawSearch] = useState('');
  const search = useDebouncedValue(rawSearch);
  const [tab, setTab] = useState('all');
  const [range, setRange] = useState('lifetime');
  const [rangeOpen, setRangeOpen] = useState(false);

  const rangeLabel = RANGES.find((r) => r.value === range)?.label ?? 'Lifetime';
  useAdminHeading(useMemo(() => ({ title: 'All Orders', suffix: rangeLabel.toLowerCase() }), [rangeLabel]));

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
  const { data, isLoading, isError } = useOrders({
    page,
    q: search || undefined,
    status: activeTab.statuses.length ? activeTab.statuses.join(',') : undefined,
    range,
  });
  const items = data?.data.items ?? [];
  const counts = data?.data.statusCounts ?? {};
  const meta = data?.meta;

  return (
    <div>
      <div className={styles.topRow}>
        <div className={styles.tabs}>
          {TABS.map((t) => {
            const n = tabCount(counts, t.statuses);
            return (
              <button
                key={t.key}
                type="button"
                className={`${styles.tab} ${t.key === tab ? styles.tabActive : ''}`}
                onClick={() => {
                  setTab(t.key);
                  setPage(1);
                }}
              >
                {t.label}
                {n > 0 && <span className={styles.tabCount}>{n}</span>}
              </button>
            );
          })}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.toolBtn} onClick={() => navigate('/admin/shipping/shipments')}>
            <i className="bi bi-truck" aria-hidden="true" />
            Bulk ship
          </button>
          <button type="button" className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1" onClick={() => navigate('/admin/orders/new')}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            Create order
          </button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <i className="bi bi-search" aria-hidden="true" />
          <input
            placeholder="Order ID, phone or a name..."
            value={rawSearch}
            onChange={(e) => {
              setRawSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search orders"
          />
        </div>
        <div className={styles.toolbarSpacer} />

        <button type="button" className={styles.toolBtn} onClick={() => exportCsv(items)} disabled={items.length === 0}>
          <i className="bi bi-download" aria-hidden="true" />
          Export
        </button>
        <button type="button" className={styles.toolBtn}>
          <i className="bi bi-layout-three-columns" aria-hidden="true" />
          Columns
        </button>
        <button type="button" className={styles.toolBtn}>
          <i className="bi bi-arrow-down-up" aria-hidden="true" />
          Sort by
        </button>
        <button type="button" className={styles.toolBtn}>
          <i className="bi bi-funnel" aria-hidden="true" />
          Filter
        </button>
        <div className={styles.rangeWrap}>
          <button type="button" className={styles.toolBtn} onClick={() => setRangeOpen((v) => !v)} aria-expanded={rangeOpen}>
            <i className="bi bi-calendar3" aria-hidden="true" />
            {rangeLabel}
            <i className={`bi bi-chevron-down ${styles.chev}`} aria-hidden="true" />
          </button>
          {rangeOpen && (
            <>
              <div className="position-fixed top-0 start-0 w-100 h-100" onClick={() => setRangeOpen(false)} />
              <div className={styles.rangeMenu} role="menu">
                {RANGES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    role="menuitem"
                    className={`${styles.rangeItem} ${r.value === range ? styles.rangeActive : ''}`}
                    onClick={() => {
                      setRange(r.value);
                      setRangeOpen(false);
                      setPage(1);
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.card}>
        {isLoading ? (
          <div className={styles.state}>
            <Spinner center />
          </div>
        ) : isError ? (
          <div className={styles.state}>
            <EmptyState icon="bi-exclamation-triangle" title="Couldn't load orders" />
          </div>
        ) : items.length === 0 ? (
          <div className={styles.state}>
            <EmptyState icon="bi-bag" title="No orders here" description="Orders will appear here as customers check out." />
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th className={styles.sortable}>
                    Date <i className="bi bi-caret-down-fill" aria-hidden="true" />
                  </th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id} onClick={() => navigate(`/admin/orders/${o.id}`)}>
                    <td className={styles.orderId}>#{o.orderNumber}</td>
                    <td className={styles.muted}>{orderDate(o.createdAt)}</td>
                    <td className={styles.customer}>{customerName(o.customerFirstName, o.customerLastName, o.email)}</td>
                    <td>{o.itemCount}</td>
                    <td>
                      <PaymentPill method={o.paymentMethod} />
                    </td>
                    <td>
                      <OrderStatusPill status={o.status} />
                    </td>
                    <td className={styles.amount}>{moneyShort(o.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta && items.length > 0 && (
          <div className={styles.footer}>
            <Pagination page={page} totalPages={meta.totalPages ?? 1} total={meta.total} onPage={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
