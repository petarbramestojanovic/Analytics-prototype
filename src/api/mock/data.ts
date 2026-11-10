import { eachDayOfInterval, format } from 'date-fns';
import { TODAY, YESTERDAY_ISO } from '@/lib/clock';
import { deliveryPacing } from '@/features/campaigns/lib/delivery';
import { SOURCE_DEFINITIONS } from '@/features/campaigns/lib/sources';
import type {
  BenchmarkCampaign,
  BenchmarkCreative,
  Campaign,
  InboxEvent,
  DailyPoint,
  EmailReport,
  MetricKey,
  PrimaryKpi,
  SourceKey,
  SourceSeries,
  SyncRun,
} from '@/types';
import {
  accounts,
  apiKeys,
  companies,
  seatIdForAccount,
  seatIdForCompany,
  seatMembers,
  seats,
} from './seeds/companies';
import {
  CAMPAIGN_MANAGERS,
  MECHANICS,
  MECHANIC_LIFT,
  personFor,
  seeds,
  type CampaignSeed,
} from './seeds/campaigns';

export { accounts, apiKeys, companies, seatIdForAccount, seatIdForCompany, seatMembers, seats };

/** Deterministic PRNG — mock numbers must not reshuffle between reloads while
 *  someone is presenting them. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

const daysBetween = (start: string, end: string): string[] =>
  eachDayOfInterval({ start: new Date(start), end: new Date(end) }).map((d) =>
    format(d, 'yyyy-MM-dd'),
  );

// ---------------------------------------------------------------------------
// Series generation
// ---------------------------------------------------------------------------

interface SeriesOpts {
  seed: number;
  dates: string[];
  dailyImpressions: number;
  /** Multiplier applied to this source's impression count. The whole point of
   *  the Compare overlay is that these do not agree — an adserver counts a
   *  delivered impression our own beacon may never see fire. */
  countBias: number;
  viewability: number;
  engagementRate: number;
  measures: MetricKey[];
  /** Nightly sources are complete only through yesterday. */
  truncateToYesterday: boolean;
  /** The campaign tracks conversions (Salesforce flag); fills `conversions`. */
  conversions: boolean;
}

function buildSeries(o: SeriesOpts): SourceSeries {
  const rand = rng(o.seed);
  const cutoff = YESTERDAY_ISO;
  const dates = o.truncateToYesterday
    ? o.dates.filter((d) => d <= cutoff)
    : o.dates.filter((d) => d <= iso(TODAY));

  // Own generator, so switching conversions on never reshuffles the numbers
  // every other metric already had.
  const conversionRand = rng(o.seed + 991);

  const daily: DailyPoint[] = dates.map((date, i) => {
    // Weekend dip plus a mild ramp, so the shape looks like media delivery
    // rather than noise.
    const dow = new Date(date).getDay();
    const weekend = dow === 0 || dow === 6 ? 0.72 : 1;
    const ramp = 0.85 + Math.min(i / Math.max(dates.length, 1), 1) * 0.3;
    const jitter = 0.9 + rand() * 0.2;

    const impressions = Math.round(o.dailyImpressions * o.countBias * weekend * ramp * jitter);
    const viewable = Math.round(impressions * (o.viewability + (rand() - 0.5) * 0.04));
    const plays = Math.round(viewable * (0.18 + rand() * 0.03));
    const engagements = Math.round(impressions * (o.engagementRate + (rand() - 0.5) * 0.008));
    const ctaClicks = Math.round(engagements * (0.14 + rand() * 0.04));
    const conversions = o.conversions
      ? Math.round(plays * (0.035 + conversionRand() * 0.02))
      : undefined;

    return {
      date,
      impressions,
      viewable,
      plays,
      engagements,
      ctaClicks,
      avgDwell: Math.round((22 + rand() * 12) * 10) / 10,
      uniqueUsers: Math.round(impressions * (0.62 + rand() * 0.08)),
      ...(conversions !== undefined && { conversions }),
    };
  });

  const sum = (k: keyof DailyPoint) => daily.reduce((a, d) => a + (d[k] as number), 0);
  const impressions = sum('impressions');
  const viewable = sum('viewable');
  const engagements = sum('engagements');
  const ctaClicks = sum('ctaClicks');
  const plays = sum('plays');

  const all: Partial<Record<MetricKey, number>> = {
    impressions,
    viewable,
    viewability: impressions ? viewable / impressions : 0,
    plays,
    engagementRate: impressions ? engagements / impressions : 0,
    avgDwell: daily.length ? daily.reduce((a, d) => a + d.avgDwell, 0) / daily.length : 0,
    completionRate: 0.41 + (o.seed % 7) / 100,
    ctaClicks,
    ctr: impressions ? ctaClicks / impressions : 0,
    uniqueUsers: sum('uniqueUsers'),
    conversions: o.conversions ? daily.reduce((a, d) => a + (d.conversions ?? 0), 0) : undefined,
  };

  // Drop anything this platform does not measure, rather than shipping a zero.
  const totals: Partial<Record<MetricKey, number>> = {};
  for (const m of o.measures) totals[m] = all[m];

  return { totals, daily };
}

