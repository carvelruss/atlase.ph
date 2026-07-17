import type { ReactNode } from 'react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb">
            <ol className="breadcrumb small mb-1">
              {breadcrumbs.map((b, i) => (
                <li
                  key={`${b.label}-${i}`}
                  className={`breadcrumb-item ${i === breadcrumbs.length - 1 ? 'active' : ''}`}
                  aria-current={i === breadcrumbs.length - 1 ? 'page' : undefined}
                >
                  {b.href ? <a href={b.href}>{b.label}</a> : b.label}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="h4 mb-1">{title}</h1>
        {description && <p className="text-body-secondary mb-0">{description}</p>}
      </div>
      {actions && <div className="d-flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
