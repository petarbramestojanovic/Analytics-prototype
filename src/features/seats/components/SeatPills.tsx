import { Clock } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Pill } from '@/components/ui';
import type { InviteStatus, SeatCategory, SeatRole } from '@/types';
import { SEAT_CATEGORY_TONE } from '../lib/seatCategory';

export function SeatCategoryPill({ category }: { category: SeatCategory }) {
  const { t } = useI18n();
  return <Pill tone={SEAT_CATEGORY_TONE[category]}>{t(`seats.category.${category}`)}</Pill>;
}

export function SeatRolePill({ role }: { role: SeatRole }) {
  const { t } = useI18n();
  return <Pill tone={role === 'admin' ? 'purple' : 'neutral'}>{t(`companies.role.${role}`)}</Pill>;
}

export function InviteStatusPill({ status }: { status: InviteStatus }) {
  const { t } = useI18n();
  return status === 'pending' ? (
    <Pill tone="amber" icon={<Clock size={10} />}>
      {t('seats.status.pending')}
    </Pill>
  ) : (
    <Pill tone="green">{t('seats.status.accepted')}</Pill>
  );
}
