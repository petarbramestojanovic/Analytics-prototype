import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * One string of page state kept in the URL — a search box or a single
 * dropdown — so a pasted link opens the page as the sender saw it. The
 * default value is never written, keeping pristine URLs clean; `replace`
 * means typing doesn't leave one history entry per keystroke. For a whole
 * set of list filters with localStorage fallback, see useListFilters.
 */
export function useSearchParamState(name: string, defaultValue = '') {
  const [params, setParams] = useSearchParams();
  const value = params.get(name) ?? defaultValue;

  const setValue = useCallback(
    (next: string) =>
      setParams(
        (prev) => {
          const out = new URLSearchParams(prev);
          if (next === defaultValue) out.delete(name);
          else out.set(name, next);
          return out;
        },
        { replace: true }
      ),
    [name, defaultValue, setParams]
  );

  return [value, setValue] as const;
}
