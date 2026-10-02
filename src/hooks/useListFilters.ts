import type { StorageKey } from '@/config/storageKeys';
import { codecs, type StorageCodec } from '@/lib/storage';
import { usePersistentState } from './usePersistentState';

/**
 * Object-shaped, localStorage-backed filter state for a list view — the
 * search text, dropdowns and tabs a user left it on survive a reload, and
 * `resetFilters` puts everything back. Stored values are merged over
 * `defaults`, so adding a new filter never breaks an older stored entry.
 */
export function useListFilters<T extends object>(key: StorageKey, defaults: T) {
  const json = codecs.json<Partial<T>>();
  const codec: StorageCodec<T> = {
    parse: (raw) => {
      const stored = json.parse(raw);
      return stored && typeof stored === 'object' ? { ...defaults, ...stored } : undefined;
    },
    serialize: json.serialize,
  };
  const [filters, setFilters] = usePersistentState<T>(key, defaults, codec as StorageCodec<NonNullable<T>>);

  const setFilter = (patch: Partial<T>) => setFilters((prev) => ({ ...prev, ...patch }));
  const resetFilters = () => setFilters(defaults);
  const filtersActive = (Object.keys(defaults) as (keyof T)[]).some((k) => filters[k] !== defaults[k]);

  return { filters, setFilter, resetFilters, filtersActive };
}
