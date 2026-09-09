import { useEffect } from 'react';

const SUFFIX = 'Brame Analytics';

/** Sets the browser tab title for the page currently mounted. Falls back to
 *  the bare suffix while `title` is still loading (e.g. a campaign name that
 *  hasn't fetched yet) so the tab never shows stale or blank text. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX;
    return () => {
      document.title = SUFFIX;
    };
  }, [title]);
}
