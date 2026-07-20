import { createContext, useContext, useEffect, type ReactNode } from 'react';

export interface AdminHeading {
  title: ReactNode;
  /** Muted inline suffix after the title, e.g. "lifetime". */
  suffix?: ReactNode;
  /** When set, a back arrow linking to this path is shown before the title. */
  back?: string;
  /** Status pill (or any node) rendered next to the title. */
  badge?: ReactNode;
  /** Right-side actions. When provided, they replace the global topbar icons. */
  actions?: ReactNode;
}

interface AdminHeadingContextValue {
  heading: AdminHeading | null;
  setHeading: (heading: AdminHeading | null) => void;
}

export const AdminHeadingContext = createContext<AdminHeadingContextValue>({
  heading: null,
  setHeading: () => {},
});

/**
 * Set the heading shown in the admin topbar for the lifetime of the calling page.
 * Clears automatically on unmount. Pages that want a plain topbar (e.g. the
 * dashboard) simply don't call this.
 *
 * Pass a `useMemo`-stable object so the effect doesn't re-run every render — the
 * hook intentionally keys off the object identity.
 */
export function useAdminHeading(heading: AdminHeading) {
  const { setHeading } = useContext(AdminHeadingContext);
  useEffect(() => {
    setHeading(heading);
    return () => setHeading(null);
  }, [setHeading, heading]);
}
