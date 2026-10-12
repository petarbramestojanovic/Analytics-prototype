/** `aria-sort` value for a column's current sort direction. */
export const ariaSort = (direction: 'asc' | 'desc' | false) =>
  direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none';