/** Stand-ins for what sales briefs in Salesforce: the main goal, the
 *  guaranteed floor and the budget (the last two are Klea-internal). The goal
 *  is always a metric the campaign's primary source can measure (ATK stops at
 *  delivery, so its campaigns are briefed on viewability); one campaign is
 *  left un-briefed to exercise the empty state. Targets sit near the seeded
 *  actuals so the portfolio shows a mix of on-target and behind. Replace with
 *  the Salesforce fields once the API provides them. */
function briefFor(
  s: CampaignSeed,
): Pick<Campaign['salesforce'], 'primaryKpi' | 'performanceGuarantee' | 'totalBudget'> {
  if (s.id === 'cmp-za02')
    return { primaryKpi: null, performanceGuarantee: null, totalBudget: null };
  const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;
  let primaryKpi: PrimaryKpi;
  if (s.primarySource === 'atk') primaryKpi = { metric: 'viewability', target: 0.8 };
  else if (s.primarySource === 'custom' && s.seed % 2 === 1)
    primaryKpi = { metric: 'completionRate', target: 0.45 };
  else
    primaryKpi = {
      metric: 'engagementRate',
      target: round(s.engagementRate * (s.seed % 3 === 0 ? 1.08 : 0.94), 3),
    };
  const currency = ['DE', 'FR', 'IT'].includes(s.market) ? 'EUR' : 'CHF';
  return {
    primaryKpi,
    performanceGuarantee: {
      metric: primaryKpi.metric,
      value: round((primaryKpi.target ?? 0) * 0.85, 3),
    },
    // ~CHF 14 per thousand booked impressions, rounded to the nearest 500.
    totalBudget: { amount: Math.round(((s.bookedImpressions / 1000) * 14) / 500) * 500, currency },
  };
}

