import { useEffect, useState } from 'react';

/**
 * Page/slice math extracted from the identical logic ClientsView and
 * AlertsView each hand-rolled. Clamps back to page 0 whenever `items`
 * shrinks (a new search/filter narrowing the set) so callers can never be
 * left on a page that no longer exists.
 */
export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);

  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [pageCount, page]);

  const from = items.length === 0 ? 0 : currentPage * pageSize + 1;
  const to = Math.min((currentPage + 1) * pageSize, items.length);
  const paged = items.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  return { page: currentPage, setPage, pageCount, paged, from, to };
}
