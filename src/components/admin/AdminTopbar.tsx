import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch, setCsrfToken } from '@/lib/api';
import { useAuth, ADMIN_SESSION_KEY } from '@/features/auth/AuthProvider';
import { useToast } from '@/components/feedback/Toast';
import type { AdminHeading } from '@/layouts/adminHeading';
import styles from '@/layouts/AdminLayout.module.scss';

interface AdminTopbarProps {
  onOpenMenu: () => void;
  heading?: AdminHeading | null;
}

export function AdminTopbar({ onOpenMenu, heading }: AdminTopbarProps) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const admin = session?.admin;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiFetch('/api/auth/admin/logout', { method: 'POST', body: {} });
    } catch {
      // ignore — we clear client state regardless
    } finally {
      setCsrfToken(null);
      await queryClient.invalidateQueries({ queryKey: ADMIN_SESSION_KEY });
      setLoggingOut(false);
      toast.success('Signed out.');
      navigate('/admin/login');
    }
  }

  return (
    <header className={styles.topbar}>
      <button
        type="button"
        className={`${styles.iconBtn} ${styles.hamburger}`}
        onClick={onOpenMenu}
        aria-label="Open navigation menu"
      >
        <i className="bi bi-list" aria-hidden="true" />
      </button>

      {heading?.back && (
        <Link to={heading.back} className={styles.iconBtn} aria-label="Go back">
          <i className="bi bi-arrow-left" aria-hidden="true" />
        </Link>
      )}

      {heading && (
        <div className={styles.pageHeadingWrap}>
          <h1 className={styles.pageHeading}>
            {heading.title}
            {heading.suffix != null && <span className={styles.pageHeadingSuffix}>{heading.suffix}</span>}
          </h1>
          {heading.badge}
        </div>
      )}

      <div className={styles.spacer} />

      {heading?.actions ? (
        <div className={styles.topActions}>{heading.actions}</div>
      ) : (
        <>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => navigate('/admin/settings/notifications')}
            aria-label="Notifications"
          >
            <i className="bi bi-bell" aria-hidden="true" />
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => navigate('/admin/payments/transactions')}
            aria-label="Billing and transactions"
          >
            <i className="bi bi-receipt" aria-hidden="true" />
          </button>

          <div className="dropdown">
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="Account menu"
            >
              <i className="bi bi-list" aria-hidden="true" />
            </button>
            {menuOpen && (
              <>
                <div className="position-fixed top-0 start-0 w-100 h-100" onClick={() => setMenuOpen(false)} />
                <div className="dropdown-menu dropdown-menu-end show mt-1" style={{ right: 0, position: 'absolute' }}>
                  <div className="px-3 py-2 border-bottom">
                    <div className="d-flex align-items-center gap-2">
                      <span className={styles.avatar}>{admin ? initials(admin.name) : '·'}</span>
                      <div className="overflow-hidden">
                        <div className="fw-semibold small text-truncate">{admin?.name}</div>
                        <div className="text-body-secondary small text-truncate">{admin?.email}</div>
                      </div>
                    </div>
                  </div>
                  <a className="dropdown-item" href="/" target="_blank" rel="noreferrer">
                    <i className="bi bi-shop me-2" aria-hidden="true" />
                    View storefront
                  </a>
                  <button className="dropdown-item" type="button" onClick={() => { setMenuOpen(false); navigate('/admin/settings'); }}>
                    <i className="bi bi-gear me-2" aria-hidden="true" />
                    Settings
                  </button>
                  <button className="dropdown-item text-danger" type="button" onClick={handleLogout} disabled={loggingOut}>
                    <i className="bi bi-box-arrow-right me-2" aria-hidden="true" />
                    {loggingOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </header>
  );
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
