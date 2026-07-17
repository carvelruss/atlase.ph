import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { Spinner } from '@/components/feedback/Spinner';
import { useSeo } from '@/hooks/useSeo';
import styles from './AdminLayout.module.scss';

interface OverviewCounts {
  ordersPending?: number;
  [key: string]: number | undefined;
}

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  useSeo({ title: 'Admin', noindex: true });

  // Live sidebar badge counts (best-effort; absent until the endpoint exists).
  const { data: counts } = useQuery({
    queryKey: ['admin-overview-counts'],
    queryFn: () => apiFetch<OverviewCounts>('/api/admin/overview/counts'),
    staleTime: 60_000,
    retry: false,
  });

  return (
    <div className={styles.shell}>
      <a href="#main-content" className="at-skip-link">Skip to content</a>
      <aside className={styles.sidebarDesktop}>
        <AdminSidebar counts={counts as Record<string, number> | undefined} />
      </aside>

      {mobileOpen && (
        <>
          <div className={styles.backdrop} onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className={styles.offcanvas} role="dialog" aria-label="Navigation menu">
            <AdminSidebar
              counts={counts as Record<string, number> | undefined}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}

      <div className={styles.main}>
        <AdminTopbar onOpenMenu={() => setMobileOpen(true)} />
        <main className={styles.content} id="main-content">
          <Suspense fallback={<Spinner center />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
