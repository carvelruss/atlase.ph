type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary';

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: 'var(--at-surface-muted)', fg: 'var(--at-muted)' },
  info: { bg: 'var(--at-info-soft)', fg: '#0369a1' },
  success: { bg: 'var(--at-success-soft)', fg: '#15803d' },
  warning: { bg: 'var(--at-warning-soft)', fg: '#b45309' },
  danger: { bg: 'var(--at-danger-soft)', fg: '#b91c1c' },
  primary: { bg: 'var(--at-primary-soft)', fg: 'var(--at-primary)' },
};

const STATUS_TONE: Record<string, Tone> = {
  // order status
  draft: 'neutral',
  pending: 'warning',
  confirmed: 'info',
  processing: 'info',
  ready_to_ship: 'primary',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'danger',
  refunded: 'danger',
  partially_refunded: 'warning',
  // payment status
  paid: 'success',
  authorized: 'info',
  partially_paid: 'warning',
  failed: 'danger',
  voided: 'neutral',
  // fulfillment
  unfulfilled: 'neutral',
  partially_fulfilled: 'warning',
  fulfilled: 'success',
  returned: 'danger',
  // generic
  active: 'success',
  archived: 'neutral',
  approved: 'success',
  rejected: 'danger',
  hidden: 'neutral',
};

function humanize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = STATUS_TONE[status] ?? 'neutral';
  const style = TONE_STYLES[tone];
  return (
    <span className="at-badge" style={{ background: style.bg, color: style.fg }}>
      {label ?? humanize(status)}
    </span>
  );
}