function buildCampaign(s: CampaignSeed): Campaign {
  const company = companies.find((c) => c.id === s.companyId)!;
  const dates = daysBetween(s.flightStart, s.flightEnd);
  // What the campaign actually ran: all of its flight, or only the days up to
  // the pause for a paused one.
  const ranDates = s.pausedOn ? dates.filter((d) => d <= s.pausedOn!) : dates;
  const rand = rng(s.seed);
  const missing = new Set(s.missingSources ?? []);
  const tracksConversions = s.seed % 2 === 1;

  const mk = (key: SourceKey, bias: number, measures: MetricKey[]): SourceSeries | null => {
    if (missing.has(key)) return null;
    return buildSeries({
      seed: s.seed * 7 + key.length,
      dates: ranDates,
      dailyImpressions: s.dailyImpressions,
      countBias: bias,
      viewability: s.viewability,
      engagementRate: s.engagementRate,
      measures,
      truncateToYesterday: key !== 'custom',
      conversions: tracksConversions,
    });
  };

  const pageLabels = [
    ['start', 'Start screen'],
    ['game', 'Game'],
    ['form', 'Prize form'],
    ['result', 'Result'],
    ['offer', 'Offer page'],
  ];
  let remaining = Math.round(s.dailyImpressions * ranDates.length * s.engagementRate);
  const pages = pageLabels.map(([page, label], i) => {
    const views = remaining;
    const dropoff = i === 0 ? 0.18 : 0.24 + rand() * 0.12;
    remaining = Math.round(views * (1 - dropoff));
    return {
      page,
      label,
      views,
      avgDwell: Math.round((6 + rand() * 14) * 10) / 10,
      exits: views - remaining,
    };
  });

  const ctaSeed = Math.round(s.dailyImpressions * ranDates.length * s.engagementRate * 0.15);
  const ctas = [
    { id: 'cta-primary', label: 'Claim your voucher', destination: '/voucher' },
    { id: 'cta-secondary', label: 'Shop the range', destination: '/shop' },
    { id: 'cta-tertiary', label: 'Terms & conditions', destination: '/terms' },
  ].map((c, i) => {
    const clicks = Math.round(ctaSeed * [0.62, 0.29, 0.09][i]);
    return {
      ...c,
      clicks,
      uniqueClicks: Math.round(clicks * (0.82 + rand() * 0.08)),
      ctr: clicks / (s.dailyImpressions * ranDates.length),
    };
  });

  const totalImp = s.dailyImpressions * ranDates.length;
  // Device mix differs per campaign (mobile-heavy for some, more desktop for
  // others). Drawn from its own seeded generator, so it is fixed between
  // reloads and leaves every other generated number untouched.
  const deviceRand = rng(s.seed * 29 + 7);
  const mobileShare = 0.52 + deviceRand() * 0.36;
  const tabletShare = (1 - mobileShare) * (0.25 + deviceRand() * 0.3);
  const desktopShare = 1 - mobileShare - tabletShare;
  const jitter = (spread: number) => (deviceRand() - 0.5) * spread;
  const devices: Campaign['devices'] = [
    {
      device: 'Mobile',
      impressions: Math.round(totalImp * mobileShare),
      viewability: s.viewability + 0.02 + jitter(0.016),
      engagementRate: s.engagementRate * (1.12 + jitter(0.12)),
    },
    {
      device: 'Tablet',
      impressions: Math.round(totalImp * tabletShare),
      viewability: s.viewability - 0.01 + jitter(0.016),
      engagementRate: s.engagementRate * (0.94 + jitter(0.12)),
    },
    {
      device: 'Desktop',
      impressions: Math.round(totalImp * desktopShare),
      viewability: s.viewability - 0.05 + jitter(0.016),
      engagementRate: s.engagementRate * (0.71 + jitter(0.12)),
    },
  ];

  // Creative breakdown, split out of the richest connected source's own daily
  // series so a creative's days add back up to the campaign's. Engagement and
  // viewability differ by size (the small mobile unit engages best).
  const creativeBase =
    mk('custom', 1.0, SOURCE_DEFINITIONS.custom.measures) ??
    mk('nexd', 1.02, SOURCE_DEFINITIONS.nexd.measures) ??
    mk('atk', 1.06, SOURCE_DEFINITIONS.atk.measures);
  // A campaign mostly runs one mechanic, with one creative on another — so
  // the creatives (not the campaign) carry the mechanic.
  const mainMechanic = MECHANICS[s.seed % MECHANICS.length];
  const otherMechanic = MECHANICS[(s.seed + 3) % MECHANICS.length];
  const CREATIVE_SPECS = [
    { format: '300x250', mechanic: mainMechanic, share: 0.48, engagement: 1.18, viewability: 1.0 },
    { format: '300x600', mechanic: otherMechanic, share: 0.22, engagement: 1.0, viewability: 1.02 },
    { format: '320x480', mechanic: mainMechanic, share: 0.3, engagement: 0.96, viewability: 1.04 },
  ].map((c) => ({ ...c, engagement: c.engagement * (MECHANIC_LIFT[c.mechanic] / 1.1) }));
  const creativeRand = rng(s.seed * 13 + 5);
  const creativeDaily = CREATIVE_SPECS.map((): Campaign['creatives'][number]['daily'] => []);
  for (const d of creativeBase?.daily ?? []) {
    const weights = CREATIVE_SPECS.map((c) => c.share * (0.92 + creativeRand() * 0.16));
    const total = weights.reduce((a, w) => a + w, 0);
    CREATIVE_SPECS.forEach((c, i) => {
      const impressions = Math.round((d.impressions * weights[i]) / total);
      const engagements = Math.round(
        impressions * s.engagementRate * c.engagement * (0.94 + creativeRand() * 0.12),
      );
      creativeDaily[i].push({
        date: d.date,
        impressions,
        viewable: Math.round(
          impressions *
            Math.min(s.viewability * c.viewability + (creativeRand() - 0.5) * 0.04, 0.98),
        ),
        engagements,
        ctaClicks: Math.round(engagements * (0.14 + creativeRand() * 0.04)),
        ...(d.conversions !== undefined && {
          conversions: Math.round((d.conversions * weights[i]) / total),
        }),
      });
    });
  }
  const creatives: Campaign['creatives'] = CREATIVE_SPECS.map((c, i) => {
    const daily = creativeDaily[i];
    const impressions = daily.reduce((a, d) => a + d.impressions, 0);
    const engagements = daily.reduce((a, d) => a + d.engagements, 0);
    return {
      id: `cr-${s.id}-${i}`,
      name: `${c.mechanic} ${c.format}`,
      format: c.format,
      mechanic: c.mechanic,
      impressions,
      engagementRate: impressions ? engagements / impressions : 0,
      avgDwell: Math.round((28 - i * 4 + rand() * 5) * 10) / 10,
      ctaClicks: daily.reduce((a, d) => a + d.ctaClicks, 0),
      daily,
    };
  });

  const campaignTag = `${s.id.replace('cmp-', 'brame_')}_q3`;
  const utmRows: Campaign['utm'] = (
    [
      ['goldbach', 'display', 0.41],
      ['admeira', 'display', 0.27],
      ['ringier', 'display', 0.18],
      ['direct', 'none', 0.14],
    ] as const
  ).map(([source, medium, share]) => ({
    source,
    medium,
    campaign: campaignTag,
    sessions: Math.round(ctaSeed * 2.4 * share),
    ctaClicks: Math.round(ctaSeed * share),
  }));

  return {
    id: s.id,
    salesforceId: s.salesforceId,
    name: s.name,
    companyId: s.companyId,
    companyName: company.name,
    accountId: s.accountId ?? null,
    accountName: s.accountId ? (accounts.find((a) => a.id === s.accountId)?.name ?? null) : null,
    status: s.status,
    primarySource: s.primarySource,
    flightStart: s.flightStart,
    flightEnd: s.flightEnd,
    salesforce: {
      salesPerson: personFor(s.owner),
      campaignManager: personFor(CAMPAIGN_MANAGERS[s.seed % CAMPAIGN_MANAGERS.length]),
      market: s.market,
      category: company.industry,
      bookedImpressions: s.bookedImpressions,
      productLine: s.productLine,
      ...briefFor(s),
      conversionTracking: tracksConversions,
      lastSyncedAt: '2026-10-28T09:12:00+01:00',
    },
    appOwned: {
      campaignTag,
      language: s.language,
      nexdLiveIds: missing.has('nexd') ? [] : [`nx_${s.seed}8842`, `nx_${s.seed}8843`],
      atkPixelMapping: `loadATK/${s.market.toLowerCase()}/${s.id.replace('cmp-', '')}`,
      clicktags: [
        {
          id: `ct-${s.id}-1`,
          label: 'Primary',
          url: 'https://example.com/voucher?utm_source=%%SOURCE%%',
        },
        { id: `ct-${s.id}-2`, label: 'Secondary', url: 'https://example.com/shop' },
      ],
    },
    // Placeholder — `withDelivery` below stands in for the backend's calculation.
    delivery: { health: null, expectedPacing: null },
    sources: {
      // ATK reads high against our own beacon — the discrepancy the Compare
      // overlay exists to explain.
      atk: mk('atk', 1.06, SOURCE_DEFINITIONS.atk.measures),
      nexd: mk('nexd', 1.02, SOURCE_DEFINITIONS.nexd.measures),
      custom: mk('custom', 1.0, SOURCE_DEFINITIONS.custom.measures),
    },
    pages,
    ctas,
    devices,
    creatives,
    utm: utmRows,
  };
}

