import { Download, Unplug } from 'lucide-react';
import { useFormatters, useI18n, type TranslateFn } from '@/i18n';
import { EMPTY_VALUE, fmtInt, fmtPct } from '@/lib/format';
import { exportToXlsx, type ExportColumn } from '@/lib/exportXlsx';
import { Button, TipText, TipTitle } from '@/components/ui';
import { SectionTitle } from '@/components/page';
import { HeaderHint, Table, Td, Th } from '@/components/table';
import type { ReactNode } from 'react';
import type { DailyRow } from '../lib/dailyMetrics';

type ColumnId = 'engagements' | 'engagementRate' | 'clicks' | 'ctr' | 'viewability' | 'conversions';

/** The day-by-day table — one row per day of the flight plus a pinned total —
 *  used for a whole campaign (per source) and for a single creative. A column
 *  the source doesn't measure reads "n/a", never zero. Exportable to Excel. */
export function DailyMetricsTable({
  title,
  hint,
  rows,
  total,
  sourceLabel,
  fileName,
}: {
  title: ReactNode;
  hint?: ReactNode;
  rows: DailyRow[];
  total: DailyRow | null;
  /** The measurement source's name, for the "not measured" tooltips. */
  sourceLabel: string;
  /** Download name without extension. */
  fileName: string;
}) {
  const { t } = useI18n();
  const { fmtDateLong } = useFormatters();

  const label = (id: ColumnId) => t(`daily.col.${id}`);
  const hintFor = (id: ColumnId): ReactNode => (
    <>
      <TipTitle>{label(id)}</TipTitle>
      <TipText>{t(`daily.help.${id}`)}</TipText>
    </>
  );

  const header = (id: ColumnId) => (
    <span className="inline-flex items-center gap-1">
      {label(id)}
      <HeaderHint>{hintFor(id)}</HeaderHint>
    </span>
  );

  const cell = (id: ColumnId, row: DailyRow): ReactNode => {
    const value = row[id];
    if (value == null) {
      return (
        <span
          className="inline-flex items-center gap-1 text-gray-400 dark:text-gray-500"
          title={t('campaigns.metricNATitle', { source: sourceLabel, metric: label(id) })}
        >
          <Unplug size={11} />
          {t('campaigns.metricNA')}
        </span>
      );
    }
    return id === 'engagements' || id === 'clicks' || id === 'conversions'
      ? fmtInt(value)
      : fmtPct(value, id === 'ctr' ? 2 : 1);
  };

  const exportRows = () => {
    const all = total ? [...rows, total] : rows;
    void exportToXlsx(`${fileName}.xlsx`, all, dailyExportColumns(t, fmtDateLong, total, hasConversions));
  };

  // Conversions only get a column on campaigns that track them.
  const hasConversions = rows.some((r) => r.conversions != null);
  const columns: ColumnId[] = [
    'engagements',
    'engagementRate',
    'clicks',
    'ctr',
    'viewability',
    ...(hasConversions ? (['conversions'] as const) : []),
  ];
  // Sticky cells need an opaque background or rows scroll visibly through them.
  const stickyHead = 'sticky top-0 z-10 bg-white dark:bg-brame-dark-light';
  const stickyFoot =
    'sticky bottom-0 z-10 border-t border-gray-200 bg-gray-50 font-semibold dark:border-white/10 dark:bg-[#323333]';

  return (
    <div>
      <SectionTitle
        hint={hint}
        action={
          <Button
            variant="primary"
            icon={<Download size={13} />}
            onClick={exportRows}
            disabled={rows.length === 0}
          >
            {t('common.exportCsv')}
          </Button>
        }
      >
        {title}
      </SectionTitle>
      <Table className="max-h-[30rem] overflow-y-auto">
        <thead>
          <tr>
            <Th className={stickyHead}>{t('daily.col.day')}</Th>
            <Th className={stickyHead}>{t('daily.col.date')}</Th>
            <Th align="right" className={stickyHead}>
              <span className="inline-flex items-center gap-1">
                {t('daily.col.impressions')}
                <HeaderHint>
                  <TipTitle>{t('daily.col.impressions')}</TipTitle>
                  <TipText>{t('metric.impressions.help')}</TipText>
                </HeaderHint>
              </span>
            </Th>
            {columns.map((id) => (
              <Th key={id} align="right" className={stickyHead}>
                {header(id)}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
              <Td className="text-gray-400 dark:text-gray-500">
                {t('daily.dayN', { n: row.day })}
              </Td>
              <Td className="whitespace-nowrap font-medium text-brame-dark dark:text-gray-100">
                {fmtDateLong(row.date)}
              </Td>
              <Td align="right">{fmtInt(row.impressions)}</Td>
              {columns.map((id) => (
                <Td key={id} align="right" className="tnum">
                  {cell(id, row)}
                </Td>
              ))}
            </tr>
          ))}
        </tbody>
        {total && (
          <tfoot>
            <tr>
              <Td className={stickyFoot}>{t('daily.total')}</Td>
              <Td className={stickyFoot}>{t('daily.days', { count: total.day })}</Td>
              <Td align="right" className={stickyFoot}>
                {fmtInt(total.impressions)}
              </Td>
              {columns.map((id) => (
                <Td key={id} align="right" className={`tnum ${stickyFoot}`}>
                  {cell(id, total)}
                </Td>
              ))}
            </tr>
          </tfoot>
        )}
      </Table>
    </div>
  );
}

/** The spreadsheet version: the same columns, ending in the Total row. */
function dailyExportColumns(
  t: TranslateFn,
  fmtDateLong: (d: string) => string,
  total: DailyRow | null,
  hasConversions: boolean,
): ExportColumn<DailyRow>[] {
  const isTotal = (r: DailyRow) => r === total;
  const count = (v: number | null) => (v == null ? EMPTY_VALUE : v);
  const pct = (v: number | null, d = 1) => (v == null ? EMPTY_VALUE : fmtPct(v, d));
  return [
    {
      key: 'day',
      header: t('daily.col.day'),
      format: (r) => (isTotal(r) ? t('daily.total') : r.day),
    },
    {
      key: 'date',
      header: t('daily.col.date'),
      format: (r) => (isTotal(r) ? '' : fmtDateLong(r.date)),
    },
    { key: 'impressions', header: t('daily.col.impressions') },
    { key: 'engagements', header: t('daily.col.engagements'), format: (r) => count(r.engagements) },
    {
      key: 'engagementRate',
      header: t('daily.col.engagementRate'),
      format: (r) => pct(r.engagementRate),
    },
    { key: 'clicks', header: t('daily.col.clicks'), format: (r) => count(r.clicks) },
    { key: 'ctr', header: t('daily.col.ctr'), format: (r) => pct(r.ctr, 2) },
    { key: 'viewability', header: t('daily.col.viewability'), format: (r) => pct(r.viewability) },
    ...(hasConversions
      ? [{ key: 'conversions' as const, header: t('daily.col.conversions'), format: (r: DailyRow) => count(r.conversions) }]
      : []),
  ];
}
