import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui';

export interface PaginationProps {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  onPageChange: (page: number) => void;
}

/**
 * The "showing X–Y of Z" footer + prev/next controls. Takes its state from
 * `usePagination(...).pagination` (spread it in), or from a TanStack Table
 * instance via `tablePagination()` (tablePagination.ts).
 */
export function Pagination({ page, pageCount, from, to, total, onPageChange }: PaginationProps) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500 dark:text-gray-400">{t('table.showingRange', { from, to, total })}</span>
      <div className="flex items-center gap-1">
        <Button size="sm" icon={<ChevronLeft size={13} />} onClick={() => onPageChange(page - 1)} disabled={page <= 0}>
          {t('table.previous')}
        </Button>
        <Button size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount - 1}>
          {t('table.next')}
          <ChevronRight size={13} />
        </Button>
      </div>
    </div>
  );
}
