import { endOfMonth, format, parseISO, startOfMonth, subDays, subMonths } from 'date-fns';
import { TODAY, YESTERDAY_ISO } from '@/lib/clock';
import type { Campaign, CreativeDailyPoint, EmailReport, MetricKey, ReportScope } from '@/types';
import { primarySeries } from '@/features/campaigns';
import type { ReportMetric } from './reportMetrics';

/** What a report is being built from — the form's live values (or a saved
 *  report), so the preview and the sample show exactly what would be sent. */
export interface ReportDraft {
  /** Undefined until the author has picked a target; the content then falls
   *  back to the whole portfolio and says so. */
  scope?: ReportScope;
  name: string;
  metrics: ReportMetric[];
  granularity: EmailReport['granularity'];
  cadence: EmailReport['cadence'];
  format: EmailReport['format'];
}

export type MetricValues = Record<ReportMetric, number | null>;

export interface ReportContent {
  periodStart: string;
  periodEnd: string;
  /** True when the cadence's own period had no delivery, so the latest week
   *  of data was used instead — a sample must never come out empty. */
  usedFallbackPeriod: boolean;
  metrics: ReportMetric[];
  campaignCount: number;
  summary: MetricValues;
  /** One row per campaign — omitted for a single-campaign report. */
  campaigns: { id: string; name: string; values: MetricValues }[];
  /** The creative-level split, always present: one row per creative size. */
  creatives: { format: string; share: number; values: MetricValues }[];
  /** Day-by-day totals, only for a daily-breakdown report. */
  daily: { date: string; values: MetricValues }[] | null;
}

interface Acc {
  impressions: number;
  engImpr: number;
  engagements: number;
  ctrImpr: number;
  clicks: number;
  viewImpr: number;
  viewable: number;
}

const emptyAcc = (): Acc => ({
  impressions: 0,
  engImpr: 0,
  engagements: 0,
  ctrImpr: 0,
  clicks: 0,
  viewImpr: 0,
  viewable: 0,
});

/** Which rates a campaign's primary source can actually measure — a rate it
 *  can't is left out of the average, never counted as zero. */
function measured(campaign: Campaign) {
  const totals = primarySeries(campaign)?.totals ?? {};
  const has = (m: MetricKey) => totals[m] !== undefined;
  return { eng: has('engagementRate'), ctr: has('ctr'), view: has('viewability') };
}

function add(acc: Acc, p: CreativeDailyPoint, m: ReturnType<typeof measured>) {
  acc.impressions += p.impressions;
  if (m.eng) {
    acc.engImpr += p.impressions;
    acc.engagements += p.engagements;
  }
  if (m.ctr) {
    acc.ctrImpr += p.impressions;
    acc.clicks += p.ctaClicks;
  }
  if (m.view) {
    acc.viewImpr += p.impressions;
    acc.viewable += p.viewable;
  }
}

const valuesOf = (a: Acc): MetricValues => ({
  impressions: a.impressions,
  engagementRate: a.engImpr ? a.engagements / a.engImpr : null,
  ctr: a.ctrImpr ? a.clicks / a.ctrImpr : null,
  viewability: a.viewImpr ? a.viewable / a.viewImpr : null,
});

function campaignsInScope(
  campaigns: Campaign[],
  scope: ReportScope | undefined,
): Campaign[] {
  if (!scope) return campaigns;
  if (scope.level === 'client') return campaigns.filter((c) => c.companyId === scope.companyId);
  if (scope.level === 'agency') return campaigns.filter((c) => c.agencyId === scope.agencyId);
  return campaigns.filter((c) => c.id === scope.campaignId);
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/** The period a scheduled run would cover, ending at the last complete day. */
function reportPeriod(cadence: EmailReport['cadence']): { start: string; end: string } {
  if (cadence === 'daily') return { start: YESTERDAY_ISO, end: YESTERDAY_ISO };
  if (cadence === 'weekly')
    return { start: iso(subDays(parseISO(YESTERDAY_ISO), 6)), end: YESTERDAY_ISO };
  const lastMonth = subMonths(TODAY, 1);
  return { start: iso(startOfMonth(lastMonth)), end: iso(endOfMonth(lastMonth)) };
}

/**
 * Builds what a report would contain from the campaigns in its scope — the
 * same numbers a scheduled run would send. The real send runs in the
 * backend; this is its stand-in for previews and samples.
 */
export function buildReportContent(draft: ReportDraft, allCampaigns: Campaign[]): ReportContent {
  const scoped = campaignsInScope(allCampaigns, draft.scope).filter((c) => primarySeries(c));
  const metrics = draft.metrics.length
    ? draft.metrics
    : (['impressions', 'ctr', 'viewability', 'engagementRate'] as ReportMetric[]);

  let { start, end } = reportPeriod(draft.cadence);
  const inPeriod = (date: string) => date >= start && date <= end;
  const impressionsIn = () =>
    scoped.reduce(
      (n, c) =>
        n +
        (primarySeries(c)
          ?.daily.filter((d) => inPeriod(d.date))
          .reduce((a, d) => a + d.impressions, 0) ?? 0),
      0,
    );

  let usedFallbackPeriod = false;
  if (!impressionsIn()) {
    const latest = scoped
      .flatMap(
        (c) =>
          primarySeries(c)
            ?.daily.filter((d) => d.impressions > 0)
            .map((d) => d.date) ?? [],
      )
      .sort()
      .pop();
    if (latest) {
      end = latest;
      start = iso(subDays(parseISO(latest), 6));
      usedFallbackPeriod = true;
    }
  }

  const summary = emptyAcc();
  const byCampaign = new Map<string, Acc>();
  const byCreative = new Map<string, Acc>();
  const byDay = new Map<string, Acc>();

  for (const c of scoped) {
    const m = measured(c);
    const series = primarySeries(c)!;
    const own = emptyAcc();
    for (const p of series.daily) {
      if (p.date < start || p.date > end) continue;
      add(own, p, m);
      add(summary, p, m);
      if (!byDay.has(p.date)) byDay.set(p.date, emptyAcc());
      add(byDay.get(p.date)!, p, m);
    }
    byCampaign.set(c.id, own);
    for (const cr of c.creatives) {
      if (!byCreative.has(cr.format)) byCreative.set(cr.format, emptyAcc());
      for (const p of cr.daily)
        if (p.date >= start && p.date <= end) add(byCreative.get(cr.format)!, p, m);
    }
  }

  const creativeTotal = [...byCreative.values()].reduce((n, a) => n + a.impressions, 0);
  const campaignRows = scoped
    .map((c) => ({ id: c.id, name: c.name, values: valuesOf(byCampaign.get(c.id)!) }))
    .filter((r) => (r.values.impressions ?? 0) > 0)
    .sort((a, b) => (b.values.impressions ?? 0) - (a.values.impressions ?? 0));

  return {
    periodStart: start,
    periodEnd: end,
    usedFallbackPeriod,
    metrics,
    campaignCount: campaignRows.length,
    summary: valuesOf(summary),
    campaigns: draft.scope?.level === 'campaign' ? [] : campaignRows,
    creatives: [...byCreative.entries()]
      .map(([fmt, a]) => ({
        format: fmt,
        share: creativeTotal ? a.impressions / creativeTotal : 0,
        values: valuesOf(a),
      }))
      .filter((r) => (r.values.impressions ?? 0) > 0)
      .sort((a, b) => b.share - a.share),
    daily:
      draft.granularity === 'daily'
        ? [...byDay.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, a]) => ({ date, values: valuesOf(a) }))
        : null,
  };
}
