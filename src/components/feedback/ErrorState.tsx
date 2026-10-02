import { AlertCircle } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';

/** Shared error placeholder, same visual language as EmptyState. Pass
 *  `onRetry` (typically a query's `refetch`) to offer a retry button. */
export function ErrorState({
  label,
  onRetry,
  compact = false,
}: {
  label?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 text-center', compact ? 'py-6' : 'py-16')}>
      <AlertCircle size={compact ? 18 : 22} className="text-red-300 dark:text-red-500/60" />
      <span className="text-sm text-red-600 dark:text-red-400">{label ?? t('common.loadError')}</span>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}
