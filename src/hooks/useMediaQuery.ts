import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Tablet and up — the width where a two-column layout has room. Matches Tailwind's `md`. */
export const useIsTablet = () => useMediaQuery('(min-width: 768px)');

/** Desktop — the width where a full table fits. Matches Tailwind's `lg`. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
