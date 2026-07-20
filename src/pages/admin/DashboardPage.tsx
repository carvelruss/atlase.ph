import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiFetch } from '@/lib/api';
import { money, moneyShort, formatDate } from '@/lib/format';
import styles from './DashboardPage.module.scss';

interface Overview {
  summary: { grossSales: number; totalOrders: number };
  salesOverTime: { day: string; total: number }[];
}

interface Traffic {
  summary: { sessions: number; conversionRate: number };
  series: { day: string; sessions: number }[];
}

interface Counts {
  ordersPending: number;
  toShipCount: number;
  toShipValue: number;
  abandonedCount: number;
}

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'lifetime', label: 'Lifetime' },
];

const CHART_BLUE = '#2f80ed';
const GRID = '#e2e8f0';
const AXIS = '#94a3b8';

interface Shortcut {
  name: string;
  icon: string;
  bg: string;
  fg: string;
}

const SHORTCUTS: Shortcut[] = [
  { name: 'Google Analytics', icon: 'bi-graph-up-arrow', bg: '#fdecdd', fg: '#e8710a' },
  { name: 'Facebook Pixel', icon: 'bi-facebook', bg: '#e6f0fe', fg: '#1877f2' },
  { name: 'Hellobar', icon: 'bi-layout-text-window-reverse', bg: '#fff3d6', fg: '#e0a100' },
  { name: 'Product Reviews and Ratings', icon: 'bi-chat-square-quote-fill', bg: '#fff3d6', fg: '#e0a100' },
  { name: 'Google Merchant Center', icon: 'bi-tag-fill', bg: '#e6f0fe', fg: '#2f80ed' },
  { name: 'Google Search Console', icon: 'bi-search', bg: '#e6f0fe', fg: '#1a73e8' },
  { name: 'Facebook Domain Verification', icon: 'bi-patch-check-fill', bg: '#eef1f5', fg: '#5b6b7f' },
  { name: 'Google Tag Manager', icon: 'bi-google', bg: '#e6f0fe', fg: '#4285f4' },
];

const plural = (n: number) => (n === 1 ? '' : 's');

