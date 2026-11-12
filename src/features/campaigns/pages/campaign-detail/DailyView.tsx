import { useMemo } from 'react';
import { useI18n } from '@/i18n';
import { Card } from '@/components/ui';
import { useSession } from '@/features/session';
import { slugify } from '@/lib/text';
import type { Campaign, SourceKey } from '@/types';
import { DailyTrendCard } from '../../components/DailyTrendCard';
import { DailyMetricsTable } from '../../components/DailyMetricsTable';
import { buildDailyRows, totalDailyRow } from '../../lib/dailyMetrics';
import { deviceSplit } from '../../lib/devices';
import { sourceMeta } from '../../lib/sources';

/** The Daily tab: one source's day-by-day numbers, exportable. Per source on
 *  purpose — days from different sources are never added or mixed. */
export function DailyView({ campaign, source }: { campaign: Campaign; source: SourceKey }) {
  const { t } = useI18n();
  const { isInternal } = useSession();
  const meta = sourceMeta(campaign, source);
  const series = campaign.sources[source];
  const share = useMemo(() => deviceSplit(campaign)?.mobile, [campaign]);
  const rows = useMemo(
    () => buildDailyRows(series?.daily ?? [], meta.measures, share),
    [series, meta.measures, share],
  );
  const total = useMemo(
    () => totalDailyRow(series?.daily ?? [], meta.measures, share),
    [series, meta.measures, share],
  );
  const sourceLabel = t(`connectors.source.${meta.key}`);

  return (
    <div className="space-y-5">
      <DailyTrendCard rows={rows} />
      <Card>
        <DailyMetricsTable
          title={t('daily.title')}
          hint={
            isInternal
              ? t('daily.hint', { count: rows.length, source: sourceLabel })
              : t('daily.hintClient', { count: rows.length })
          }
          rows={rows}
          total={total}
          sourceLabel={sourceLabel}
          fileName={`${slugify(campaign.name)}-daily-${meta.key}`}
        />
      </Card>
    </div>
  );
}
