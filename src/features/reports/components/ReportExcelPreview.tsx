import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useFormatters, useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import type { ReportContent } from '../lib/reportContent';
import { buildReportSheets, type ReportSheet } from '../lib/reportSheets';

const letter = (i: number) => String.fromCharCode(65 + i);

/**
 * The Excel attachment as a spreadsheet: lettered columns, numbered rows, a
 * title block, a styled header row and one tab per section — each tab is a
 * sheet of the workbook. Figures are real numbers there, so recipients can
 * sort, filter and pivot; that is what an Excel offers over a PDF.
 */
export function ReportExcelPreview({
  content,
  name,
  scopeLabel,
  period,
  fileName,
}: {
  content: ReportContent;
  name: string;
  scopeLabel: string;
  period: string;
  fileName: string;
}) {
  const { t } = useI18n();
  const { fmtDate } = useFormatters();
  const sheets = buildReportSheets(content, t, fmtDate);
  const [active, setActive] = useState<ReportSheet['id']>('summary');
  const sheet = sheets.find((s) => s.id === active) ?? sheets[0];
  const columns = sheet.headers.length;

  // Rows above the table: title, scope and period, a blank line.
  const titleRows = [`${name} — ${sheet.title}`, `${scopeLabel} · ${period}`, ''];
  const grid = 'border border-gray-200 px-2 py-1';
  const rowNumber =
    'w-9 border border-gray-300 bg-gray-100 px-1 py-1 text-center text-[11px] font-normal text-gray-500';

  return (
    <div className="overflow-hidden rounded-xl border border-gray-300 bg-white text-gray-800 shadow-sm">
      <div className="flex items-center gap-2 bg-[#1d6f42] px-3 py-1.5 text-xs font-medium text-white">
        <FileSpreadsheet size={13} />
        <span className="truncate">{fileName}</span>
      </div>

      <div className="max-h-80 overflow-auto">
        <table className="border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={cn(rowNumber, 'bg-gray-200')} />
              {sheet.headers.map((_, i) => (
                <th
                  key={i}
                  className="min-w-[7.5rem] border border-gray-300 bg-gray-100 px-2 py-1 text-center text-[11px] font-normal text-gray-500"
                >
                  {letter(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {titleRows.map((text, r) => (
              <tr key={`t${r}`}>
                <th className={rowNumber}>{r + 1}</th>
                <td
                  colSpan={columns}
                  className={cn(
                    'whitespace-nowrap border border-gray-100 px-2 py-1',
                    r === 0 && 'text-sm font-bold text-gray-900',
                    r === 1 && 'text-gray-500',
                  )}
                >
                  {text}
                </td>
              </tr>
            ))}
            <tr>
              <th className={rowNumber}>{titleRows.length + 1}</th>
              {sheet.headers.map((h, i) => (
                <td
                  key={i}
                  className={cn(
                    'border border-brame-teal-dark bg-brame-teal px-2 py-1 font-semibold text-white',
                    i >= sheet.labelColumns && 'text-right',
                  )}
                >
                  {h}
                </td>
              ))}
            </tr>
            {sheet.rows.map((row, r) => (
              <tr key={r}>
                <th className={rowNumber}>{titleRows.length + 2 + r}</th>
                {row.map((v, c) => (
                  <td
                    key={c}
                    className={cn(
                      grid,
                      'whitespace-nowrap',
                      r % 2 === 1 && 'bg-gray-50',
                      c < sheet.labelColumns ? 'font-medium' : 'tnum text-right',
                    )}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div role="tablist" className="flex items-end gap-0.5 border-t border-gray-300 bg-gray-100 px-2 pt-1">
        {sheets.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === active}
            onClick={() => setActive(s.id)}
            className={cn(
              'rounded-t-md border border-b-0 px-3 py-1 text-xs',
              s.id === active
                ? 'border-gray-300 border-b-2 border-b-[#1d6f42] bg-white font-semibold text-[#1d6f42]'
                : 'border-transparent text-gray-600 hover:bg-gray-200',
            )}
          >
            {s.title}
          </button>
        ))}
      </div>
    </div>
  );
}
