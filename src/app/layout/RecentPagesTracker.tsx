import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PAGE_TITLE_EVENT } from '@/hooks/usePageTitle';
import { recordRecentPage } from '@/lib/recentPages';
import { isRecordPath } from './isRecordPath';
import { useRecentScope } from './useRecentScope';

/** Remembers each record you open, under its title, for the "recently viewed"
 *  menu. List pages aren't kept: they are a click away in the sidebar and in
 *  search, so they would only push the records out. Renders nothing; lives in
 *  the app shell so the sign-in screens are never recorded. */
export function RecentPagesTracker() {
  const { pathname } = useLocation();
  const scope = useRecentScope();
  const latest = useRef({ pathname, scope });
  latest.current = { pathname, scope };

  useEffect(() => {
    const onTitle = (e: Event) => {
      const title = (e as CustomEvent<string>).detail;
      if (isRecordPath(latest.current.pathname)) recordRecentPage(latest.current.pathname, title, latest.current.scope);
    };
    window.addEventListener(PAGE_TITLE_EVENT, onTitle);
    return () => window.removeEventListener(PAGE_TITLE_EVENT, onTitle);
  }, []);

  return null;
}
