import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch, setCsrfToken } from '@/lib/api';
import { useAuth, ADMIN_SESSION_KEY } from '@/features/auth/AuthProvider';
import { useToast } from '@/components/feedback/Toast';
import styles from '@/layouts/AdminLayout.module.scss';

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface AdminTopbarProps {
  onOpenMenu: () => void;
}

export function AdminTopbar({ onOpenMenu }: AdminTopbarProps) {
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
      <button type="button" className={styles.hamburger} onClick={onOpenMenu} aria-label="Open menu">
        <i className="bi bi-list" aria-hidden="true" />
      </button>

      <div className={styles.spacer} />

      <a
        href="/"
        target="_blank"
        rel="noreferrer"
        className="btn btn-sm btn-outline-secondary d-none d-sm-inline-flex align-items-center gap-1"
      >
        <i className="bi bi-shop" aria-hidden="true" />
        <span>Storefront</span>
      </a>

      <div className="dropdown">
        <button
          type="button"
          className={styles.userButton}
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
        >
          <span className={styles.avatar}>{admin ? initials(admin.name) : '·'}</span>
          <span className="d-none d-md-inline">{admin?.name ?? 'Account'}</span>
          <i className="bi bi-chevron-down small" aria-hidden="true" />
        </button>
        {menuOpen && (
          <>
            <div className="position-fixed top-0 start-0 w-100 h-100" onClick={() => setMenuOpen(false)} />
            <div className="dropdown-menu dropdown-menu-end show mt-1" style={{ right: 0, position: 'absolute' }}>
              <div className="px-3 py-2 border-bottom">
                <div className="fw-semibold small">{admin?.name}</div>
                <div className="text-body-secondary small text-truncate">{admin?.email}</div>
              </div>
              <button className="dropdown-item" type="button" onClick={() => navigate('/admin/settings')}>
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
    </header>
  );
}
