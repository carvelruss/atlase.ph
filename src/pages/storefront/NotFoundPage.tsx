import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="container py-5 text-center">
      <div className="py-5">
        <div className="display-1 fw-bold text-primary">404</div>
        <h1 className="h4 mb-2">Page not found</h1>
        <p className="text-body-secondary mb-4">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link to="/" className="btn btn-primary">
          Back to home
        </Link>
      </div>
    </div>
  );
}
