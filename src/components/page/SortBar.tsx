import { ArrowDown, ArrowUp } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { IconButton } from '@/components/ui';
import { FilterSelect } from './Toolbar';

/**
 * How a list of cards is sorted — cards have no column headers to click. A
 * field dropdown and an ascending/descending toggle. With `defaultLabel` the
 * dropdown has a leading "no sort" choice (`value` null) and the toggle waits
 * for a field to be picked.
 */
export function SortBar({
  fields,
  value,
  desc,
  onChange,
  defaultLabel,
  className,
}: {
  fields: { value: string; label: string }[];
  value: string | null;
  desc: boolean;
  /** `field` is null when the default order is picked. */
  onChange: (next: { field: string | null; desc: boolean }) => void;
  defaultLabel?: string;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn('flex items-center gap-2 border-gray-200 px-4 py-3 dark:border-white/10', className)}>
      <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">{t('common.sortBy')}</span>
      <FilterSelect
        className="min-w-0 flex-1"
        value={value ?? 'all'}
        allLabel={defaultLabel}
        onChange={(v) => onChange({ field: v === 'all' ? null : v, desc })}
        options={fields}
      />
      <IconButton
        variant="outline"
        label={t(desc ? 'common.sortDesc' : 'common.sortAsc')}
        icon={desc ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
        disabled={value === null}
        onClick={() => onChange({ field: value, desc: !desc })}
      />
    </div>
  );
}
