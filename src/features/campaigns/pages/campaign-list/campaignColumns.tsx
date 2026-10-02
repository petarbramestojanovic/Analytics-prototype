import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Monitor, Smartphone, Star } from 'lucide-react';
import { useI18n, type TranslateFn } from '@/i18n';
import { EMPTY_VALUE, fmtMetric } from '@/lib/format';
import type { ExportColumn } from '@/lib/exportXlsx';
import { Pill } from '@/components/ui';
import type { Campaign, MetricKey } from '@/types';
import { CampaignNameCell } from '../../components/CampaignNameCell';
import { DeliveryBar } from '../../components/DeliveryBar';
import { MetricValueCell } from '../../components/MetricValueCell';
import { deliveryPacing } from '../../lib/delivery';
import { deviceSplit } from '../../lib/devices';
import { primarySeries, sourceMeta } from '../../lib/sources';
import { CampaignRowActions } from './CampaignRowActions';
import { DeviceSplitCell, FreshnessCell } from './cells';

/** Metric columns, in table order. Each renders through MetricValueCell, so
 *  a metric the primary source can't measure reads "n/a", never 0. */
const METRIC_COLUMNS: { id: string; metric: MetricKey }[] = [
  { id: 'impressions', metric: 'impressions' },
  { id: 'ctr', metric: 'ctr' },
  { id: 'viewability', metric: 'viewability' },
  { id: 'engagement', metric: 'engagementRate' },
];

/** Columns only internal seats see — who booked a client's campaign is
 *  Brame/sales business, never something a client needs (or should be able
 *  to) see on their own campaigns. */
const INTERNAL_ONLY = new Set(['company', 'agency']);

const agencyLabel = (c: Campaign, t: TranslateFn) => c.agencyName ?? t('campaigns.agency.direct');

export function useCampaignColumns(showInternal: boolean): ColumnDef<Campaign>[] {
  const { t } = useI18n();

  return useMemo(() => {
    const cols: ColumnDef<Campaign>[] = [
      {
        id: 'campaign',
        accessorFn: (c) => c.name,
        header: t('campaigns.col.campaign'),
        cell: ({ row }) => <CampaignNameCell campaign={row.original} />,
        enableHiding: false,
      },
      {
        id: 'agency',
        accessorFn: (c) => agencyLabel(c, t),
        header: t('campaigns.col.agency'),
      },
      {
        id: 'company',
        accessorFn: (c) => c.companyName,
        header: t('campaigns.col.company'),
      },
      {
        id: 'country',
        accessorFn: (c) => c.salesforce.market,
        header: t('campaigns.col.country'),
        cell: ({ row }) => <Pill tone="teal">{row.original.salesforce.market}</Pill>,
      },
      {
        id: 'primarySource',
        accessorFn: (c) => sourceMeta(c, c.primarySource).label,
        header: t('campaigns.col.primarySource'),
        cell: ({ getValue }) => (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Star size={11} className="text-brame-teal" fill="currentColor" />
            {String(getValue())}
          </span>
        ),
      },
      {
        id: 'freshness',
        header: t('campaigns.col.freshness'),
        cell: ({ row }) => <FreshnessCell campaign={row.original} />,
        enableSorting: false,
      },
      ...METRIC_COLUMNS.map(
        ({ id, metric }): ColumnDef<Campaign> => ({
          id,
          accessorFn: (c) => primarySeries(c)?.totals[metric] ?? -1,
          header: t(id === 'impressions' ? 'campaigns.col.impressions' : `metric.${metric}.label`),
          cell: ({ row }) => <MetricValueCell campaign={row.original} metric={metric} />,
        })
      ),
      {
        id: 'delivery',
        accessorFn: (c) => deliveryPacing(c) ?? -1,
        header: t('campaigns.col.delivery'),
        cell: ({ row }) => <DeliveryBar pacing={deliveryPacing(row.original)} align="center" />,
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
export function campaignExportColumns(t: TranslateFn, showInternal: boolean): ExportColumn<Campaign>[] {
  const metric = (m: MetricKey) => (c: Campaign) => fmtMetric(m, primarySeries(c)?.totals[m]);
  return [
    { key: 'name', header: t('campaigns.col.campaign') },
    { key: 'companyName', header: t('campaigns.col.company') },
    ...(showInternal ? [{ key: 'agencyName', header: t('campaigns.col.agency'), format: (c: Campaign) => agencyLabel(c, t) }] : []),
    { key: 'market', header: t('campaigns.col.country'), format: (c) => c.salesforce.market },
    { key: 'primarySource', header: t('campaigns.col.primarySource'), format: (c) => sourceMeta(c, c.primarySource).label },
    { key: 'impressions', header: t('campaigns.col.impressions'), format: (c) => primarySeries(c)?.totals.impressions ?? EMPTY_VALUE },
    { key: 'ctr', header: t('metric.ctr.label'), format: metric('ctr') },
    { key: 'viewability', header: t('metric.viewability.label'), format: metric('viewability') },
    { key: 'engagementRate', header: t('metric.engagementRate.label'), format: metric('engagementRate') },
    { key: 'status', header: 'Status', format: (c) => t(`status.${c.status}`) },
  ];
}
