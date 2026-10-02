import { Activity } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';

const SIZES = {
  md: { icon: 'h-7 w-7', title: 'text-lg' },
  lg: { icon: 'h-8 w-8', title: 'text-xl' },
} as const;

/**
 * The BRAME Analytics logo lockup — icon, name, and (unless `compact`) the
 * "Analytics" subtitle. `onDark` is for the teal sidebar/brand panels.
 */
export function BrandMark({
  compact = false,
  onDark = true,
  size = 'md',
  className,
}: {
  compact?: boolean;
  onDark?: boolean;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Activity
        className={cn(
          'flex-shrink-0',
          compact ? 'h-6 w-6' : SIZES[size].icon,
          onDark ? 'text-brame-lime' : 'text-brame-teal dark:text-brame-lime'
        )}
      />
      {compact ? (
        <span className={cn('font-bold', onDark ? 'text-white' : 'text-brame-dark dark:text-white')}>
          {t('common.appName')}
        </span>
      ) : (
        <div className="truncate leading-tight">
          <div className={cn('font-bold', SIZES[size].title)}>{t('common.appName')}</div>
          <div className="text-[10px] uppercase tracking-widest text-brame-lime/80">{t('common.appSubtitle')}</div>
        </div>
      )}
    </div>
  );
}
