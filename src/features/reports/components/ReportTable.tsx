import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import type { ReportSheet } from '../lib/reportSheets';

const head =
  'border-b border-gray-200 px-3 py-1.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500';
const cellCls = 'border-b border-gray-100 px-3 py-1.5 text-right tnum';
// A table with many metric columns tightens up instead of scrolling sideways.
const denseHead =
  'border-b border-gray-200 px-1 py-1.5 text-right text-[9px] font-semibold uppercase tracking-tight text-gray-500';
const denseCell = 'border-b border-gray-100 px-1 py-1.5 text-right text-[11px] tnum';
const DENSE_FROM = 7;

/**
 * One report table, on white. `bars` draws a small data bar behind one column
 * (the creative split's share of impressions), which is how a PDF shows it. A
 * long table is cut to `maxRows` with a note — the file itself holds them all.
 */
export function ReportTable({
  sheet,
  bars,
  maxRows,
}: {
  sheet: ReportSheet;
  /** A column index and each row's 0–1 value to draw as a bar. */
  bars?: { column: number; values: number[] };
  maxRows?: number;
}) {
  const { t } = useI18n();
  const rows = maxRows ? sheet.rows.slice(0, maxRows) : sheet.rows;
  const hidden = sheet.rows.length - rows.length;
  const dense = sheet.headers.length >= DENSE_FROM;
  const headCls = dense ? denseHead : head;
  const bodyCls = dense ? denseCell : cellCls;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            {sheet.headers.map((h, i) => (
              <th key={i} className={cn(headCls, i < sheet.labelColumns && 'text-left')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className={r % 2 === 1 ? 'bg-gray-50/60' : undefined}>
              {row.map((value, c) => (
                <td
                  key={c}
                  className={cn(bodyCls, c < sheet.labelColumns && 'text-left font-medium')}
                >
                  {bars && bars.column === c ? (
                    <span className="inline-flex items-center justify-end gap-1.5">
                      <span
                        className={cn(
                          'h-1.5 overflow-hidden rounded-full bg-gray-100',
                          dense ? 'w-8' : 'w-16',
                        )}
                      >
                        <span
                          className="block h-full rounded-full bg-brame-teal"
                          style={{ width: `${Math.round((bars.values[r] ?? 0) * 100)}%` }}
                        />
                      </span>
                      {value}
                    </span>
                  ) : (
                    value
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {hidden > 0 && (
        <p className="px-3 pt-1.5 text-[11px] text-gray-400">
          {t('reports.preview.moreRows', { count: hidden })}
        </p>
      )}
    </div>
  );
}
