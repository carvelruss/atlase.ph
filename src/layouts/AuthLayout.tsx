import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Centered card layout for admin authentication screens. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 px-3"
      style={{ background: 'var(--at-bg)' }}
    >
      <div className="w-100" style={{ maxWidth: 420 }}>
        <div className="text-center mb-4">
          <img src="/favicon.svg" alt="Atlase" width={44} height={44} className="mb-2" />
          <h1 className="h5 mb-0">Atlase Admin</h1>
        </div>
        <div className="at-card p-4 p-sm-5 shadow-sm">
          <div className="mb-4">
            <h2 className="h4 mb-1">{title}</h2>
            {subtitle && <p className="text-body-secondary mb-0">{subtitle}</p>}
          </div>
          {children}
        </div>
        {footer && <div className="text-center mt-3 small text-body-secondary">{footer}</div>}
      </div>
    </div>
  );
}
