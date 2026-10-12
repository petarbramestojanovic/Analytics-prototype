import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { StorageKey } from '@/config/storageKeys';
import { codecs, readStorage, writeStorage } from '@/lib/storage';

type FilterValue = string | number | boolean;

/** `statusFilter` → `?status=` — the URL reads like the UI, not the code. */
const paramName = (key: string) => key.replace(/Filter$/, '');

function encode(value: FilterValue): string {
  return typeof value === 'boolean' ? (value ? '1' : '0') : String(value);
}

/** Parses a param back to the type of its default; anything unparseable
 *  falls back to the default rather than poisoning the filter. */
function decode(raw: string, fallback: FilterValue): FilterValue {
  if (typeof fallback === 'boolean') return raw === '1';
  if (typeof fallback === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }
  return raw;
}

/** Closed sets of values per filter. A link is user input — an unknown
 *  sort key or tab from a stale or hand-edited URL is dropped, not trusted. */
type AllowedValues<T> = { [K in keyof T]?: readonly T[K][] };

function fromParams<T extends Record<string, FilterValue>>(
  params: URLSearchParams,
  defaults: T,
  allowed: AllowedValues<T>
): Partial<T> | null {
  const out: Partial<T> = {};
  let found = false;
  for (const key of Object.keys(defaults) as (keyof T & string)[]) {
    const raw = params.get(paramName(key));
    if (raw === null) continue;
    const value = decode(raw, defaults[key]) as T[keyof T & string];
    if (allowed[key] && !allowed[key].includes(value)) continue;
    out[key] = value;
    found = true;
  }
  return found ? out : null;
}

/**
 * Object-shaped filter state for a list view (search text, dropdowns, tabs,
 * sort), mirrored into the URL so a link reproduces exactly what the sender
 * was looking at. Only non-default values are written, so a pristine list
 * has a clean URL.
 *
 * On mount the URL wins; with no filter params in it, the last state saved
 * in localStorage is restored instead — a reload or sidebar click doesn't
 * drop what the user was just looking at. Stored and URL values are merged
 * over `defaults`, so adding a new filter never breaks an older link.
 */
export function useListFilters<T extends Record<string, FilterValue>>(
  key: StorageKey,
  defaults: T,
  allowed: AllowedValues<T> = {}
) {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<T>(() => {
    const fromUrl = fromParams(params, defaults, allowed);
    if (fromUrl) return { ...defaults, ...fromUrl };
    const stored = readStorage(key, codecs.json<Partial<T>>());
    return stored && typeof stored === 'object' ? { ...defaults, ...stored } : defaults;
  });

  // Mirror into storage and the URL. `replace` so typing in a search box
  // doesn't push a history entry per keystroke; unrelated params are kept.
  useEffect(() => {
    writeStorage(key, filters, codecs.json<T>());
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const k of Object.keys(defaults)) {
          if (filters[k] === defaults[k]) next.delete(paramName(k));
          else next.set(paramName(k), encode(filters[k]));
        }
        return next.toString() === prev.toString() ? prev : next;
      },
      { replace: true }
    );
    // `defaults` is a module-level constant at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, key, setParams]);

  const setFilter = (patch: Partial<T>) => setFilters((prev) => ({ ...prev, ...patch }));
  const resetFilters = () => setFilters(defaults);
  const filtersActive = (Object.keys(defaults) as (keyof T)[]).some((k) => filters[k] !== defaults[k]);

  return { filters, setFilter, resetFilters, filtersActive };
}
