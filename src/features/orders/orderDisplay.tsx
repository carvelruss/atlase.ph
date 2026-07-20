import type { CSSProperties } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';

export interface PillStyle {
  label: string;
  color: string;
  bg: string;
}

/** Order lifecycle status → seller-facing label + pill colours. */
export const STATUS_DISPLAY: Record<string, PillStyle> = {
  pending: { label: 'Pending', color: '#b45309', bg: 'var(--at-warning-soft)' },
  confirmed: { label: 'Accepted', color: '#15803d', bg: 'var(--at-success-soft)' },
  processing: { label: 'Processing', color: '#0369a1', bg: 'var(--at-info-soft)' },
  ready_to_ship: { label: 'Ready to ship', color: 'var(--at-primary)', bg: 'var(--at-primary-soft)' },
  shipped: { label: 'Shipped', color: '#0369a1', bg: 'var(--at-info-soft)' },
  delivered: { label: 'Delivered', color: '#15803d', bg: 'var(--at-success-soft)' },
  cancelled: { label: 'Cancelled', color: '#b91c1c', bg: 'var(--at-danger-soft)' },
  refunded: { label: 'Refunded', color: '#b91c1c', bg: 'var(--at-danger-soft)' },
  partially_refunded: { label: 'Partly refunded', color: '#b45309', bg: 'var(--at-warning-soft)' },
  draft: { label: 'Draft', color: 'var(--at-muted)', bg: 'var(--at-surface-muted)' },
};

export function statusStyle(status: string): PillStyle {
  return STATUS_DISPLAY[status] ?? { label: status.replace(/_/g, ' '), color: 'var(--at-muted)', bg: 'var(--at-surface-muted)' };
}

export function paymentStyle(method: string | null): PillStyle {
  const m = (method ?? '').toLowerCase();
  if (m.includes('cod') || m.includes('cash')) return { label: 'COD', color: '#b45309', bg: 'var(--at-warning-soft)' };
  return { label: 'Prepaid', color: '#0369a1', bg: 'var(--at-info-soft)' };
}

export function customerName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallback: string,
): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || fallback;
}

/** "Friday, 01:09 PM" for orders from the last week, "Jul 12, 2026" for older ones. */
export function orderDate(value: string): string {
  const d = new Date(value);
  const days = differenceInCalendarDays(new Date(), d);
  return days >= 0 && days <= 6 ? format(d, 'EEEE, hh:mm a') : format(d, 'PP');
}

const PILL_BASE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.2rem 0.55rem',
  borderRadius: 'var(--at-radius-pill)',
  fontSize: 'var(--at-fs-sm)',
  fontWeight: 'var(--at-fw-semibold)' as unknown as number,
  whiteSpace: 'nowrap',
  lineHeight: 1.4,
};

/** Status pill with the leading colour dot (used in list, detail, and topbar). */
export function OrderStatusPill({ status }: { status: string }) {
  const s = statusStyle(status);
  return (
    <span style={{ ...PILL_BASE, color: s.color, background: s.bg }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />
      {s.label}
    </span>
  );
}

export function PaymentPill({ method }: { method: string | null }) {
  const s = paymentStyle(method);
  return <span style={{ ...PILL_BASE, color: s.color, background: s.bg }}>{s.label}</span>;
}
