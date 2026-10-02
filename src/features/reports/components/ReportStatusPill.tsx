import { useI18n } from '@/i18n';
import { Pill } from '@/components/ui';

/** Whether a report sends on its schedule or is paused. */
export function ReportStatusPill({ enabled }: { enabled: boolean }) {
  const { t } = useI18n();
  return <Pill tone={enabled ? 'green' : 'neutral'}>{enabled ? t('reports.active') : t('reports.paused')}</Pill>;
}

