import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePagination } from '@/hooks/usePagination';
import { matchesQuery } from '@/lib/text';
import { Button, Card, CardFooter, Tabs } from '@/components/ui';
import { EmptyText, LoadingState } from '@/components/feedback';
import { Page, PageHeader, SearchInput } from '@/components/page';
import { Pagination } from '@/components/table';
import { ListItemButton } from '@/components/display';
import type { Seat, SeatCategory } from '@/types';
import { useSeatMembers, useSeats } from '@/api/hooks/useSeats';
import { CreateSeatModal } from '../components/CreateSeatModal';
import { SeatMembersPanel } from '../components/SeatMembersPanel';
import { SEAT_CATEGORIES, SEAT_CATEGORY_ICON } from '../lib/seatCategory';

const PAGE_SIZE = 10;

const countBy = <T,>(items: T[], key: (item: T) => string) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(key(item), (map.get(key(item)) ?? 0) + 1);
  return map;
};

/**
 * Every seat in the system — the Admin/Brame singletons, one per agency, one
 * per client — with a "Create seat" flow for new agencies/clients. Admin-seat
 * only; every other seat gets the lighter, own-seat-only view at /users
 * instead (MyUsersPage), which reuses the same SeatMembersPanel.
 *
 * Category tabs plus per-tab search/pagination, rather than one long list —
 * a portfolio with 100 clients and a dozen agencies would otherwise turn the
 * list into an unbrowsable wall of rows. Member counts come from a single
 * unscoped fetch (one request, a Map lookup per row) instead of one query
 * per seat, which is the part that would actually fall over at that scale.
 */
export function SeatsPage() {
  const { t } = useI18n();
  usePageTitle(t('seats.title'));
  const [params, setParams] = useSearchParams();
  const { data: seats, isLoading } = useSeats();
  const { data: allMembers = [] } = useSeatMembers();
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');

  // Both fall back to the deep-linked seat (e.g. from a client's Users tile)
  // reactively rather than in the useState initializer — `seats` is still
  // loading on the very first render, so a null-only initializer would
  // permanently miss the link once the data actually arrives.
  const linkedSeat = seats?.find((s) => s.id === params.get('seat'));
  const [activeCategory, setActiveCategory] = useState<SeatCategory | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const category = activeCategory ?? linkedSeat?.category ?? 'client';

  const memberCountBySeat = useMemo(() => countBy(allMembers, (m) => m.seatId), [allMembers]);
  const countByCategory = useMemo(() => countBy(seats ?? [], (s) => s.category), [seats]);

  const filtered = useMemo(
    () => (seats ?? []).filter((s) => s.category === category && matchesQuery(q, s.name)),
    [seats, category, q]
  );
  const { paged, pagination } = usePagination(filtered, PAGE_SIZE, [q, category]);

  const selected = seats?.find((s) => s.id === (selectedId ?? linkedSeat?.id)) ?? paged[0];

  const selectSeat = (seat: Seat) => {
    setSelectedId(seat.id);
    setParams({ seat: seat.id }, { replace: true });
  };

  const changeCategory = (next: SeatCategory) => {
    setActiveCategory(next);
    setQ('');
    setSelectedId(undefined);
    setParams({}, { replace: true });
  };

  if (isLoading || !seats) return <LoadingState />;

  return (
    <Page>
      <PageHeader
        title={t('seats.title')}
        subtitle={t('seats.subtitle')}
        actions={
          <Button variant="primary" icon={<Plus size={14} />} onClick={() => setCreating(true)}>
            {t('seats.create.action')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        <Card padded={false}>
          <div className="space-y-3 border-b border-gray-200 p-3 dark:border-white/10">
            <Tabs
              columns={2}
              value={category}
              onChange={changeCategory}
              options={SEAT_CATEGORIES.map((c) => ({
                value: c,
                label: `${t(`seats.category.${c}`)} (${countByCategory.get(c) ?? 0})`,
              }))}
            />
            <SearchInput value={q} onChange={setQ} placeholder={t('seats.search')} />
          </div>
          <div className="min-h-[20rem]">
            {paged.map((seat) => {
              const Icon = SEAT_CATEGORY_ICON[seat.category];
              return (
                <ListItemButton
                  key={seat.id}
                  active={seat.id === selected?.id}
                  onClick={() => selectSeat(seat)}
                  icon={<Icon size={15} />}
                  title={seat.name}
                  subtitle={t('seats.memberCount', { count: memberCountBySeat.get(seat.id) ?? 0 })}
                />
              );
            })}
            {filtered.length === 0 && <EmptyText className="px-4 py-8">{t('seats.noMatches')}</EmptyText>}
          </div>
          {filtered.length > 0 && (
            <CardFooter className="p-3">
              <Pagination {...pagination} />
            </CardFooter>
          )}
        </Card>

        {selected && <SeatMembersPanel key={selected.id} seat={selected} canManage />}
      </div>

      <CreateSeatModal
        open={creating}
        onOpenChange={setCreating}
        onCreated={(seatId) => {
          const seat = seats.find((s) => s.id === seatId);
          if (seat) {
            setActiveCategory(seat.category);
            setQ('');
          }
          setSelectedId(seatId);
          setParams({ seat: seatId }, { replace: true });
        }}
      />
    </Page>
  );
}
