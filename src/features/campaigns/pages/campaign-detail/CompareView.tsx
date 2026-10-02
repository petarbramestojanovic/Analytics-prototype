import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { Unplug } from 'lucide-react';
import { useFormatters, useI18n } from '@/i18n';
import { fmtCompact, fmtMetric } from '@/lib/format';
import { CHART_COLORS, tooltipInt, useAxisStyle } from '@/components/charts';
import { Callout, Card, Pill } from '@/components/ui';
import { EmptyState, EmptyText } from '@/components/feedback';
import { FieldLabel } from '@/components/form';
import { FilterSelect, SectionTitle } from '@/components/page';
import { Table, TableEmptyRow, Td, Th } from '@/components/table';
import { DeltaValue } from '@/components/display';
import { useAlertThresholds } from '@/features/alerts';
import type { Campaign, SourceKey } from '@/types';
import { compareSources } from '../../lib/divergence';
import { connectedSources, sourceMeta } from '../../lib/sources';

/**
 * Compare — "our count vs the adserver's count", the question account
 * managers field today. Two sources side by side, never summed.
 */
export function CompareView({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const thresholds = useAlertThresholds();
  const available = connectedSources(campaign);
  const [left, setLeft] = useState<SourceKey>(campaign.primarySource);
  // Default to "our count vs the adserver's count" — the question the RFC says
  // account managers field today. Fall back to any other reporting source.
  const [right, setRight] = useState<SourceKey>(
    (campaign.primarySource !== 'custom' && campaign.sources.custom ? 'custom' : undefined) ??
      available.find((s) => s !== campaign.primarySource) ??
      available[0]
  );

  if (available.length < 2) {
    return <EmptyState icon={<Unplug size={32} />} title={t('detail.compareNothingTitle')} body={t('detail.compareNothingBody')} />;
  }

  const lMeta = sourceMeta(campaign, left);
  const rMeta = sourceMeta(campaign, right);

  // Only metrics both platforms actually measure can be compared. Tone/read
  // come from the same thresholds (and the same function) the portfolio-wide
  // Alerts page uses, so a campaign never reads "in line" in one place and
  // "investigate" in the other.
  const rows = compareSources(campaign, left, right, thresholds);
  const pickerOptions = available.map((s) => ({ value: s, label: sourceMeta(campaign, s).fullLabel }));

  return (
    <div className="space-y-5">
      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <FieldLabel variant="caps">{t('detail.baseline')}</FieldLabel>
            <FilterSelect value={left} onChange={(v) => setLeft(v as SourceKey)} options={pickerOptions} />
          </div>
          <div className="pb-2 text-gray-300 dark:text-gray-600">{t('detail.vs')}</div>
          <div>
            <FieldLabel variant="caps">{t('detail.checkAgainst')}</FieldLabel>
            <FilterSelect value={right} onChange={(v) => setRight(v as SourceKey)} options={pickerOptions} />
          </div>
        </div>

        {left === right ? (
          <EmptyText className="py-6">{t('detail.pickTwoDifferent')}</EmptyText>
        ) : (
          <>
            {lMeta.cadence !== rMeta.cadence && (
              <Callout tone="warning" className="mb-4">
                {t('detail.cadenceGapWarning', {
                  a: lMeta.cadence === 'live' ? lMeta.label : rMeta.label,
                  b: lMeta.cadence === 'nightly' ? lMeta.label : rMeta.label,
                })}
              </Callout>
            )}

            <Table>
              <thead>
                <tr>
                  <Th>{t('detail.col.metric')}</Th>
                  <Th align="right">{lMeta.label}</Th>
                  <Th align="right">{rMeta.label}</Th>
                  <Th align="right">{t('detail.col.difference')}</Th>
                  <Th>{t('detail.col.read')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.metric}>
                    <Td className="font-medium">{t(`metric.${row.metric}.label`)}</Td>
                    <Td align="right">{fmtMetric(row.metric, row.baselineValue)}</Td>
                    <Td align="right">{fmtMetric(row.metric, row.checkValue)}</Td>
                    <Td align="right">
                      <DeltaValue delta={row.delta} severity={row.read} />
                    </Td>
                    <Td>
                      <Pill tone={row.tone}>{t(`detail.read.${row.read}`)}</Pill>
                    </Td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <TableEmptyRow colSpan={5}>{t('detail.noSharedMetrics', { a: lMeta.label, b: rMeta.label })}</TableEmptyRow>
                )}
              </tbody>
            </Table>

            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              {t('detail.sharedMetricsFootnote', { count: rows.length })}
            </p>
          </>
        )}
      </Card>

      {left !== right && <DailyOverlayCard campaign={campaign} left={left} right={right} />}
    </div>
  );
}

/** Both sources' daily impressions on one chart. */
function DailyOverlayCard({ campaign, left, right }: { campaign: Campaign; left: SourceKey; right: SourceKey }) {
  const { t } = useI18n();
  const { fmtDate, fmtDateLong } = useFormatters();
  const { axis, grid, tooltipStyle } = useAxisStyle();
  const lSeries = campaign.sources[left];
  const rSeries = campaign.sources[right];

  const data = useMemo(() => {
    const byDate = new Map<string, { date: string; left?: number; right?: number }>();
    for (const d of lSeries?.daily ?? []) byDate.set(d.date, { date: d.date, left: d.impressions });
    for (const d of rSeries?.daily ?? []) byDate.set(d.date, { ...(byDate.get(d.date) ?? { date: d.date }), right: d.impressions });
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [lSeries, rSeries]);

  return (
    <Card>
      <SectionTitle hint={t('detail.dailyOverlayHint')}>{t('detail.dailyOverlayTitle')}</SectionTitle>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={axis} tickLine={false} />
            <YAxis tickFormatter={fmtCompact} tick={axis} tickLine={false} axisLine={false} />
            <RTooltip formatter={tooltipInt} labelFormatter={(l) => fmtDateLong(String(l))} contentStyle={tooltipStyle} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="left" name={sourceMeta(campaign, left).label} stroke={CHART_COLORS.teal} strokeWidth={2} dot={false} />
            <Line
              type="monotone"
              dataKey="right"
              name={sourceMeta(campaign, right).label}
              stroke={CHART_COLORS.purple}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{t('detail.dailyOverlayFootnote')}</p>
    </Card>
  );
}
