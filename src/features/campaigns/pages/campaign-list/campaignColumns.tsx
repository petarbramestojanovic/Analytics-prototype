import { useMemo, type ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Monitor, Smartphone } from 'lucide-react';
import { useI18n, type TranslateFn } from '@/i18n';
import { EMPTY_VALUE, fmtMetric } from '@/lib/format';
import type { ExportColumn } from '@/lib/exportXlsx';
import { Pill, TipText, TipTitle } from '@/components/ui';
import type { Campaign, CampaignStatus, MetricKey } from '@/types';
import { CampaignSortHeader } from './CampaignSortHeader';
import { CampaignNameCell } from '../../components/CampaignNameCell';
import { DeliveryBar } from '../../components/DeliveryBar';
import { MetricValueCell, type CellMetric } from '../../components/MetricValueCell';
import { deliveryPacing } from '../../lib/delivery';
import { deviceSplit } from '../../lib/devices';
import { engagementCount, primarySeries } from '../../lib/sources';
import { CampaignRowActions } from './CampaignRowActions';
import { DateCell, DeviceSplitCell, TruncatedText } from './cells';

/** Metric columns, in table order. Each renders through MetricValueCell, so
 *  a metric the primary source can't measure reads "n/a", never 0. */
const METRIC_COLUMNS: { id: string; metric: CellMetric }[] = [
  { id: 'impressions', metric: 'impressions' },
  { id: 'engagements', metric: 'engagements' },
  { id: 'engagement', metric: 'engagementRate' },
  { id: 'clicks', metric: 'ctaClicks' },
  { id: 'ctr', metric: 'ctr' },
  { id: 'viewability', metric: 'viewability' },
];

/** The value a column sorts on; missing (not measured) sorts last. */
const sortValue = (c: Campaign, metric: CellMetric) =>
  (metric === 'engagements' ? engagementCount(c) : primarySeries(c)?.totals[metric]) ?? -1;

/** Columns only internal seats see — who booked a client's campaign is
 *  Klea/sales business, never something a client needs (or should be able
 *  to) see on their own campaigns. */
const INTERNAL_ONLY = new Set(['company', 'account']);

const HEADER_KEY: Record<string, string> = {
  impressions: 'campaigns.col.impressions',
  // Short form — this table is tight on width.
  engagement: 'campaigns.col.engagementRate',
  engagements: 'campaigns.col.engagements',
  clicks: 'campaigns.col.clicks',
};

/** Lifecycle order, not alphabetical — "Live" first reads as the useful sort. */
const STATUS_ORDER: CampaignStatus[] = ['live', 'paused', 'ended', 'archived'];

const accountLabel = (c: Campaign, t: TranslateFn) =>
  c.accountName ?? t('campaigns.account.direct');

export function useCampaignColumns(showInternal: boolean): ColumnDef<Campaign>[] {
  const { t } = useI18n();

  return useMemo(() => {
    const cols: ColumnDef<Campaign>[] = [
      {
        id: 'campaign',
        accessorFn: (c) => c.name,
        header: ({ table }) => <CampaignSortHeader table={table} />,
        cell: ({ row }) => (
          <CampaignNameCell campaign={row.original} showFlight={false} showCategory quietLink />
        ),
        enableHiding: false,
        // Sorting is driven by the header's menu, not a click on the label.
        enableSorting: false,
      },
      {
        id: 'name',
        accessorFn: (c) => c.name,
        enableHiding: false,
      },
      {
        id: 'status',
        accessorFn: (c) => STATUS_ORDER.indexOf(c.status),
        enableHiding: false,
      },
      {
        id: 'category',
        accessorFn: (c) => c.salesforce.category,
        enableHiding: false,
      },
      {
        id: 'account',
        accessorFn: (c) => accountLabel(c, t),
        header: t('campaigns.col.account'),
        cell: ({ getValue }) => <TruncatedText text={String(getValue())} />,
      },
      {
        id: 'company',
        accessorFn: (c) => c.companyName,
        header: t('campaigns.col.company'),
        cell: ({ getValue }) => <TruncatedText text={String(getValue())} />,
      },
      {
        id: 'country',
        accessorFn: (c) => c.salesforce.market,
        header: t('campaigns.col.country'),
        cell: ({ row }) => <Pill tone="teal">{row.original.salesforce.market}</Pill>,
      },
      {
        id: 'startDate',
        accessorFn: (c) => c.flightStart,
        header: t('campaigns.col.startDate'),
        cell: ({ row }) => <DateCell date={row.original.flightStart} />,
      },
      {
        id: 'endDate',
        accessorFn: (c) => c.flightEnd,
        header: t('campaigns.col.endDate'),
        cell: ({ row }) => <DateCell date={row.original.flightEnd} />,
      },
      ...METRIC_COLUMNS.map(({ id, metric }): ColumnDef<Campaign> => ({
        id,
        accessorFn: (c) => sortValue(c, metric),
        header: t(HEADER_KEY[id] ?? `metric.${metric}.label`),
        cell: ({ row }) => <MetricValueCell campaign={row.original} metric={metric} />,
      })),
      {
        id: 'delivery',
        accessorFn: (c) => deliveryPacing(c) ?? -1,
        header: t('campaigns.col.delivery'),
        cell: ({ row }) => (
          <DeliveryBar
            pacing={deliveryPacing(row.original)}
            health={row.original.delivery.health}
            expectedPacing={row.original.delivery.expectedPacing}
            align="center"
          />
        ),
      },
      {
        id: 'deviceSplit',
        accessorFn: (c) => deviceSplit(c)?.desktop ?? -1,
        header: () => (
          <span className="inline-flex items-center gap-1" title={t('campaigns.col.deviceSplit')}>
            <Monitor size={13} />
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <Smartphone size={13} />
            <span className="sr-only">{t('campaigns.col.deviceSplit')}</span>
          </span>
        ),
        cell: ({ row }) => <DeviceSplitCell campaign={row.original} />,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => <CampaignRowActions campaign={row.original} />,
      },
    ];
    return showInternal ? cols : cols.filter((c) => !INTERNAL_ONLY.has(c.id!));
  }, [t, showInternal]);
}