/**
 * Stand-in for the backend's pacing calculation, so the dummy data shows the
 * real behaviour: delivered share of the booking (the percentage the UI shows)
 * judged against the share of the runtime elapsed today (what colours it).
 * 50% after day 5 of 10 is on track; 50% on day 7 (target 70%) is behind.
 * Replace with the API field; tune the dummy numbers via the seeds above.
 */
function withDelivery(c: Campaign): Campaign {
  const day = 86_400_000;
  const start = new Date(c.flightStart).getTime();
  const end = new Date(c.flightEnd).getTime() + day;
  const elapsed = Math.min(Math.max((TODAY.getTime() - start) / (end - start), 0), 1);
  const delivered = deliveryPacing(c);
  // A paused campaign isn't pacing — it has stopped, so it gets no on-track/behind verdict.
  if (c.status === 'paused') return { ...c, delivery: { health: null, expectedPacing: elapsed || null } };
  if (delivered == null || elapsed === 0)
    return { ...c, delivery: { health: null, expectedPacing: elapsed ? elapsed : null } };
  const ratio = delivered / elapsed;
  const health = ratio >= 0.9 ? 'good' : ratio >= 0.7 ? 'okay' : 'poor';
  return { ...c, delivery: { health, expectedPacing: elapsed } };
}

