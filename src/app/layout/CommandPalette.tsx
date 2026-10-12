import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Building2, CornerDownLeft, FolderKanban, Search, type LucideIcon } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { matchesQuery } from '@/lib/text';
import { Dialog, DialogContent } from '@/components/ui';
import { hasAccess, useSession } from '@/features/session';
import { CampaignStatusPill, useScopedCampaigns } from '@/features/campaigns';
import { useCompanies } from '@/features/clients';
import { NAV_SECTIONS } from '../navigation';

/** Per group, so one broad query can't bury the other groups. */
const MAX_PER_GROUP = 6;

interface Result {
  id: string;
  to: string;
  label: string;
  icon: LucideIcon;
  meta?: ReactNode;
}

interface Group {
  label: string;
  results: Result[];
}

/**
 * Jump anywhere by name: pages, campaigns and (internal seats) clients.
 * Built on the same access rules and tenant scope as the sidebar and the
 * list pages, so it can never surface something the seat couldn't open.
 */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <PaletteBody onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const session = useSession();
  const navigate = useNavigate();
  const { campaigns } = useScopedCampaigns();
  const { data: companies = [] } = useCompanies();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const groups = useMemo<Group[]>(() => {
    const q = query.trim();
    const pages: Result[] = NAV_SECTIONS.filter((s) => hasAccess(session, s.access))
      .flatMap((s) => s.items.map((item) => ({ ...item, section: t(s.labelKey) })))
      .filter((item) => matchesQuery(q, t(item.labelKey), item.section))
      .map((item) => ({ id: `page:${item.to}`, to: item.to, label: t(item.labelKey), icon: item.icon, meta: item.section }));

    // Records only once there's something to match — an empty palette
    // listing arbitrary campaigns would just be noise.
    const campaignResults: Result[] = q
      ? campaigns
          .filter((c) => matchesQuery(q, c.name, c.companyName))
          .slice(0, MAX_PER_GROUP)
          .map((c) => ({
            id: `campaign:${c.id}`,
            to: paths.campaign(c.id),
            label: c.name,
            icon: FolderKanban,
            meta: (
              <span className="flex items-center gap-2">
                {session.isInternal && <span className="truncate">{c.companyName}</span>}
                <CampaignStatusPill status={c.status} />
              </span>
            ),
          }))
      : [];

    const clientResults: Result[] =
      q && session.isInternal
        ? companies
            .filter((c) => matchesQuery(q, c.name))
            .slice(0, MAX_PER_GROUP)
            .map((c) => ({ id: `client:${c.id}`, to: paths.client(c.id), label: c.name, icon: Building2 }))
        : [];

    return [
      { label: t('search.groupPages'), results: pages.slice(0, q ? MAX_PER_GROUP : undefined) },
      { label: t('search.groupCampaigns'), results: campaignResults },
      { label: t('search.groupClients'), results: clientResults },
    ].filter((g) => g.results.length > 0);
  }, [query, session, campaigns, companies, t]);

  const flat = groups.flatMap((g) => g.results);
  const activeIndex = Math.min(active, Math.max(flat.length - 1, 0));
  const optionId = (i: number) => `${listId}-${i}`;

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    listRef.current?.querySelector(`#${CSS.escape(optionId(activeIndex))}`)?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const go = (result: Result | undefined) => {
    if (!result) return;
    onClose();
    navigate(result.to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((activeIndex + 1) % Math.max(flat.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((activeIndex - 1 + flat.length) % Math.max(flat.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(flat[activeIndex]);
    }
  };

  let index = -1;
  return (
    <DialogContent className="top-[12vh] max-w-lg translate-y-0 p-0">
      <DialogPrimitive.Title className="sr-only">{t('search.title')}</DialogPrimitive.Title>
      <DialogPrimitive.Description className="sr-only">{t('search.hint')}</DialogPrimitive.Description>

      <div className="flex items-center gap-2.5 border-b border-gray-200 py-3 pl-4 pr-12 dark:border-white/10">
        <Search size={16} className="flex-shrink-0 text-gray-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={t('search.placeholder')}
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={flat.length ? optionId(activeIndex) : undefined}
          aria-autocomplete="list"
          className="min-w-0 flex-1 bg-transparent text-sm text-brame-dark outline-none placeholder:text-gray-400 dark:text-gray-100"
        />
      </div>

      <div ref={listRef} id={listId} role="listbox" aria-label={t('search.title')} className="max-h-[50vh] overflow-y-auto p-2">
        {groups.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('search.noResults', { q: query.trim() })}
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label} role="group" aria-label={group.label} className="mb-1 last:mb-0">
              <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {group.label}
              </div>
              {group.results.map((r) => {
                index += 1;
                const i = index;
                const selected = i === activeIndex;
                const Icon = r.icon;
                return (
                  <div
                    key={r.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={selected}
                    onMouseMove={() => setActive(i)}
                    onClick={() => go(r)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm',
                      selected
                        ? 'bg-brame-teal/10 text-brame-teal dark:bg-white/10 dark:text-white'
                        : 'text-brame-dark dark:text-gray-200'
                    )}
                  >
                    <Icon size={16} className="flex-shrink-0 opacity-70" />
                    <span className="min-w-0 flex-1 truncate font-medium">{r.label}</span>
                    {r.meta && (
                      <span className="flex min-w-0 flex-shrink items-center text-xs text-gray-400 dark:text-gray-500">
                        {r.meta}
                      </span>
                    )}
                    {selected && <CornerDownLeft size={13} className="flex-shrink-0 opacity-60" />}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="hidden border-t border-gray-200 px-4 py-2 text-[11px] text-gray-400 dark:border-white/10 dark:text-gray-500 sm:block">
        {t('search.hint')}
      </div>
    </DialogContent>
  );
}
