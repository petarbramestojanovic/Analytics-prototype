import { useEffect, useState } from 'react';
import type { PaginationProps } from '@/components/table';

/**
 * Page/slice math for any client-side list. Clamps back to the last page
 * whenever `items` shrinks (a new search/filter narrowing the set) so callers
 * can never be left on a page that no longer exists.
 *
 * `resetOn` takes the caller's filter values (search text, dropdown
 * selections, etc.) and jumps back to page 0 whenever any of them change —
 * every list view wants "a new filter always starts from page 1". Pass `[]`
 * (the default) to opt out.
 *
 * Spread `pagination` straight into `<Pagination />`.
 */
export function usePagination<T>(items: T[], pageSize = 10, resetOn: readonly unknown[] = []) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);

  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [pageCount, page]);

  // `resetOn` is the caller's own filter values; its elements are the
  // intended deps, not the array literal's identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPage(0), resetOn);

  const from = items.length === 0 ? 0 : currentPage * pageSize + 1;
  const to = Math.min((currentPage + 1) * pageSize, items.length);
  const paged = items.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const pagination: PaginationProps = {
    page: currentPage,
    pageCount,
    from,
    to,
    total: items.length,
    onPageChange: setPage,
  };

  return { page: currentPage, setPage, pageCount, paged, from, to, pagination };
}