export const campaigns: Campaign[] = seeds.map(buildCampaign).map(withDelivery);

// ---------------------------------------------------------------------------
// Email reports
//
// Deliberately covers every state the view has to render without manual
// testing: never sent, paused, weekly vs monthly, pdf vs emailBody, and a
// client with more than one report.
// ---------------------------------------------------------------------------

export const emailReports: EmailReport[] = [
  {
    id: 'er-1',
    scope: { level: 'client', companyId: 'c-migros', companyName: 'Migros' },
    name: 'Weekly performance summary',
    recipients: ['petra.lang@migros.ch', 'media-team@migros.ch'],
    metrics: ['impressions', 'ctr', 'viewability'],
    granularity: 'total',
    cadence: 'weekly',
    dayOfWeek: 'mon',
    format: 'email',
    enabled: true,
    lastSentAt: '2026-10-28T08:00:00+01:00',
  },
  {
    id: 'er-2',
    scope: { level: 'client', companyId: 'c-migros', companyName: 'Migros' },
    name: 'Monthly exec rollup',
    recipients: ['ceo-office@migros.ch'],
    metrics: ['impressions', 'ctr', 'viewability', 'engagementRate'],
    granularity: 'total',
    cadence: 'monthly',
    format: 'pdf',
    enabled: true,
    lastSentAt: '2026-09-20T08:00:00+02:00',
  },
  {
    id: 'er-3',
    scope: { level: 'client', companyId: 'c-swisscom', companyName: 'Swisscom' },
    name: 'Weekly delivery snapshot',
    recipients: ['kevin.brandt@swisscom.ch'],
    metrics: ['impressions', 'viewability'],
    granularity: 'daily',
    cadence: 'weekly',
    dayOfWeek: 'fri',
    format: 'email',
    enabled: true,
    // Never sent — the schedule was only just created.
    lastSentAt: null,
  },
  {
    id: 'er-4',
    scope: { level: 'client', companyId: 'c-dm', companyName: 'dm-drogerie markt' },
    name: 'Monthly summary',
    recipients: ['marketing@dm-drogeriemarkt.de'],
    metrics: ['impressions', 'ctr'],
    granularity: 'total',
    cadence: 'monthly',
    format: 'pdf',
    // Paused — dm asked to pause reporting while their campaign was on hold.
    enabled: false,
    lastSentAt: '2026-07-21T08:00:00+02:00',
  },
  {
    id: 'er-5',
    scope: { level: 'client', companyId: 'c-bmw', companyName: 'BMW' },
    name: 'Weekly performance summary',
    recipients: ['thomas.gerber@bmw.de', 'digital-media@bmw.de'],
    metrics: ['impressions', 'ctr', 'engagementRate'],
    granularity: 'total',
    cadence: 'weekly',
    dayOfWeek: 'wed',
    format: 'pdf',
    enabled: true,
    lastSentAt: '2026-10-23T08:00:00+02:00',
  },
  {
    id: 'er-6',
    scope: { level: 'client', companyId: 'c-audi', companyName: 'Audi' },
    name: 'Daily performance summary',
    recipients: ['sarah.mueller@audi.de'],
    metrics: ['impressions', 'ctr', 'viewability'],
    granularity: 'daily',
    cadence: 'daily',
    format: 'email',
    enabled: true,
    lastSentAt: '2026-10-24T08:00:00+02:00',
  },
  {
    id: 'er-7',
    scope: { level: 'client', companyId: 'c-coop', companyName: 'Coop' },
    name: 'Monthly exec rollup',
    recipients: ['marketing-lead@coop.ch', 'ceo-office@coop.ch'],
    metrics: ['impressions', 'ctr', 'engagementRate'],
    granularity: 'total',
    cadence: 'monthly',
    format: 'pdf',
    enabled: true,
    lastSentAt: '2026-09-20T08:00:00+02:00',
  },
  {
    id: 'er-8',
    // Account-level: Goldbach's own rollup across every client they book
    // through us, not any one client's report.
    scope: { level: 'account', accountId: 'ag-goldbach', accountName: 'Goldbach' },
    name: 'Weekly book-wide delivery snapshot',
    recipients: ['ads-team@goldbach.ch'],
    metrics: ['impressions', 'viewability'],
    granularity: 'total',
    cadence: 'weekly',
    dayOfWeek: 'tue',
    format: 'excel',
    // Paused — kept as a saved report Goldbach runs on demand instead.
    enabled: false,
    lastSentAt: '2026-09-02T08:00:00+02:00',
  },
  {
    id: 'er-9',
    // Campaign-level: one flight IKEA wants a daily breakdown on, not
    // rolled into their client-wide summary.
    scope: { level: 'campaign', campaignId: 'cmp-ik01', campaignName: 'IKEA Winterkollektion' },
    name: 'Winterkollektion daily breakdown',
    recipients: ['nordic-media@ikea.com'],
    metrics: ['impressions', 'ctr', 'viewability', 'engagementRate'],
    granularity: 'daily',
    cadence: 'daily',
    format: 'excel',
    enabled: true,
    // Never sent — the schedule was only just created.
    lastSentAt: null,
  },
  {
    id: 'er-10',
    scope: { level: 'client', companyId: 'c-ubs', companyName: 'UBS' },
    name: 'Weekly performance summary',
    recipients: ['digital.marketing@ubs.com', 'brand-team@ubs.com'],
    metrics: ['impressions', 'ctr'],
    granularity: 'total',
    cadence: 'weekly',
    dayOfWeek: 'mon',
    format: 'excel',
    enabled: true,
    lastSentAt: '2026-10-28T08:00:00+01:00',
  },
];

