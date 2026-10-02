import { useCallback, useState } from 'react';
import type { StorageKey } from '@/config/storageKeys';
import { readStorage, writeStorage, type StorageCodec } from '@/lib/storage';

/**
 * `useState` that survives a reload — the single implementation behind every
 * browser-side preference (theme, language, thresholds, filters, …). Setting
 * `null` clears the key and falls back to `initial`.
 */
export function usePersistentState<T>(
  key: StorageKey,
  initial: NoInfer<T> | (() => NoInfer<T>),
  codec: StorageCodec<NonNullable<T>>
): [T, (next: T | null | ((prev: T) => T)) => void] {
  const resolveInitial = () => (typeof initial === 'function' ? (initial as () => T)() : initial);
  const [value, setValue] = useState<T>(() => readStorage(key, codec) ?? resolveInitial());

  const set = useCallback(
    (next: T | null | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
        writeStorage(key, (resolved ?? null) as NonNullable<T> | null, codec);
        return resolved ?? resolveInitial();
      });
    },
    // `initial` and `codec` are configuration, fixed for the key's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );

  return [value, set];
}