export function DashboardPage() {
  const [range, setRange] = useState('lifetime');
  const [rangeOpen, setRangeOpen] = useState(false);

  const overview = useQuery({
    queryKey: ['admin-overview', range],
    queryFn: () => apiFetch<Overview>('/api/admin/overview', { query: { range } }),
  });
  const traffic = useQuery({
    queryKey: ['admin-traffic', range],
    queryFn: () => apiFetch<Traffic>('/api/admin/analytics/traffic', { query: { range } }),
  });
  const counts = useQuery({
    queryKey: ['admin-overview-counts'],
    queryFn: () => apiFetch<Counts>('/api/admin/overview/counts'),
    staleTime: 60_000,
  });

  const sales = overview.data?.salesOverTime ?? [];
  const sessions = traffic.data?.series ?? [];
  const grossSales = overview.data?.summary.grossSales ?? 0;
  const totalOrders = overview.data?.summary.totalOrders ?? 0;
  const totalSessions = traffic.data?.summary.sessions ?? 0;
  const conversionRate = traffic.data?.summary.conversionRate ?? 0;

  const ordersPending = counts.data?.ordersPending ?? 0;
  const toShipCount = counts.data?.toShipCount ?? 0;
  const toShipValue = counts.data?.toShipValue ?? 0;
  const abandonedCount = counts.data?.abandonedCount ?? 0;

  const rangeLabel = RANGES.find((r) => r.value === range)?.label ?? 'Lifetime';
  const storeHost = typeof window !== 'undefined' ? window.location.host : 'atlase.ph';

  const statusTiles: { key: string; icon: string; to: string; text: ReactNode }[] = [
    {
      key: 'pending',
      icon: 'bi-box-seam',
      to: '/admin/orders',
      text: ordersPending > 0 ? (
        <>
          <strong>{ordersPending}</strong> new order{plural(ordersPending)} pending
        </>
      ) : (
        'No new orders pending'
      ),
    },
    {
      key: 'ship',
      icon: 'bi-truck',
      to: '/admin/orders',
      text: toShipCount > 0 ? (
        <>
          <strong>{toShipCount}</strong> order{plural(toShipCount)} worth <strong>{moneyShort(toShipValue)}</strong> to ship today
        </>
      ) : (
        'No orders to ship today'
      ),
    },
    {
      key: 'abandoned',
      icon: 'bi-cart',
      to: '/admin/orders/abandoned',
      text: abandonedCount > 0 ? (
        <>
          <strong>{abandonedCount}</strong> abandoned checkout{plural(abandonedCount)}
        </>
      ) : (
        'No abandoned order'
      ),
    },
  ];

  return (
    <div className={styles.overview}>
      <div className={styles.headRow}>
        <h1 className={styles.title}>Your overview</h1>
        <div className={styles.range}>
          <button
            type="button"
            className={styles.rangeBtn}
            onClick={() => setRangeOpen((v) => !v)}
            aria-expanded={rangeOpen}
          >
            <i className="bi bi-calendar3" aria-hidden="true" />
            <span>{rangeLabel}</span>
            <i className="bi bi-chevron-down" aria-hidden="true" />
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

      <div className={styles.grid}>
        {/* Total sales */}
        <section className={`${styles.card} ${styles.metricCard}`}>
          <div className={styles.metricHead}>
            <span className={styles.metricLabel}>
              Total sales
              <i className={`bi bi-info-circle ${styles.info}`} title="Gross sales across all orders in the selected period." aria-hidden="true" />
            </span>
            <span className={styles.metricMeta}>
              {totalOrders} order{plural(totalOrders)}
            </span>
          </div>
          <div className={styles.metricValue}>{moneyShort(grossSales)}</div>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={sales} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_BLUE} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={CHART_BLUE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: AXIS }}
                  tickFormatter={(d: string) => formatDate(d, 'MMM d')}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: AXIS }}
                  tickFormatter={(v: number) => moneyShort(v)}
                  axisLine={false}
                  tickLine={false}
                  width={58}
                />
                <Tooltip
                  formatter={(v: number) => [money(v), 'Sales']}
                  labelFormatter={(d) => formatDate(String(d))}
                  contentStyle={{ borderRadius: 10, border: `1px solid ${GRID}`, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="total" stroke={CHART_BLUE} strokeWidth={2} fill="url(#salesFill)" dot={{ r: 3, fill: CHART_BLUE }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.cardFooter}>
            <Link to="/admin/analytics/sales" className={styles.viewMore}>
              View more <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Store conversion rate */}
        <section className={`${styles.card} ${styles.metricCard}`}>
          <div className={styles.metricHead}>
            <span className={styles.metricLabel}>
              Store conversion rate
              <i className={`bi bi-info-circle ${styles.info}`} title="Share of sessions that resulted in a purchase." aria-hidden="true" />
            </span>
            <span className={styles.metricMeta}>
              {totalSessions} session{plural(totalSessions)}
            </span>
          </div>
          <div className={styles.metricValue}>{conversionRate}%</div>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={sessions} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: AXIS }}
                  tickFormatter={(d: string) => formatDate(d, 'MMM d')}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: AXIS }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  formatter={(v: number) => [v, 'Sessions']}
                  labelFormatter={(d) => formatDate(String(d))}
                  contentStyle={{ borderRadius: 10, border: `1px solid ${GRID}`, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="sessions" stroke={CHART_BLUE} strokeWidth={2} dot={{ r: 3, fill: CHART_BLUE }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.cardFooter}>
            <Link to="/admin/analytics/traffic" className={styles.viewMore}>
              View more <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Right column */}
        <div className={styles.rightCol}>
          <section className={`${styles.card} ${styles.linkCard}`}>
            <div className={styles.linkHead}>
              <span className={styles.linkLabel}>Store link</span>
              <Link to="/admin/settings" className={styles.linkDomain}>
                Link domain
              </Link>
            </div>
            <a href="/" target="_blank" rel="noreferrer" className={styles.storeUrl}>
              {storeHost}
              <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
            </a>
          </section>

          {statusTiles.map((tile) => (
            <Link key={tile.key} to={tile.to} className={`${styles.card} ${styles.statusCard}`}>
              <i className={`bi ${tile.icon} ${styles.statusIcon}`} aria-hidden="true" />
              <span className={styles.statusText}>{tile.text}</span>
              <i className={`bi bi-chevron-right ${styles.statusChevron}`} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>

      {/* Shortcuts */}
      <section className={styles.shortcuts} aria-label="Shortcuts">
        <div className={styles.shortcutsHead}>
          <h2 className={styles.shortcutsTitle}>Shortcuts</h2>
          <Link to="/admin/integrations" className={styles.editBtn} aria-label="Edit shortcuts">
            <i className="bi bi-pencil" aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.shortcutGrid}>
          {SHORTCUTS.map((s) => (
            <Link key={s.name} to="/admin/integrations" className={`${styles.card} ${styles.shortcutCard}`}>
              <span className={styles.shortcutIcon} style={{ background: s.bg, color: s.fg }} aria-hidden="true">
                <i className={`bi ${s.icon}`} />
              </span>
              <span className={styles.shortcutName}>{s.name}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
