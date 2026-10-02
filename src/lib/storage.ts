import type { StorageKey } from '@/config/storageKeys';

/**
 * How a value is written to and read back from localStorage. `parse` returns
 * `undefined` for anything it does not recognise, so a corrupt or outdated
 * entry falls back to the default instead of crashing the app.
 */
export interface StorageCodec<T> {
  parse: (raw: string) => T | undefined;
  serialize: (value: T) => string;
}

export const codecs = {
  string: {
    parse: (raw) => raw,
    serialize: (v) => v,
  } satisfies StorageCodec<string>,
  /** Accepts '1'/'0' too, for values written before this codec existed. */
  boolean: {
    parse: (raw) => (raw === 'true' || raw === '1' ? true : raw === 'false' || raw === '0' ? false : undefined),
    serialize: (v) => String(v),
  } satisfies StorageCodec<boolean>,
  number: {
    parse: (raw) => {
      const n = Number(raw);
      return raw.trim() !== '' && Number.isFinite(n) ? n : undefined;
    },
    serialize: (v) => String(v),
  } satisfies StorageCodec<number>,
  json: <T>(): StorageCodec<T> => ({
    parse: (raw) => {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return undefined;
      }
    },
    serialize: (v) => JSON.stringify(v),
  }),
  /** Restricts a string to a known set, e.g. 'light' | 'dark'. */
  oneOf: <T extends string>(values: readonly T[]): StorageCodec<T> => ({
    parse: (raw) => (values as readonly string[]).includes(raw) ? (raw as T) : undefined,
    serialize: (v) => v,
  }),
};

/** Reads a key, or `undefined` if it is missing, unreadable or fails to parse. */
export function readStorage<T>(key: StorageKey, codec: StorageCodec<T>): T | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? undefined : codec.parse(raw);
  } catch {
    return undefined;
  }
}

/** Writes a key; `null` removes it. Storage being unavailable (private
 *  browsing, quota) is not an error — the value just won't survive a reload. */
export function writeStorage<T>(key: StorageKey, value: T | null, codec: StorageCodec<T>): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, codec.serialize(value));
  } catch {
    // see above
  }
}
