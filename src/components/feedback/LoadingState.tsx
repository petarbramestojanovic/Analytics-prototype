import { Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';

/** Shared loading placeholder, same visual language as EmptyState. */
export function LoadingState({ label, compact = false }: { label?: string; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 text-center', compact ? 'py-6' : 'py-16')}>
      <Loader2 size={compact ? 18 : 22} className="animate-spin text-gray-300 dark:text-gray-600" />
      <span className="text-sm text-gray-500 dark:text-gray-400">{label ?? t('common.loading')}</span>
    </div>
  );
}
