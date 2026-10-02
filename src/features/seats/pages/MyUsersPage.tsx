import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingState } from '@/components/feedback';
import { Page, PageHeader } from '@/components/page';
import { NoSeatState } from '../components/NoSeatState';
import { SeatMembersPanel } from '../components/SeatMembersPanel';
import { useCurrentSeat } from '../hooks/useCurrentSeat';

/**
 * The "light" version of the Seats page — a seat's own admin managing just
 * their own seat's members, with no list of every other seat and no
 * create-seat flow. Available to any seat category, not just Admin/Brame.
 */
export function MyUsersPage() {
  const { t } = useI18n();
  usePageTitle(t('seats.myUsersTitle'));
  const { seat, isLoading } = useCurrentSeat();

  if (isLoading) return <LoadingState />;

  return (
    <Page>
      <PageHeader title={t('seats.myUsersTitle')} subtitle={t('seats.myUsersSubtitle')} />
      {seat ? <SeatMembersPanel seat={seat} canManage /> : <NoSeatState />}
    </Page>
  );
}
