import { CalendarDays, X } from 'lucide-react';
import { useFormatters, useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { Calendar, Popover } from '@/components/ui';

/**
 * A single-date filter field for a filter tray (FilterSheet): shows the chosen date (or
 * `placeholder`) and opens a calendar. Dates are YYYY-MM-DD; empty = not set.
 */
export function DateFilter({
  value,
  onChange,
  placeholder,
  today,
}: {
  value: string;
  onChange: (date: string) => void;
  placeholder: string;
  today?: string;
}) {
  const { t } = useI18n();
  const { fmtDateLong } = useFormatters();

  return (
    <Popover
      className="w-72"
      trigger={({ open, toggle }) => (
        <div className="relative">
          <button
            type="button"
            aria-expanded={open}
            onClick={toggle}
            className={cn(
              'flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-sm outline-none dark:bg-brame-dark-light',
              open
                ? 'border-brame-teal dark:border-brame-turquoise'
                : 'border-gray-300 dark:border-white/15',
              value
                ? 'tnum text-brame-dark dark:text-gray-100'
                : 'text-gray-400 dark:text-gray-500',
            )}
          >
            <span className={cn('truncate', value && 'pr-5')}>
              {value ? fmtDateLong(value) : placeholder}
            </span>
            <CalendarDays size={14} className="shrink-0 text-gray-400" />
          </button>
          {value && (
            <button
              type="button"
              aria-label={t('dateRange.clear')}
              onClick={() => onChange('')}
              className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-brame-dark dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}
    >
      {(close) => (
        <Calendar
          value={value}
          today={today}
          onSelect={(date) => {
            onChange(date);
            close();
          }}
        />
      )}
    </Popover>
  );
}
