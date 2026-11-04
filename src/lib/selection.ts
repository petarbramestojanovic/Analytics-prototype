/**
 * Multi-select filter values travel through useListFilters as one string
 * (filters there are plain strings/numbers/booleans): `'all'` means nothing is
 * picked, otherwise the picked ids joined by a comma. Ids never contain one.
 * A link with a single id (the old single-select format) reads as a list of one.
 */
export const ALL = 'all';

export const parseSelection = (value: string): string[] =>
  !value || value === ALL ? [] : value.split(',');

export const serializeSelection = (ids: string[]): string => (ids.length ? ids.join(',') : ALL);

/** True when nothing is picked (no narrowing), or `id` is among the picks. */
export const matchesSelection = (value: string, id: string): boolean => {
  const picked = parseSelection(value);
  return picked.length === 0 || picked.includes(id);
};