/** The spreadsheet version of the same table. Internal-only columns are left
 *  out of a client's own export entirely, not just hidden. */
export function campaignExportColumns(
  t: TranslateFn,
  showInternal: boolean,
): ExportColumn<Campaign>[] {
  const metric = (m: MetricKey) => (c: Campaign) => fmtMetric(m, primarySeries(c)?.totals[m]);
  return [
    { key: 'name', header: t('campaigns.col.campaign') },
    { key: 'companyName', header: t('campaigns.col.company') },
    ...(showInternal
      ? [
          {
            key: 'accountName',
            header: t('campaigns.col.account'),
            format: (c: Campaign) => accountLabel(c, t),
          },
        ]
      : []),
    { key: 'market', header: t('campaigns.col.country'), format: (c) => c.salesforce.market },
    { key: 'category', header: t('campaigns.col.category'), format: (c) => c.salesforce.category },
    { key: 'flightStart', header: t('campaigns.col.startDate') },
    { key: 'flightEnd', header: t('campaigns.col.endDate') },
    {
      key: 'impressions',
      header: t('campaigns.col.impressions'),
      format: (c) => primarySeries(c)?.totals.impressions ?? EMPTY_VALUE,
    },
    {
      key: 'engagements',
      header: t('campaigns.col.engagements'),
      format: (c) => engagementCount(c) ?? EMPTY_VALUE,
    },
    {
      key: 'engagementRate',
      header: t('metric.engagementRate.label'),
      format: metric('engagementRate'),
    },
    {
      key: 'clicks',
      header: t('campaigns.col.clicks'),
      format: (c) => primarySeries(c)?.totals.ctaClicks ?? EMPTY_VALUE,
    },
    { key: 'ctr', header: t('metric.ctr.label'), format: metric('ctr') },
    { key: 'viewability', header: t('metric.viewability.label'), format: metric('viewability') },
    { key: 'status', header: t('campaigns.col.status'), format: (c) => t(`status.${c.status}`) },
  ];
}

/** What each calculated column means — shown once, as an (i) beside its
 *  header, because every value in the column shares the same definition. */
export function useCampaignHeaderHints(): (columnId: string) => ReactNode {
  const { t } = useI18n();
  return (columnId) => {
    const metric = METRIC_COLUMNS.find((m) => m.id === columnId)?.metric;
    const parts =
      columnId === 'delivery'
        ? { title: t('campaigns.col.delivery'), help: t('delivery.help') }
        : metric
          ? {
              title:
                columnId === 'clicks' ? t('campaigns.col.clicks') : t(`metric.${metric}.label`),
              help: t(`metric.${metric}.help`),
            }
          : null;
    if (!parts) return null;
    return (
      <>
        <TipTitle>{parts.title}</TipTitle>
        <TipText>{parts.help}</TipText>
      </>
    );
  };
}
