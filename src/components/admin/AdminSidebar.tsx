import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { ADMIN_NAV, type NavItem } from './adminNav';
import styles from './AdminSidebar.module.scss';

function isGroupActive(item: NavItem, pathname: string): boolean {
  return item.children?.some((c) => pathname === c.to || pathname.startsWith(`${c.to}/`)) ?? false;
}

interface AdminSidebarProps {
  counts?: Record<string, number>;
  onNavigate?: () => void;
}

export function AdminSidebar({ counts, onNavigate }: AdminSidebarProps) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of ADMIN_NAV) {
      if (item.children) initial[item.label] = isGroupActive(item, pathname);
    }
    return initial;
  });

  const toggle = (label: string) => setOpen((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <div className={styles.sidebar}>
      <div className={styles.brand}>
        <img src="/favicon.svg" alt="" className={styles.brandMark} />
        <span>Atlase</span>
      </div>

      <nav className={styles.nav} aria-label="Admin navigation">
        {ADMIN_NAV.map((item) => {
          if (!item.children) {
            return (
              <NavLink
                key={item.label}
                to={item.to ?? '#'}
                end={item.to === '/admin'}
                onClick={onNavigate}
                className={({ isActive }) => clsx(styles.link, isActive && styles.active)}
              >
                <i className={`bi ${item.icon}`} aria-hidden="true" />
                <span>{item.label}</span>
                {item.badgeKey && counts?.[item.badgeKey] ? (
                  <span className={styles.badge}>{counts[item.badgeKey]}</span>
                ) : null}
              </NavLink>
            );
          }

          const groupOpen = open[item.label] ?? false;
          const active = isGroupActive(item, pathname);
          return (
            <div key={item.label}>
              <button
                type="button"
                className={clsx(styles.groupToggle, active && !groupOpen && styles.active)}
                onClick={() => toggle(item.label)}
                aria-expanded={groupOpen}
              >
                <span className={styles.groupToggleInner}>
                  <i className={`bi ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
                <i
                  className={clsx('bi bi-chevron-right', styles.chevron, groupOpen && styles.chevronOpen)}
                  aria-hidden="true"
                />
              </button>
              {groupOpen && (
                <div className={styles.submenu}>
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      onClick={onNavigate}
                      className={({ isActive }) => clsx(styles.subLink, isActive && styles.subActive)}
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <a
          className={styles.storeLink}
          href="/"
          target="_blank"
          rel="noreferrer"
        >
          <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
          <span>View storefront</span>
        </a>
      </div>
    </div>
  );
}
