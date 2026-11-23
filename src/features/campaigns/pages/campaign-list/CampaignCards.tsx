import { memo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import { paths } from '@/config/paths';
import { useFormatters, useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { fmtPct } from '@/lib/format';
import { Card, Pill } from '@/components/ui';
import { CardStat, TextLink } from '@/components/display';
import { SortBar } from '@/components/page';
import type { Campaign } from '@/types';
import { CampaignStatusPill } from '../../components/CampaignStatusPill';
import { DeliveryBar } from '../../components/DeliveryBar';
import { MetricValueCell, type CellMetric } from '../../components/MetricValueCell';
import { deliveryPacing } from '../../lib/delivery';
import { deviceSplit } from '../../lib/devices';
import { DeviceSplitCell } from './cells';

/** The three numbers a card leads with; the rest sit under "More details". */
const KEY_METRICS: { metric: CellMetric; label: string }[] = [
  { metric: 'impressions', label: 'campaigns.col.impressions' },
  { metric: 'engagementRate', label: 'campaigns.col.engagementRate' },
  { metric: 'ctr', label: 'metric.ctr.label' },
];

const MORE_METRICS: { metric: CellMetric; label: string }[] = [
  { metric: 'viewability', label: 'metric.viewability.label' },
  { metric: 'ctaClicks', label: 'campaigns.col.clicks' },
  { metric: 'engagements', label: 'campaigns.col.engagements' },
];

/** One campaign as a card: what it is and how it is doing at a glance, with the
 *  remaining columns folded under "More details". */
const CampaignCard = memo(function CampaignCard({ campaign: c, isInternal }: { campaign: Campaign; isInternal: boolean }) {
  const { t } = useI18n();
  const { fmtDateRange } = useFormatters();
  const [open, setOpen] = useState(false);
  const pacing = deliveryPacing(c);
  const split = deviceSplit(c);

  return (
    <Card padded={false} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <TextLink to={paths.campaign(c.id)} variant="record" className="min-w-0 text-base leading-snug">
          {c.name}
        </TextLink>
        <CampaignStatusPill status={c.status} />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
        <span className="font-medium text-brame-dark dark:text-gray-200">{c.companyName}</span>
        <Pill tone="teal">{c.salesforce.market}</Pill>
        <Pill tone="purple">{c.salesforce.category}</Pill>
      </div>
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {fmtDateRange(c.flightStart, c.flightEnd)}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4 dark:border-white/10">
        {KEY_METRICS.map(({ metric, label }) => (
          <CardStat key={metric} label={t(label)}>
            <MetricValueCell campaign={c} metric={metric} />
          </CardStat>
        ))}
      </dl>

      {pacing != null && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{t('campaigns.col.delivery')}</span>
            <span className="tnum">{fmtPct(pacing, 0)}</span>
          </div>
          <DeliveryBar pacing={pacing} health={c.delivery.health} expectedPacing={c.delivery.expectedPacing} showValue={false} />
        </div>
      )}

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="mt-4 flex w-full items-center justify-between border-t border-gray-100 pt-3 text-sm font-medium text-brame-teal dark:border-white/10 dark:text-brame-lime"
      >
        {open ? t('campaigns.card.less') : t('campaigns.card.more')}
        <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          {MORE_METRICS.map(({ metric, label }) => (
            <CardStat key={metric} label={t(label)}>
              <MetricValueCell campaign={c} metric={metric} />
            </CardStat>
          ))}
          {isInternal && (
            <CardStat label={t('campaigns.col.account')}>
              <span className="font-sans text-base">{c.accountName ?? t('campaigns.account.direct')}</span>
            </CardStat>
          )}
          {split && (
            <CardStat label={t('campaigns.col.deviceSplit')}>
              <DeviceSplitCell campaign={c} />
            </CardStat>
          )}
        </dl>
      )}
    </Card>
  );
});

/** The campaign list on a small screen: one card per campaign. */
export function CampaignCards({ campaigns, isInternal }: { campaigns: Campaign[]; isInternal: boolean }) {
  return (
    <ul className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
      {campaigns.map((c) => (
        <li key={c.id}>
          <CampaignCard campaign={c} isInternal={isInternal} />
        </li>
      ))}
    </ul>
  );
}

/** Cards have no column headers to click, so this is how they are sorted. */
const SORT_FIELDS = [
  { id: 'name', label: 'campaigns.sort.name' },
  { id: 'status', label: 'campaigns.col.status' },
  { id: 'category', label: 'campaigns.col.category' },
  { id: 'startDate', label: 'campaigns.col.startDate' },
  { id: 'endDate', label: 'campaigns.col.endDate' },
  { id: 'company', label: 'campaigns.col.company' },
  { id: 'account', label: 'campaigns.col.account' },
];

export function CampaignSortBar({ table }: { table: Table<Campaign> }) {
  const { t } = useI18n();
  const current = table.getState().sorting[0];
  return (
    <SortBar
      className="border-t"
      fields={SORT_FIELDS.filter((f) => table.getColumn(f.id)?.getCanSort()).map((f) => ({
        value: f.id,
        label: t(f.label),
      }))}
      value={current?.id ?? null}
      desc={current?.desc ?? false}
      defaultLabel={t('campaigns.sort.default')}
      onChange={({ field, desc }) => table.setSorting(field ? [{ id: field, desc }] : [])}
    />
  );
}
