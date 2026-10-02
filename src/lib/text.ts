/** Case-insensitive "does any of these fields contain the search text" — the
 *  one search rule every list view's search box uses. An empty query matches
 *  everything. */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((f) => f?.toLowerCase().includes(needle));
}
