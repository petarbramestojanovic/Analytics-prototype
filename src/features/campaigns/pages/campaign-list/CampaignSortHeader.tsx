import type { Table } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useI18n } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui';
import type { Campaign } from '@/types';
import { SORT_ONLY_COLUMNS } from './sortOnlyColumns';

/** The Campaign column's header: a menu that picks what the rows sort by —
 *  the name, or the status or category shown beneath it. Choosing the active
 *  field again flips ascending → descending → off. */
export function CampaignSortHeader({ table }: { table: Table<Campaign> }) {
  const { t } = useI18n();
  const current = table.getState().sorting[0];
  const active = SORT_ONLY_COLUMNS.find((id) => id === current?.id);
  const label = (id: (typeof SORT_ONLY_COLUMNS)[number]) =>
    t(id === 'name' ? 'campaigns.sort.name' : `campaigns.col.${id}`);
  const arrow = (id: (typeof SORT_ONLY_COLUMNS)[number]) =>
    active !== id ? null : current?.desc ? <ArrowDown size={11} /> : <ArrowUp size={11} />;
  const choose = (id: (typeof SORT_ONLY_COLUMNS)[number]) =>
    table.setSorting(
      active !== id ? [{ id, desc: false }] : current?.desc ? [] : [{ id, desc: true }],
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('campaigns.sort.by')}
          className="inline-flex items-center gap-1 rounded hover:text-brame-dark dark:hover:text-gray-200"
        >
          {t('campaigns.col.campaign')}
          {active && active !== 'name' && (
            <span className="font-normal normal-case text-gray-400 dark:text-gray-500">
              · {label(active)}
            </span>
          )}
          {active ? (
            current?.desc ? (
              <ArrowDown size={11} />
            ) : (
              <ArrowUp size={11} />
            )
          ) : (
            <ArrowUpDown size={11} className="text-gray-300 dark:text-gray-600" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <div className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {t('campaigns.sort.by')}
        </div>
        {SORT_ONLY_COLUMNS.map((id) => (
          <DropdownMenuItem key={id} onSelect={() => choose(id)}>
            <span className="flex-1">{label(id)}</span>
            {arrow(id)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
