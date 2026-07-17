import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { Spinner } from '@/components/feedback/Spinner';

function FullPage({ children }: { children: ReactNode }) {
  return <div className="d-flex align-items-center justify-content-center min-vh-100">{children}</div>;
}

/** Protects /admin/* routes. Client guard is defense-in-depth; the API enforces auth. */
export function RequireAdmin() {
  const { session, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <FullPage>
        <Spinner />
      </FullPage>
    );
  }
  if (!session?.authenticated) {
    if (session?.setupRequired) return <Navigate to="/admin/setup" replace />;
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/** Login screen: bounce to dashboard if authed, or to setup if no admin exists yet. */
export function LoginRoute({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();
  if (isLoading) {
    return (
      <FullPage>
        <Spinner />
      </FullPage>
    );
  }
  if (session?.authenticated) return <Navigate to="/admin" replace />;
  if (session?.setupRequired) return <Navigate to="/admin/setup" replace />;
  return <>{children}</>;
}

/** Setup screen: only reachable when no admin exists; otherwise go to login. */
export function SetupRoute({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();
  if (isLoading) {
    return (
      <FullPage>
        <Spinner />
      </FullPage>
    );
  }
  if (session?.authenticated) return <Navigate to="/admin" replace />;
  if (!session?.setupRequired) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

/** Simple gate for forgot/reset routes — redirect away only if already authed. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (session?.authenticated) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
