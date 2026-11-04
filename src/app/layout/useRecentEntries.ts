import { useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { Clock, type LucideIcon } from 'lucide-react';
import { useI18n } from '@/i18n';
import { readRecentPages } from '@/lib/recentPages';
import { hasAccess, useSession } from '@/features/session';
import { appRoutes } from '../routes';
import { isRecordPath } from './isRecordPath';
import { NAV_SECTIONS, NAV_TOP_ITEMS } from '../navigation';
import { useRecentScope } from './useRecentScope';

export interface RecentEntry {
  path: string;
  title: string;
  icon: LucideIcon;
  /** What kind of page it is, from the sidebar ("Campaigns", "Reports"). */
  kind?: string;
}

const ALL_NAV_ITEMS = [...NAV_TOP_ITEMS, ...NAV_SECTIONS.flatMap((s) => s.items)];

/** The nav item a path belongs to (longest matching prefix): it lends a
 *  recent page its icon and its kind label. */
function navItemFor(pathname: string) {
  return ALL_NAV_ITEMS.filter((i) => pathname === i.to.split('?')[0] || pathname.startsWith(`${i.to.split('?')[0]}/`)).sort(
    (a, b) => b.to.length - a.to.length
  )[0];
}

/**
 * The pages this seat recently opened, newest first, ready to list. Only pages
 * the seat can still open, and never the one it's on. Read fresh each time
 * `refreshKey` changes (the menu passes whether it is open), since the list
 * lives in storage rather than React state.
 */
export function useRecentEntries(limit: number, refreshKey: unknown): RecentEntry[] {
  const { t } = useI18n();
  const session = useSession();
  const scope = useRecentScope();
  const { pathname } = useLocation();

  return useMemo(
    () =>
      readRecentPages(scope)
        .filter((p) => p.path !== pathname && isRecordPath(p.path))
        .filter((p) => {
          const route = appRoutes.find((r) => matchPath({ path: r.path, end: true }, p.path));
          return !!route && hasAccess(session, route.access);
        })
        .slice(0, limit)
        .map((p) => {
          const nav = navItemFor(p.path);
          return { path: p.path, title: p.title, icon: nav?.icon ?? Clock, kind: nav ? t(nav.labelKey) : undefined };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scope, pathname, session, limit, t, refreshKey]
  );
}
