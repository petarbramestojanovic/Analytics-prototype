export interface SortState<K extends string> {
  key: K;
  desc: boolean;
}

/** The one column-header toggle every sortable table uses: clicking a new
 *  column sorts it highest-first (the useful default for counts and rates),
 *  clicking the active column again flips the direction. */
export function toggleSort<K extends string>(current: SortState<K>, key: K): SortState<K> {
  return { key, desc: current.key === key ? !current.desc : true };
}

/** Compares numbers numerically and strings alphabetically. */
export function compareValues(a: number | string, b: number | string): number {
  return typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b) : Number(a) - Number(b);
}
