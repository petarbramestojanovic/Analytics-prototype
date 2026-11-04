import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { clearRecentPages } from '@/lib/recentPages';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, IconButton } from '@/components/ui';
import { useRecentEntries } from './useRecentEntries';
import { useRecentScope } from './useRecentScope';

const MAX_SHOWN = 8;

/** The clock next to the search box: the last pages and records you opened,
 *  one click away. Kept apart from search so it doesn't crowd it. */
export function RecentMenu() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const scope = useRecentScope();
  const [open, setOpen] = useState(false);
  const entries = useRecentEntries(MAX_SHOWN, open);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <IconButton label={t('recent.title')} icon={<History size={14} />} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t('recent.title')}
        </div>
        {entries.length === 0 ? (
          <p className="w-64 px-2.5 py-3 text-sm text-gray-500 dark:text-gray-400">{t('recent.empty')}</p>
        ) : (
          entries.map((entry) => {
            const Icon = entry.icon;
            return (
              <DropdownMenuItem key={entry.path} onSelect={() => navigate(entry.path)}>
                <Icon size={14} className="flex-shrink-0 opacity-70" />
                <span className="max-w-56 truncate font-medium">{entry.title}</span>
                {entry.kind && <span className="ml-auto flex-shrink-0 pl-4 text-xs text-gray-400 dark:text-gray-500">{entry.kind}</span>}
              </DropdownMenuItem>
            );
          })
        )}
        {entries.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => clearRecentPages(scope)}>
              <Trash2 size={13} />
              {t('recent.clear')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
