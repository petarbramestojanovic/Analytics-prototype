import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Monitor, MousePointerClick, Timer } from 'lucide-react';
import { useI18n } from '@/i18n';
import { EMPTY_VALUE, fmtCompact, fmtInt, fmtPct } from '@/lib/format';
import { CHART_COLORS, tooltipIntOnly, useAxisStyle } from '@/components/charts';
import { Card, ProgressBar } from '@/components/ui';
import { SectionTitle } from '@/components/page';
import { Table, Td, Th } from '@/components/table';
import { isRowClick } from '@/components/table/isRowClick';
import type { Campaign } from '@/types';
import { deviceBuckets } from '../../lib/devices';

// The per-source detail cards under a campaign's headline metrics. Each is
// shown or hidden by SourceView depending on what the source measures.

/** How far players get through the unit, page by page. */
export function PageFlowCard({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const first = campaign.pages[0]?.views ?? 0;
  return (
    <Card>
      <SectionTitle hint={t('detail.pageFlowHint')}>{t('detail.pageFlowTitle')}</SectionTitle>
      <div className="space-y-2.5">
        {campaign.pages.map((p, i) => {
          const share = first ? p.views / first : 0;
          return (
            <div key={p.page}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="tnum w-4 text-xs text-gray-400 dark:text-gray-500">{i + 1}</span>
                  <span className="font-medium text-brame-dark dark:text-gray-100">{p.label}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <Timer size={11} />
                    {p.avgDwell}s
                  </span>
                </span>
                <span className="tnum text-gray-500 dark:text-gray-400">
                  {fmtInt(p.views)}
                  <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">
                    {fmtPct(share, 0)}
                  </span>
                </span>
              </div>
              <ProgressBar value={share} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function CtaCard({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  return (
    <Card>
      <SectionTitle hint={t('detail.ctaHint')}>{t('detail.ctaTitle')}</SectionTitle>
      <Table>
        <thead>
          <tr>
            <Th>{t('detail.col.cta')}</Th>
            <Th align="right">{t('detail.col.clicks')}</Th>
            <Th align="right">{t('detail.col.unique')}</Th>
            <Th align="right">{t('detail.col.ctr')}</Th>
          </tr>
        </thead>
        <tbody>
          {campaign.ctas.map((c) => (
            <tr key={c.id}>
              <Td>
                <div className="flex items-center gap-1.5 font-medium text-brame-dark dark:text-gray-100">
                  <MousePointerClick size={12} className="text-brame-teal" />
                  {c.label}
                </div>
                <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  {c.destination}
                </div>
              </Td>
              <Td align="right">{fmtInt(c.clicks)}</Td>
              <Td align="right">{fmtInt(c.uniqueClicks)}</Td>
              <Td align="right">{fmtPct(c.ctr, 2)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

export function DevicesCard({
  campaign,
  showEngagement,
}: {
  campaign: Campaign;
  showEngagement: boolean;
}) {
  const { t } = useI18n();
  const { axis, grid, cursorFill, tooltipStyle, animate } = useAxisStyle();
  // Two buckets, same as the Total/Mobile/Desktop tabs above: Tablet is part
  // of Mobile. The data keeps it separate, so it is shown as a sub-line.
  const buckets = deviceBuckets(campaign);
  return (
    <Card>
      <SectionTitle hint={t('detail.devicesHint')}>{t('detail.devicesTitle')}</SectionTitle>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} layout="vertical" barSize={26}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={fmtCompact}
              tick={axis}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="device"
              tick={axis}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <RTooltip
              cursor={{ fill: cursorFill }}
              formatter={tooltipIntOnly}
              contentStyle={tooltipStyle}
            />
            <Bar
              isAnimationActive={animate}
              dataKey="impressions"
              name={t('detail.legendImpressions')}
              fill={CHART_COLORS.teal}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 space-y-2">
        {buckets.map((d) => (
          <div key={d.device} className="text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Monitor size={11} />
                {t(`detail.device.${d.device}`)}
              </span>
              <span className="tnum text-gray-500 dark:text-gray-400">
                {fmtPct(d.viewability)} {t('detail.viewableSuffix')}
                {showEngagement && ` · ${fmtPct(d.engagementRate)} ${t('detail.engagedSuffix')}`}
              </span>
            </div>
            {d.tabletImpressions != null && d.tabletImpressions > 0 && (
              <div className="tnum mt-0.5 pl-[17px] text-[11px] text-gray-400 dark:text-gray-500">
                {t('detail.device.tabletIncluded', { value: fmtCompact(d.tabletImpressions) })}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function CreativesCard({
  campaign,
  showEngagement,
  showCtr,
  onOpenCreative,
}: {
  campaign: Campaign;
  showEngagement: boolean;
  showCtr: boolean;
  /** Jumps to that creative's own view in the Creatives tab. */
  onOpenCreative: (creativeId: string) => void;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <SectionTitle hint={t('detail.creativesHint')}>{t('detail.creativesTitle')}</SectionTitle>
      <Table>
        <thead>
          <tr>
            <Th>{t('detail.col.creative')}</Th>
            <Th align="right">{t('detail.col.impr')}</Th>
            {showEngagement && <Th align="right">{t('detail.col.eng')}</Th>}
            {showCtr && <Th align="right">{t('detail.col.ctr')}</Th>}
          </tr>
        </thead>
        <tbody>
          {campaign.creatives.map((cr) => (
            <tr
              key={cr.id}
              className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
              onClick={(e) => isRowClick(e) && onOpenCreative(cr.id)}
            >
              <Td>
                <button
                  type="button"
                  onClick={() => onOpenCreative(cr.id)}
                  className="text-left font-medium text-brame-teal hover:underline dark:text-brame-turquoise-light"
                >
                  {cr.format}
                </button>
                <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{cr.name}</div>
              </Td>
              <Td align="right">{fmtCompact(cr.impressions)}</Td>
              {showEngagement && <Td align="right">{fmtPct(cr.engagementRate)}</Td>}
              {showCtr && (
                <Td align="right">
                  {cr.impressions ? fmtPct(cr.ctaClicks / cr.impressions, 2) : EMPTY_VALUE}
                </Td>
              )}
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
