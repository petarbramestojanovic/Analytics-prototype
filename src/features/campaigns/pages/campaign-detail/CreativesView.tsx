import { useMemo, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { useI18n } from '@/i18n';
import { EMPTY_VALUE, fmtInt, fmtPct } from '@/lib/format';
import { slugify } from '@/lib/text';
import { Card, ProgressBar, Tabs } from '@/components/ui';
import { EmptyState } from '@/components/feedback';
import { SectionTitle } from '@/components/page';
import { Table, Td, Th } from '@/components/table';
import { StatTile } from '@/components/display';
import type { Campaign, CreativeRow, SourceKey } from '@/types';
import { DailyTrendCard } from '../../components/DailyTrendCard';
import { DailyMetricsTable } from '../../components/DailyMetricsTable';
import { buildDailyRows, totalDailyRow, type DailyRow } from '../../lib/dailyMetrics';
import { sourceMeta } from '../../lib/sources';

/** `overview`, or the id of the creative whose tab is open. */
type CreativeTab = string;

const pct = (v: number | null, d = 1) => (v == null ? EMPTY_VALUE : fmtPct(v, d));

/** The Creatives tab. Overview compares every creative over the whole flight;
 *  each creative then has its own tab with its day-by-day metrics. */
export function CreativesView({ campaign, source }: { campaign: Campaign; source: SourceKey }) {
  const { t } = useI18n();
  const meta = sourceMeta(campaign, source);
  const [tab, setTab] = useState<CreativeTab>('overview');

  const totals = useMemo(
    () => new Map(campaign.creatives.map((c) => [c.id, totalDailyRow(c.daily, meta.measures)])),
    [campaign.creatives, meta.measures]
  );
  const flightImpressions = campaign.creatives.reduce((a, c) => a + c.impressions, 0);

  if (!flightImpressions) {
    return (
      <EmptyState
        icon={<ImageOff size={32} />}
        title={t('creatives.emptyTitle')}
        body={t('creatives.emptyBody')}
      />
    );
  }

  const selected = campaign.creatives.find((c) => c.id === tab);

  return (
    <div className="space-y-5">
      <Tabs
        onPage
        value={tab}
        onChange={setTab}
        groupLabel={t('creatives.title')}
        options={[
          { value: 'overview', label: t('creatives.tab.overview') },
          ...campaign.creatives.map((c) => ({ value: c.id, label: `${c.format} · ${c.mechanic}` })),
        ]}
      />
      {selected ? (
        <CreativeDetail campaign={campaign} creative={selected} total={totals.get(selected.id) ?? null} source={source} />
      ) : (
        <CreativesOverview campaign={campaign} totals={totals} flightImpressions={flightImpressions} onOpen={setTab} />
      )}
    </div>
  );
}

function CreativesOverview({
  campaign,
  totals,
  flightImpressions,
  onOpen,
}: {
  campaign: Campaign;
  totals: Map<string, DailyRow | null>;
  flightImpressions: number;
  onOpen: (id: string) => void;
}) {
  const { t } = useI18n();
  const hasConversions = [...totals.values()].some((r) => r?.conversions != null);
  return (
    <Card>
      <SectionTitle hint={t('creatives.overviewHint')}>{t('creatives.title')}</SectionTitle>
      <Table>
        <thead>
          <tr>
            <Th>{t('detail.col.creative')}</Th>
            <Th align="right">{t('daily.col.impressions')}</Th>
            <Th>{t('creatives.col.share')}</Th>
            <Th align="right">{t('daily.col.engagementRate')}</Th>
            <Th align="right">{t('daily.col.ctr')}</Th>
            <Th align="right">{t('daily.col.viewability')}</Th>
            <Th align="right">{t('daily.col.clicks')}</Th>
            {hasConversions && <Th align="right">{t('daily.col.conversions')}</Th>}
          </tr>
        </thead>
        <tbody>
          {campaign.creatives.map((c) => {
            const row = totals.get(c.id);
            const share = flightImpressions ? c.impressions / flightImpressions : 0;
            return (
              <tr key={c.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                <Td>
                  <button
                    type="button"
                    onClick={() => onOpen(c.id)}
                    className="text-left font-medium text-brame-teal hover:underline dark:text-brame-turquoise-light"
                  >
                    {c.format}
                  </button>
                  <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{c.name}</div>
                </Td>
                <Td align="right">{fmtInt(c.impressions)}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={share} size="sm" className="w-20" />
                    <span className="tnum text-xs text-gray-500 dark:text-gray-400">{fmtPct(share, 0)}</span>
                  </div>
                </Td>
                <Td align="right">{pct(row?.engagementRate ?? null)}</Td>
                <Td align="right">{pct(row?.ctr ?? null, 2)}</Td>
                <Td align="right">{pct(row?.viewability ?? null)}</Td>
                <Td align="right">{row?.clicks == null ? EMPTY_VALUE : fmtInt(row.clicks)}</Td>
                {hasConversions && (
                  <Td align="right">{row?.conversions == null ? EMPTY_VALUE : fmtInt(row.conversions)}</Td>
                )}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}

function CreativeDetail({
  campaign,
  creative,
  total,
  source,
}: {
  campaign: Campaign;
  creative: CreativeRow;
  total: DailyRow | null;
  source: SourceKey;
}) {
  const { t } = useI18n();
  const meta = sourceMeta(campaign, source);
  const rows = useMemo(() => buildDailyRows(creative.daily, meta.measures), [creative.daily, meta.measures]);
  const sourceLabel = t(`connectors.source.${meta.key}`);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile compact label={t('daily.col.impressions')} value={fmtInt(creative.impressions)} />
        <StatTile compact label={t('daily.col.engagementRate')} value={pct(total?.engagementRate ?? null)} />
        <StatTile compact label={t('daily.col.ctr')} value={pct(total?.ctr ?? null, 2)} />
        <StatTile compact label={t('daily.col.viewability')} value={pct(total?.viewability ?? null)} />
        {total?.conversions != null && (
          <StatTile compact label={t('daily.col.conversions')} value={fmtInt(total.conversions)} />
        )}
      </div>

      <DailyTrendCard rows={rows} title={t('creatives.chartTitle', { name: creative.format })} />

      <Card>
        <DailyMetricsTable
          title={t('creatives.detailTitle', { name: creative.format })}
          hint={t('creatives.detailHint', { name: creative.name, source: sourceLabel })}
          rows={rows}
          total={total}
          sourceLabel={sourceLabel}
          fileName={`${slugify(campaign.name)}-${slugify(creative.format)}-daily-${meta.key}`}
        />
      </Card>
    </div>
  );
}
