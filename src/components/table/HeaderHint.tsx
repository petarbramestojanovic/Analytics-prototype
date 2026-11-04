import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { FloatingTip } from '@/components/ui';
import { focusRing } from '@/components/ui/buttonStyles';

/**
 * An (i) icon for a column header: explains what every value in the column
 * means, once, instead of on each cell. Sits beside the header's sort button
 * (never inside it), so opening it can't re-sort the column.
 */
export function HeaderHint({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <FloatingTip side="bottom" content={children}>
      <button
        type="button"
        aria-label={t('common.moreInfo')}
        className={cn('inline-flex rounded-full text-gray-300 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300', focusRing)}
      >
        <Info size={12} />
      </button>
    </FloatingTip>
  );
}
