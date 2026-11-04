import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCheck, InboxIcon } from 'lucide-react';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSearchParamState } from '@/hooks/useSearchParamState';
import { Button, Card, Tabs } from '@/components/ui';
import { EmptyText, PageSkeleton } from '@/components/feedback';
import { FilterSelect, Page, PageHeader } from '@/components/page';
import type { InboxKind } from '@/types';
import { InboxDetail } from '../components/InboxDetail';
import { InboxList } from '../components/InboxList';
import { useInbox } from '../inboxContext';

const VIEWS = ['inbox', 'unread', 'archived'] as const;
type View = (typeof VIEWS)[number];
const KINDS: readonly InboxKind[] = ['alert', 'report', 'invitation'];

/**
 * A person's inbox, Linear-style: a list on the left, the selected item on the
 * right. Triggered alerts, finished reports and accepted invitations land here
 * instead of in a mailbox. j/k (or the arrows) move through the list, e
 * archives, u marks unread.
 */
export function InboxPage() {
  const { t } = useI18n();
  usePageTitle(t('inbox.title'));
  const { entries, unreadCount, isLoading, setRead, setArchived, markAllRead } = useInbox();
  const [, setParams] = useSearchParams();
  const [viewParam] = useSearchParamState('view', 'inbox');
  const [typeFilter, setTypeFilter] = useSearchParamState('type', 'all');
  const [selectedId, setSelectedId] = useSearchParamState('item');
  const view: View = (VIEWS as readonly string[]).includes(viewParam) ? (viewParam as View) : 'inbox';

  const visible = useMemo(
    () =>
      entries.filter(
        (e) =>
          (view === 'archived' ? e.archived : !e.archived && (view === 'inbox' || !e.read)) &&
          (typeFilter === 'all' || e.kind === typeFilter)
      ),
    [entries, view, typeFilter]
  );
  const selected = visible.find((e) => e.id === selectedId) ?? null;

  // The view and the open item live in one query string, so they are changed in
  // one go: two separate updates in the same click would overwrite each other
  // and the tab would never switch.
  const switchView = (next: View) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        if (next === 'inbox') out.delete('view');
        else out.set('view', next);
        out.delete('item');
        return out;
      },
      { replace: true },
    );

  const select = (id: string | null) => {
    setSelectedId(id ?? '');
    if (id) setRead(id, true);
  };

  // Keyboard, as in Linear. Ignored while typing and when a modifier is held.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || target?.closest('input, textarea, select, [contenteditable]')) return;
      const index = visible.findIndex((v) => v.id === selectedId);
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = visible[Math.min(index + 1, visible.length - 1)];
        if (next) select(next.id);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = visible[Math.max(index - 1, 0)];
        if (prev) select(prev.id);
      } else if (e.key === 'e' && selected) {
        // Archiving moves to the item that takes its place, so triage keeps flowing.
        setArchived(selected.id, !selected.archived);
        const neighbour = visible[index + 1] ?? visible[index - 1];
        select(neighbour?.id ?? null);
      } else if (e.key === 'u' && selected) {
        setRead(selected.id, selected.read);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (isLoading) return <PageSkeleton variant="list" />;

  const unreadLabel = (
    <span className="whitespace-nowrap">
      {t('inbox.view.unread')}
      {unreadCount > 0 && ` · ${unreadCount}`}
    </span>
  );

  return (
    <Page>
      <PageHeader
        title={t('inbox.title')}
        subtitle={t('inbox.subtitle')}
        actions={
          <Button icon={<CheckCheck size={13} />} onClick={markAllRead} disabled={unreadCount === 0}>
            {t('inbox.markAllRead')}
          </Button>
        }
      />

      <Card padded={false} className="overflow-hidden lg:h-[calc(100dvh-12rem)] lg:min-h-[26rem]">
        <div className="grid h-full grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(24rem,28rem)_minmax(0,1fr)]">
          <div className={`flex min-h-0 flex-col border-gray-200 dark:border-white/10 lg:border-r ${selected ? 'hidden lg:flex' : 'flex'}`}>
            <div className="flex items-center gap-2 border-b border-gray-200 p-3 dark:border-white/10">
              <Tabs
                size="sm"
                className="shrink-0"
                value={view}
                onChange={switchView}
                groupLabel={t('inbox.title')}
                options={[
                  { value: 'inbox', label: t('inbox.view.inbox') },
                  { value: 'unread', label: unreadLabel },
                  { value: 'archived', label: t('inbox.view.archived') },
                ]}
              />
              <FilterSelect
                className="min-w-0 flex-1"
                triggerClassName="h-9"
                value={typeFilter}
                onChange={setTypeFilter}
                allLabel={t('inbox.filter.all')}
                options={KINDS.map((k) => ({ value: k, label: t(`inbox.filter.${k}`) }))}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {visible.length === 0 ? (
                <EmptyText className="py-16">
                  <InboxIcon size={28} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  {t(view === 'archived' ? 'inbox.emptyArchived' : 'inbox.empty')}
                </EmptyText>
              ) : (
                <InboxList entries={visible} selectedId={selectedId || null} onSelect={select} />
              )}
            </div>
            <p className="hidden border-t border-gray-200 px-4 py-2 text-[11px] text-gray-400 dark:border-white/10 dark:text-gray-500 lg:block">
              {t('inbox.shortcuts')}
            </p>
          </div>

          <div className={`min-h-0 ${selected ? 'block' : 'hidden lg:block'}`}>
            {selected ? (
              <InboxDetail
                key={selected.id}
                entry={selected}
                onBack={() => setSelectedId('')}
                onToggleRead={() => setRead(selected.id, !selected.read)}
                onToggleArchive={() => setArchived(selected.id, !selected.archived)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm text-gray-400 dark:text-gray-500">
                <InboxIcon size={32} className="mb-3 text-gray-300 dark:text-gray-600" />
                {t('inbox.selectPrompt')}
              </div>
            )}
          </div>
        </div>
      </Card>
    </Page>
  );
}
