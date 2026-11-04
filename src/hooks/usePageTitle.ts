import { useEffect } from 'react';

const SUFFIX = 'Brame Analytics';

/** Fired whenever a page sets a real title, so something outside the page (the
 *  ⌘K "recently viewed" list) can note the page without every page knowing. */
export const PAGE_TITLE_EVENT = 'brame:page-title';

/** Sets the browser tab title for the page currently mounted. Falls back to
 *  the bare suffix while `title` is still loading (e.g. a campaign name that
 *  hasn't fetched yet) so the tab never shows stale or blank text. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX;
    if (title) window.dispatchEvent(new CustomEvent(PAGE_TITLE_EVENT, { detail: title }));
    return () => {
      document.title = SUFFIX;
    };
  }, [title]);
}
