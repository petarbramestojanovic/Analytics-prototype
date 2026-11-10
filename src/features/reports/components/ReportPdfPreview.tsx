import type { ReactNode } from 'react';
import { useFormatters, useI18n } from '@/i18n';
import { fmtInt } from '@/lib/format';
import type { ReportContent } from '../lib/reportContent';
import { buildReportSheets } from '../lib/reportSheets';
import { ReportKpiTiles } from './ReportKpiTiles';
import { ReportTable } from './ReportTable';

/** The page is drawn at a fixed width so the layout budget below holds. */
const PAGE_WIDTH = 620;
const PAGE_HEIGHT = Math.round(PAGE_WIDTH * 1.414);
/** What the page spends on the brand band, footer and padding, in px. */
const PAGE_CHROME = 44 + 42 + 24;
const PAGE_ROOM = PAGE_HEIGHT - PAGE_CHROME;

const ROW = 27;
const TABLE_HEAD = 34;
const SECTION_TITLE = 44;
const GAP = 24;
const MAX_CAMPAIGN_ROWS = 8;
const MAX_DAILY_ROWS = 10;

interface Block {
  key: string;
  /** Rough height in px — enough to decide where a page ends. */
  height: number;
  node: ReactNode;
}

/** Fills pages in order; a block that doesn't fit the rest of a page starts
 *  the next one, so a page is only added when the content needs it. */
function paginate(blocks: Block[]): Block[][] {
  const pages: Block[][] = [[]];
  let used = 0;
  for (const block of blocks) {
    const need = block.height + (used ? GAP : 0);
    if (used && used + need > PAGE_ROOM) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(block);
    used += used ? need : block.height;
  }
  return pages;
}

/**
 * The PDF attachment as paper: A4 pages on a grey desk, a brand band, the KPI
 * tiles, the creative split with data bars and — for a daily report — a chart
 * and table of the days. Sections flow onto as many pages as they need (often
 * just one). What a PDF can't do — sort, filter, edit — it doesn't pretend to;
 * that is the Excel's job.
 */
export function ReportPdfPreview({
  content,
  name,
  scopeLabel,
  period,
}: {
  content: ReportContent;
  name: string;
  scopeLabel: string;
  period: string;
}) {
  const { t } = useI18n();
  const { fmtDate } = useFormatters();
  const sheets = buildReportSheets(content, t, fmtDate);
  const creatives = sheets.find((s) => s.id === 'creatives');
  const campaigns = sheets.find((s) => s.id === 'campaigns');
  const daily = sheets.find((s) => s.id === 'daily');
  const tileRows = Math.ceil(content.metrics.length / 4);
  const moreNote = (rows: number, cap: number) => (rows > cap ? 20 : 0);

  const blocks: Block[] = [
    {
      key: 'head',
      height: 48 + (content.usedFallbackPeriod ? 48 : 0) + tileRows * 66 + (tileRows - 1) * 12 + GAP,
      node: (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{name}</h3>
            <p className="text-xs text-gray-500">
              {scopeLabel} · {period}
            </p>
          </div>
          {content.usedFallbackPeriod && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {t('reports.preview.fallbackPeriod')}
            </p>
          )}
          <ReportKpiTiles content={content} large />
        </div>
      ),
    },
  ];
  if (creatives) {
    blocks.push({
      key: 'creatives',
      height: SECTION_TITLE + TABLE_HEAD + creatives.rows.length * ROW,
      node: (
        <section>
          <h4 className="text-sm font-semibold text-gray-900">{creatives.title}</h4>
          <p className="mb-2 text-xs text-gray-500">{t('reports.preview.creativesHint')}</p>
          <ReportTable
            sheet={creatives}
            bars={{ column: 1, values: content.creatives.map((c) => c.share) }}
          />
        </section>
      ),
    });
  }
  if (daily && content.daily) {
    const rows = Math.min(daily.rows.length, MAX_DAILY_ROWS);
    blocks.push({
      key: 'daily',
      height:
        SECTION_TITLE + 112 + TABLE_HEAD + rows * ROW + moreNote(daily.rows.length, MAX_DAILY_ROWS),
      node: (
        <section>
          <h4 className="text-sm font-semibold text-gray-900">{daily.title}</h4>
          <p className="mb-2 text-xs text-gray-500">{t('reports.preview.dailyChart')}</p>
          <DailyBars daily={content.daily} />
          <div className="mt-3">
            <ReportTable sheet={daily} maxRows={MAX_DAILY_ROWS} />
          </div>
        </section>
      ),
    });
  }
  if (campaigns) {
    const rows = Math.min(campaigns.rows.length, MAX_CAMPAIGN_ROWS);
    blocks.push({
      key: 'campaigns',
      height:
        SECTION_TITLE - 14 +
        TABLE_HEAD +
        rows * ROW +
        moreNote(campaigns.rows.length, MAX_CAMPAIGN_ROWS),
      node: (
        <section>
          <h4 className="text-sm font-semibold text-gray-900">{campaigns.title}</h4>
          <div className="mt-2">
            <ReportTable sheet={campaigns} maxRows={MAX_CAMPAIGN_ROWS} />
          </div>
        </section>
      ),
    });
  }

  const pages = paginate(blocks);

  return (
    <div className="overflow-x-auto rounded-xl bg-gray-300/80 p-4 sm:p-6">
      <div className="space-y-5">
        {pages.map((page, i) => (
          <Sheet key={i} page={i + 1} pages={pages.length} name={name}>
            <div className="space-y-6 px-6 pt-6">
              {page.map((b) => (
                <div key={b.key}>{b.node}</div>
              ))}
            </div>
          </Sheet>
        ))}
      </div>
    </div>
  );
}

/** One A4 page: brand band on top, page footer at the bottom. */
function Sheet({
  page,
  pages,
  name,
  children,
}: {
  page: number;
  pages: number;
  name: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div
      className="mx-auto flex flex-col overflow-hidden bg-white text-gray-800 shadow-lg"
      style={{ width: PAGE_WIDTH, minHeight: PAGE_HEIGHT }}
    >
      <div className="flex items-center justify-between bg-brame-teal px-6 py-3 text-white">
        <span className="text-sm font-bold tracking-wide">Klea Analytics</span>
        <span className="text-[11px] uppercase tracking-widest text-white/80">
          {t('reports.preview.pdfTitle')}
        </span>
      </div>
      <div className="flex-1">{children}</div>
      <div className="mx-6 flex items-center justify-between border-t border-gray-200 py-2.5 text-[10px] text-gray-400">
        <span className="truncate">{name}</span>
        <span className="flex-shrink-0">{t('reports.preview.page', { n: page, total: pages })}</span>
      </div>
    </div>
  );
}

/** Impressions per day as bars — the one chart a daily PDF carries. */
function DailyBars({ daily }: { daily: NonNullable<ReportContent['daily']> }) {
  const { fmtDate } = useFormatters();
  const values = daily.map((d) => d.values.impressions ?? 0);
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-24 items-end gap-0.5 border-b border-gray-200">
      {daily.map((d, i) => (
        <div
          key={d.date}
          className="flex-1 rounded-t-sm bg-brame-teal/80"
          style={{ height: `${Math.max((values[i] / max) * 100, 2)}%` }}
          title={`${fmtDate(d.date)} · ${fmtInt(values[i])}`}
        />
      ))}
    </div>
  );
}
