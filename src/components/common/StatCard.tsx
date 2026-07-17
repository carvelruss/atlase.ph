interface StatCardProps {
  label: string;
  value: string;
  icon?: string;
  hint?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

const TONES: Record<NonNullable<StatCardProps['tone']>, { bg: string; fg: string }> = {
  primary: { bg: 'var(--at-primary-soft)', fg: 'var(--at-primary)' },
  success: { bg: 'var(--at-success-soft)', fg: 'var(--at-success)' },
  warning: { bg: 'var(--at-warning-soft)', fg: 'var(--at-accent-hover)' },
  danger: { bg: 'var(--at-danger-soft)', fg: 'var(--at-danger)' },
  info: { bg: 'var(--at-info-soft)', fg: 'var(--at-info)' },
};

export function StatCard({ label, value, icon, hint, tone = 'primary' }: StatCardProps) {
  const colors = TONES[tone];
  return (
    <div className="at-card p-3 h-100">
      <div className="d-flex align-items-start justify-content-between">
        <div>
          <div className="text-body-secondary small mb-1">{label}</div>
          <div className="h4 mb-0">{value}</div>
        </div>
        {icon && (
          <span
            className="d-inline-flex align-items-center justify-content-center"
            style={{ width: 40, height: 40, borderRadius: 10, background: colors.bg, color: colors.fg }}
            aria-hidden="true"
          >
            <i className={`bi ${icon}`} style={{ fontSize: '1.15rem' }} />
          </span>
        )}
      </div>
      {hint && <div className="text-body-secondary small mt-2">{hint}</div>}
    </div>
  );
}
