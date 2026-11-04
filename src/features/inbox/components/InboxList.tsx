import { startOfDay, differenceInCalendarDays } from 'date-fns';
import { useFormatters, useI18n } from '@/i18n';
import { TODAY } from '@/lib/clock';
import { cn } from '@/lib/cn';
import type { InboxEntry } from '../types';
import { InboxKindIcon } from './inboxKind';

type Group = 'today' | 'yesterday' | 'week' | 'earlier';

function groupOf(createdAt: string): Group {
  const days = differenceInCalendarDays(startOfDay(TODAY), startOfDay(new Date(createdAt)));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return days <= 7 ? 'week' : 'earlier';
}

/** The left pane: items grouped by day, newest first, unread in bold with a
 *  dot. Purely presentational — selection and keyboard live in the page. */
export function InboxList({
  entries,
  selectedId,
  onSelect,
}: {
  entries: InboxEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const { relativeTime } = useFormatters();

  const groups: { group: Group; items: InboxEntry[] }[] = [];
  for (const entry of entries) {
    const group = groupOf(entry.createdAt);
    const last = groups[groups.length - 1];
    if (last?.group === group) last.items.push(entry);
    else groups.push({ group, items: [entry] });
  }

  return (
    <div role="listbox" aria-label={t('inbox.title')}>
      {groups.map(({ group, items }) => (
        <section key={group}>
          <h3 className="sticky top-0 z-10 bg-white/95 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 backdrop-blur dark:bg-brame-dark-light/95 dark:text-gray-500">
            {t(`inbox.group.${group}`)}
          </h3>
          {items.map((entry) => {
            const selected = entry.id === selectedId;
            return (
              <button
                key={entry.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(entry.id)}
                className={cn(
                  'flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left transition-colors outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-white/5',
                  selected
                    ? 'border-brame-teal bg-brame-teal/5 dark:border-brame-turquoise dark:bg-white/[0.07]'
                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5'
                )}
              >
                <span className="relative mt-0.5">
                  <InboxKindIcon kind={entry.kind} tone={entry.tone} />
                  {!entry.read && (
                    <span
                      aria-label={t('inbox.unread')}
                      className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-brame-teal ring-2 ring-white dark:bg-brame-turquoise dark:ring-brame-dark-light"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        'truncate text-sm',
                        entry.read
                          ? 'font-medium text-gray-600 dark:text-gray-300'
                          : 'font-semibold text-brame-dark dark:text-white'
                      )}
                    >
                      {entry.title}
                    </span>
                    <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">{relativeTime(entry.createdAt)}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{entry.summary}</span>
                </span>
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}
