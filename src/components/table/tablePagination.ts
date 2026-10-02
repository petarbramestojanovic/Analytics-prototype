import type { PaginationProps } from './Pagination';

/** Pagination props for a TanStack Table instance. */
export function tablePagination(table: {
  getState: () => { pagination: { pageIndex: number; pageSize: number } };
  getPageCount: () => number;
  getFilteredRowModel: () => { rows: unknown[] };
  setPageIndex: (page: number) => void;
}): PaginationProps {
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;
  return {
    page: pageIndex,
    pageCount: table.getPageCount(),
    from: total === 0 ? 0 : pageIndex * pageSize + 1,
    to: Math.min((pageIndex + 1) * pageSize, total),
    total,
    onPageChange: (p) => table.setPageIndex(p),
  };
}
