import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, setCsrfToken } from '@/lib/api';

export interface AdminUser {
  id: number;
  email: string;
  name: string;
}

export interface SessionData {
  authenticated: boolean;
  admin?: AdminUser;
  csrfToken?: string;
  setupRequired?: boolean;
}

interface AuthContextValue {
  session: SessionData | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const ADMIN_SESSION_KEY = ['admin-session'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: ADMIN_SESSION_KEY,
    queryFn: ({ signal }) => apiFetch<SessionData>('/api/auth/admin/session', { signal }),
    staleTime: 60_000,
    retry: false,
  });

  // Keep the in-memory CSRF token in sync with the current session.
  useEffect(() => {
    if (query.data?.authenticated && query.data.csrfToken) {
      setCsrfToken(query.data.csrfToken);
    } else if (query.data && !query.data.authenticated) {
      setCsrfToken(null);
    }
  }, [query.data]);

  return (
    <AuthContext.Provider
      value={{
        session: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: () => void query.refetch(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
