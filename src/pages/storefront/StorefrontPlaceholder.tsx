import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/feedback/EmptyState';

interface Props {
  title: string;
  description?: string;
  icon?: string;
}

/** Honest storefront placeholder for pages delivered in later phases. */
export function StorefrontPlaceholder({ title, description, icon = 'bi-shop' }: Props) {
  return (
    <div className="container py-5">
      <div className="at-card p-5 mx-auto" style={{ maxWidth: 640 }}>
        <EmptyState
          icon={icon}
          title={title}
          description={description ?? 'This page is being built and will be available soon.'}
          action={
            <Link to="/" className="btn btn-primary btn-sm">
              Back to home
            </Link>
          }
        />
      </div>
    </div>
  );
}
