import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { ADMIN_NAV, type NavChild, type NavItem } from './adminNav';
import styles from './AdminSidebar.module.scss';

interface AdminSidebarProps {
  counts?: Record<string, number>;
  onNavigate?: () => void;
}

function isSectionActive(item: NavItem, pathname: string): boolean {
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

/** The child whose `to` is the longest matching prefix of the current path wins. */
function activeChild(children: NavChild[], pathname: string): NavChild | undefined {
  const matches = children.filter((c) => pathname === c.to || pathname.startsWith(`${c.to}/`));
  if (matches.length === 0) return undefined;
  return matches.reduce((a, b) => (b.to.length > a.to.length ? b : a));
}

export function AdminSidebar({ counts, onNavigate }: AdminSidebarProps) {
  const { pathname } = useLocation();

  return (
    <div className={styles.sidebar}>
      <div className={styles.brand}>
        <img src="/atlase-logo-white.svg" alt="" className={styles.brandMark} aria-hidden="true" />
        <span className={styles.brandName}>Atlasé</span>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className={styles.brandLaunch}
          aria-label="Open storefront in a new tab"
        >
          <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
        </a>
      </div>

      <nav className={styles.nav} aria-label="Admin navigation">
        {ADMIN_NAV.map((item) => {
          const expanded = !!item.children && isSectionActive(item, pathname);
          const current = expanded && item.children ? activeChild(item.children, pathname) : undefined;

          return (
            <div key={item.label}>
              <NavLink
                to={item.to}
                end={item.to === '/admin'}
                onClick={onNavigate}
                className={({ isActive }) => clsx(styles.link, isActive && styles.active)}
              >
                <i className={`bi ${item.icon}`} aria-hidden="true" />
                <span>{item.label}</span>
                {!expanded && item.badgeKey && counts?.[item.badgeKey] ? (
                  <span className={styles.badge}>{counts[item.badgeKey]}</span>
                ) : null}
              </NavLink>

              {expanded && item.children && (
                <div className={styles.subNav}>
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      onClick={onNavigate}
                      className={clsx(styles.subLink, current?.to === child.to && styles.subActive)}
                    >
                      <span>{child.label}</span>
                      {child.badgeKey && counts?.[child.badgeKey] ? (
                        <span className={styles.subBadge}>{counts[child.badgeKey]}</span>
                      ) : null}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
