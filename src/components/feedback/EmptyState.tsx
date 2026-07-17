import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string; // bootstrap-icons class, e.g. "bi-box-seam"
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

/**
 * Original, illustration-free empty state built from an icon composition + CSS.
 * Used across admin tables and storefront listings for the "no data" case.
 */
export function EmptyState({ icon = 'bi-inbox', title, description, action, compact }: EmptyStateProps) {
  return (
    <div className={`text-center ${compact ? 'py-4' : 'py-5'}`}>
      <div
        className="d-inline-flex align-items-center justify-content-center mb-3"
        style={{
          width: compact ? 56 : 72,
          height: compact ? 56 : 72,
          borderRadius: '50%',
          background: 'var(--at-primary-soft)',
          color: 'var(--at-primary)',
        }}
        aria-hidden="true"
      >
        <i className={`bi ${icon}`} style={{ fontSize: compact ? '1.5rem' : '2rem' }} />
      </div>
      <h3 className="h6 mb-1">{title}</h3>
      {description && (
        <p className="text-body-secondary mb-3 mx-auto" style={{ maxWidth: 420 }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
