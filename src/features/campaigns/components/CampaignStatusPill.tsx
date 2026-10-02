import { useI18n } from '@/i18n';
import { Pill, type PillTone } from '@/components/ui';
import type { CampaignStatus } from '@/types';

const STATUS_TONE: Record<CampaignStatus, PillTone> = {
  live: 'green',
  scheduled: 'neutral',
  ended: 'neutral',
  archived: 'neutral',
};

export function CampaignStatusPill({ status }: { status: CampaignStatus }) {
  const { t } = useI18n();
  return <Pill tone={STATUS_TONE[status]}>{t(`status.${status}`)}</Pill>;
}
