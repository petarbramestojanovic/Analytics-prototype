export interface ComboboxOption {
  value: string;
  /** What is shown and searched. */
  label: string;
  /** A second, quieter line that is searched too (e.g. a campaign's client). */
  description?: string;
}

/** Rows drawn at once. A thousand options are never in the DOM together; the
 *  rest are one more keystroke away. */
export const MAX_ROWS = 100;

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

/** Lower-cased, accent-free text per option, built once per option list. */
export function searchIndex(options: readonly ComboboxOption[]): string[] {
  return options.map((o) => normalize(`${o.label} ${o.description ?? ''}`));
}

/**
 * The options matching what was typed: every word has to appear in the label or
 * description, ignoring case and accents. A name that starts with the first
 * word comes before one that merely contains it; otherwise the given order is
 * kept. No words returns every option.
 */
export function filterOptions(
  options: readonly ComboboxOption[],
  index: readonly string[],
  query: string,
): ComboboxOption[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...options];
  const starts = (o: ComboboxOption) => (normalize(o.label).startsWith(words[0]) ? 0 : 1);
  return options
    .map((o, i) => ({ o, i }))
    .filter(({ i }) => words.every((w) => index[i].includes(w)))
    .sort((a, b) => starts(a.o) - starts(b.o) || a.i - b.i)
    .map(({ o }) => o);
}