// Salesforce, ATK and NEXD are all pull-based — polled every 4-6 hours,
// a few times a day, never live. Klea's own instrumentation is the only
// live/real-time source and has no sync runs of its own to show here.
export const syncRuns: SyncRun[] = [
  {
    id: 's-1',
    source: 'salesforce',
    startedAt: '2026-10-28T09:12:00+01:00',
    durationMs: 3_140,
    status: 'ok',
    rowsWritten: 8,
    campaignsTouched: 8,
  },
  {
    id: 's-2',
    source: 'atk',
    startedAt: '2026-10-28T04:00:00+01:00',
    durationMs: 84_220,
    status: 'ok',
    rowsWritten: 1_412,
    campaignsTouched: 6,
  },
  {
    id: 's-6',
    source: 'nexd',
    startedAt: '2026-10-28T08:45:00+01:00',
    durationMs: 2_240,
    status: 'failed',
    rowsWritten: 0,
    campaignsTouched: 0,
    note: 'Authentication expired. The NEXD API token needs refreshing.',
  },
  {
    id: 's-3',
    source: 'nexd',
    startedAt: '2026-10-28T04:02:00+01:00',
    durationMs: 41_880,
    status: 'ok',
    rowsWritten: 612,
    campaignsTouched: 3,
    note: '1 campaign has no NEXD live ID configured',
  },
  {
    id: 's-5',
    source: 'atk',
    startedAt: '2026-10-27T22:00:00+01:00',
    durationMs: 81_450,
    status: 'ok',
    rowsWritten: 1_401,
    campaignsTouched: 6,
  },
  {
    id: 's-4',
    source: 'atk',
    startedAt: '2026-10-27T04:00:00+01:00',
    durationMs: 79_010,
    status: 'ok',
    rowsWritten: 1_388,
    campaignsTouched: 6,
  },
];

// ---------------------------------------------------------------------------
// Benchmark pool
//
// Benchmarks are computed from the same campaigns everywhere else in the
// app uses — no separate hidden history. That means small buckets (an
// industry with one company in it) legitimately hit the low-sample floor
// instead of being padded out to look fuller than the underlying data is.
// ---------------------------------------------------------------------------

