import { CalendarDays } from 'lucide-react';
import { useFormatters } from '@/i18n';
import { cn } from '@/lib/cn';

/** A date shown as a field — click to open a calendar for it. `date` empty
 *  shows `placeholder`. */
export function DateButton({
  label,
  date,
  placeholder,
  active,
  onClick,
}: {
  label: string;
  date: string;
  placeholder?: string;
  active: boolean;
  onClick: () => void;
}) {
  const { fmtDateLong } = useFormatters();
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={active}
      onClick={onClick}
      className={cn(
        'tnum inline-flex h-9 flex-1 items-center justify-between gap-2 rounded-lg border bg-white px-3 text-sm text-brame-dark dark:bg-brame-dark-light dark:text-gray-100',
        active
          ? 'border-brame-teal dark:border-brame-turquoise'
          : 'border-gray-300 dark:border-white/15',
      )}
    >
      {date ? (
        fmtDateLong(date)
      ) : (
        <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
      )}
      <CalendarDays size={14} className="text-gray-400" />
    </button>
  );
}
