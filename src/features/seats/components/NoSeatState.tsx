import { UserX } from 'lucide-react';
import { useI18n } from '@/i18n';
import { EmptyState } from '@/components/feedback';

/** Shown on a seat-admin page when the agency/client has no seat yet. */
export function NoSeatState() {
  const { t } = useI18n();
  return <EmptyState icon={<UserX size={32} />} title={t('seats.noSeatYetTitle')} body={t('seats.noSeatYetBody')} />;
}
