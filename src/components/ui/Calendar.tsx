import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/**
 * A month-grid date picker in the app's own styling (the browser's native
 * calendar can't be themed). Dates are plain YYYY-MM-DD strings, Monday
 * first. `min`/`max` grey out days outside the allowed span; `rangeStart` /
 * `rangeEnd` shade the days between them so a from/to pair reads as a span.
 */
export function Calendar({
  value,
  onSelect,
  min,
  max,
  rangeStart,
  rangeEnd,
  today,
}: {
  value: string;
  onSelect: (date: string) => void;
  min?: string;
  max?: string;
  rangeStart?: string;
  rangeEnd?: string;
  /** Marks today with a ring. */
  today?: string;
}) {
  const { dateLocale } = useI18n();
  const anchor = value || today || iso(new Date().getFullYear(), new Date().getMonth(), 1);
  const [view, setView] = useState({
    year: Number(anchor.slice(0, 4)),
    month: Number(anchor.slice(5, 7)) - 1,
  });

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(dateLocale, {
    month: 'long',
    year: 'numeric',
  });
  // 2024-01-01 was a Monday — a fixed week to take localized weekday names from.
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(dateLocale, { weekday: 'narrow' }),
  );

  const firstWeekday = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const step = (delta: number) =>
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const monthStart = iso(view.year, view.month, 1);
  const monthEnd = iso(view.year, view.month, daysInMonth);
  const navButton =
    'inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-white/10';

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          className={navButton}
          onClick={() => step(-1)}
          disabled={!!min && monthStart <= min}
          aria-label="Previous month"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm font-medium capitalize text-brame-dark dark:text-gray-100">
          {monthLabel}
        </span>
        <button
          type="button"
          className={navButton}
          onClick={() => step(1)}
          disabled={!!max && monthEnd >= max}
          aria-label="Next month"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {weekdays.map((w, i) => (
          <div key={i} className="pb-1 text-[11px] font-medium text-gray-400 dark:text-gray-500">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`pad-${i}`} />;
          const date = iso(view.year, view.month, day);
          const disabled = (!!min && date < min) || (!!max && date > max);
          const selected = date === value;
          const inRange = !!rangeStart && !!rangeEnd && date > rangeStart && date < rangeEnd;
          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(date)}
              aria-pressed={selected}
              className={cn(
                'tnum mx-auto h-8 w-8 rounded-full text-sm transition-colors',
                selected
                  ? 'bg-brame-teal font-medium text-white'
                  : inRange
                    ? 'bg-brame-teal/10 text-brame-dark dark:bg-brame-teal/30 dark:text-gray-100'
                    : 'text-brame-dark hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-white/10',
                date === today &&
                  !selected &&
                  'ring-1 ring-brame-teal/60 dark:ring-brame-turquoise/60',
                disabled &&
                  'cursor-not-allowed opacity-30 hover:bg-transparent dark:hover:bg-transparent',
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
