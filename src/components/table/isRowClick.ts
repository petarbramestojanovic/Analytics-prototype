import type { MouseEvent } from 'react';

/** Whether a click on a row is a click on the row itself — not on a link,
 *  button or other control inside it, not the end of a text selection, and not
 *  something portalled out of the row (an open actions menu) that merely
 *  bubbles through React. */
export function isRowClick(e: MouseEvent<HTMLTableRowElement>): boolean {
  const target = e.target as Element;
  if (!e.currentTarget.contains(target)) return false;
  if (target.closest('a, button, input, select, textarea, [role="menuitem"], [role="button"]')) return false;
  return !window.getSelection()?.toString();
}
