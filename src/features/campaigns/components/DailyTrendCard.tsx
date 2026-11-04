import { useMemo } from 'react';
import { useI18n } from '@/i18n';
import { Card } from '@/components/ui';
import type { TrendMetric } from '../lib/trend';
import { dailyRowsToTrend, type DailyRow } from '../lib/dailyMetrics';
import { TrendChart } from './TrendChart';

// No delivery here: it's a running total against the booking, which a single
// day or creative doesn't have. Viewability is, unlike the other charts, on.
const DAILY_METRICS: readonly TrendMetric[] = ['impressions', 'engagementRate', 'ctr', 'viewability'];

/** The daily chart that sits above a Daily metrics table — fed the table's
 *  own rows, so the two always agree. */
export function DailyTrendCard({ rows, title }: { rows: DailyRow[]; title?: string }) {
  const { t } = useI18n();
  const data = useMemo(() => dailyRowsToTrend(rows), [rows]);
  return (
    <Card>
      <TrendChart
        title={title ?? t('daily.chartTitle')}
        hint={t('daily.chartHint')}
        daily={data}
        defaultMetrics={['impressions', 'viewability']}
        availableMetrics={DAILY_METRICS}
      />
    </Card>
  );
}