function projectLiveCampaign(c: Campaign): BenchmarkCampaign | null {
  // Archived campaigns are out of the app's lists, so they stay out of the
  // benchmarks too: every count here can be matched to the Campaigns list.
  if (c.status === 'archived') return null;
  const series = c.sources[c.primarySource];
  const impressions = series?.totals.impressions;
  // No delivered impressions means no flight to benchmark — a campaign
  // that hasn't started is not a zero-performing one.
  if (!series || !impressions) return null;

  const company = companies.find((co) => co.id === c.companyId);
  return {
    id: `bm-live-${c.id}`,
    name: c.name,
    companyId: c.companyId,
    companyName: c.companyName,
    industry: company?.industry ?? 'Other Industries',
    accountId: c.accountId,
    accountName: c.accountName,
    market: c.salesforce.market,
    flightStart: c.flightStart,
    flightEnd: c.flightEnd,
    activeDays: series.daily.filter((d) => d.impressions > 0).length,
    impressions,
    // Absent from a source's totals means that source cannot measure it.
    ctr: series.totals.ctr ?? null,
    viewability: series.totals.viewability ?? null,
    engagementRate: series.totals.engagementRate ?? null,
    ctaClicks: series.totals.ctaClicks ?? null,
    deliveryPacing: deliveryPacing(c),
    deliveryHealth: c.delivery.health,
  };
}

/** A creative's benchmark row, from its own daily counts. */
function projectCreative(c: Campaign, cr: Campaign['creatives'][number]): BenchmarkCreative | null {
  if (!cr.impressions) return null;
  const sum = (k: 'impressions' | 'viewable' | 'engagements' | 'ctaClicks') =>
    cr.daily.reduce((a, d) => a + d[k], 0);
  const impressions = sum('impressions');
  const company = companies.find((co) => co.id === c.companyId);
  return {
    id: `bmc-${cr.id}`,
    campaignId: c.id,
    campaignName: c.name,
    companyId: c.companyId,
    companyName: c.companyName,
    industry: company?.industry ?? 'Other Industries',
    market: c.salesforce.market,
    format: cr.format,
    mechanic: cr.mechanic,
    flightStart: c.flightStart,
    flightEnd: c.flightEnd,
    activeDays: cr.daily.filter((d) => d.impressions > 0).length,
    impressions,
    ctr: impressions ? sum('ctaClicks') / impressions : null,
    viewability: impressions ? sum('viewable') / impressions : null,
    engagementRate: impressions ? sum('engagements') / impressions : null,
  };
}

export const benchmarkPool: BenchmarkCampaign[] = campaigns
  .map(projectLiveCampaign)
  .filter((c): c is BenchmarkCampaign => c !== null);

/** Every creative (size + mechanic) behind the pool — what mechanics are
 *  benchmarked on. */
export const benchmarkCreatives: BenchmarkCreative[] = campaigns
  .filter((c) => c.status !== 'archived')
  .flatMap((c) =>
    c.creatives
      .map((cr) => projectCreative(c, cr))
      .filter((x): x is BenchmarkCreative => x !== null),
  );

// ---------------------------------------------------------------------------
// Inbox events — what the backend would have written for the inbox: finished
// report runs and accepted invitations. Newest events are appended by the
// store as people act (a report run, an accepted invite).
// ---------------------------------------------------------------------------

const memberById = (id: string) => seatMembers.find((m) => m.id === id)!;
const seatNameById = (id: string) => seats.find((s) => s.id === id)?.name ?? '';

export const inboxEvents: InboxEvent[] = [
  ...emailReports
    .filter((r) => r.lastSentAt)
    .map((r): InboxEvent => ({
      id: `ev-report-${r.id}`,
      kind: 'report',
      createdAt: r.lastSentAt!,
      reportId: r.id,
      reportName: r.name,
      recipientCount: r.recipients.length,
      format: r.format,
    })),
  ...[
    { memberId: 'u-2b', at: '2026-10-28T07:03:00+01:00' },
    { memberId: 'u-3b', at: '2026-10-27T16:30:00+01:00' },
    { memberId: 'u-3c', at: '2026-10-22T14:00:00+02:00' },
  ].map(({ memberId, at }): InboxEvent => {
    const m = memberById(memberId);
    return {
      id: `ev-invite-${memberId}`,
      kind: 'invitation',
      createdAt: at,
      seatId: m.seatId,
      seatName: seatNameById(m.seatId),
      memberName: m.name,
      memberEmail: m.email,
    };
  }),
];
