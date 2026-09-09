import { eachDayOfInterval, format } from 'date-fns';
import type {
  Campaign,
  Company,
  CompanyUser,
  DailyPoint,
  DeliveryAttempt,
  MetricKey,
  ReportSchedule,
  SourceKey,
  SourceMeta,
  SourceSeries,
  SyncRun,
} from './types';

// "Today" is pinned so the prototype tells the same story in every demo and the
// nightly-vs-live freshness gap is always visible.
export const TODAY = new Date('2026-09-08T09:20:00+02:00');
// Plain calendar date, not a Date — every use is a "<= cutoff" string
// comparison against other YYYY-MM-DD values. A Date at local midnight would
// convert to the *previous* day once .toISOString() rolls it to UTC, quietly
// truncating nightly sources a day earlier than every "complete through"
// label claims.
export const YESTERDAY_ISO = '2026-09-07';

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
  eachDayOfInterval({ start: new Date(start), end: new Date(end) }).map((d) => format(d, 'yyyy-MM-dd'));

// ---------------------------------------------------------------------------
// Source definitions — the "what each platform measures" split is the reason
// each source gets its own UI instead of one grid with holes in it.
// ---------------------------------------------------------------------------

const ATK_MEASURES: MetricKey[] = [
  'impressions',
  'viewable',
  'viewability',
  'plays',
  'uniqueUsers',
];

const NEXD_MEASURES: MetricKey[] = [
  'impressions',
  'viewable',
  'viewability',
  'engagementRate',
  'avgDwell',
  'ctaClicks',
  'ctr',
];

const CUSTOM_MEASURES: MetricKey[] = [
  'impressions',
  'viewable',
  'viewability',
  'plays',
  'engagementRate',
  'avgDwell',
  'completionRate',
  'ctaClicks',
  'ctr',
  'uniqueUsers',
];

// Metric labels/help text moved to src/lib/translations.ts (metric.*.label /
// metric.*.help) so they follow the language switch — see useMetricText().

export function sourceMeta(campaign: Campaign, key: SourceKey): SourceMeta {
  const base = {
    atk: {
      key: 'atk' as SourceKey,
      label: 'ATK',
      fullLabel: 'ATK (Zeus adserver)',
      cadence: 'nightly' as const,
      measures: ATK_MEASURES,
    },
    nexd: {
      key: 'nexd' as SourceKey,
      label: 'NEXD',
      fullLabel: 'NEXD',
      cadence: 'nightly' as const,
      measures: NEXD_MEASURES,
    },
    custom: {
      key: 'custom' as SourceKey,
      label: 'Brame',
      fullLabel: 'Brame instrumentation',
      cadence: 'live' as const,
      measures: CUSTOM_MEASURES,
    },
  }[key];

  const series = campaign.sources[key];
  return {
    ...base,
    connector: series ? 'connected' : 'not_configured',
    lastSyncedAt: series
      ? base.cadence === 'live'
        ? TODAY.toISOString()
        : '2026-09-08T04:00:00+02:00'
      : null,
  };
}

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
}

function buildSeries(o: SeriesOpts): SourceSeries {
  const rand = rng(o.seed);
  const cutoff = YESTERDAY_ISO;
  const dates = o.truncateToYesterday ? o.dates.filter((d) => d <= cutoff) : o.dates.filter((d) => d <= iso(TODAY));

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

    return {
      date,
      impressions,
      viewable,
      plays,
      engagements,
      ctaClicks,
      avgDwell: Math.round((22 + rand() * 12) * 10) / 10,
      uniqueUsers: Math.round(impressions * (0.62 + rand() * 0.08)),
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
  };

  // Drop anything this platform does not measure, rather than shipping a zero.
  const totals: Partial<Record<MetricKey, number>> = {};
  for (const m of o.measures) totals[m] = all[m];

  return { totals, daily };
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export const companies: Company[] = [
  { id: 'c-migros', name: 'Migros', campaignCount: 4 },
  { id: 'c-swisscom', name: 'Swisscom', campaignCount: 2 },
  { id: 'c-dm', name: 'dm-drogerie markt', campaignCount: 2 },
];

// ---------------------------------------------------------------------------
// Company users — per-company Admin/Viewer roles. lastSeen is mock record
// content (like a log line), not UI chrome, so it stays English regardless
// of the language switch.
// ---------------------------------------------------------------------------

export const users: CompanyUser[] = [
  { id: 'u-1', name: 'Petra Lang', email: 'p.lang@migros.ch', companyId: 'c-migros', role: 'admin', twoFactor: true, lastSeen: 'today, 08:41' },
  { id: 'u-2', name: 'Tobias Frei', email: 't.frei@migros.ch', companyId: 'c-migros', role: 'viewer', twoFactor: false, lastSeen: '3 d ago' },
  { id: 'u-3', name: 'Marc Bühler', email: 'm.buehler@swisscom.com', companyId: 'c-swisscom', role: 'admin', twoFactor: true, lastSeen: 'today, 07:15' },
  { id: 'u-4', name: 'Jana Roth', email: 'j.roth@dm.de', companyId: 'c-dm', role: 'admin', twoFactor: true, lastSeen: 'yesterday' },
  { id: 'u-5', name: 'Nina Weber', email: 'n.weber@dm.de', companyId: 'c-dm', role: 'viewer', twoFactor: false, lastSeen: '2 w ago' },
];

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

interface CampaignSeed {
  id: string;
  salesforceId: string;
  name: string;
  companyId: string;
  status: Campaign['status'];
  primarySource: SourceKey;
  flightStart: string;
  flightEnd: string;
  dailyImpressions: number;
  viewability: number;
  engagementRate: number;
  /** Sources with no connector configured render blank, never zero. */
  missingSources?: SourceKey[];
  owner: string;
  market: string;
  bookedImpressions: number;
  productLine: string;
  language: string;
  seed: number;
}

const seeds: CampaignSeed[] = [
  {
    id: 'cmp-8f21',
    salesforceId: '006Qy00000ALm3aIAB',
    name: 'Migros Cumulus Summer Spin',
    companyId: 'c-migros',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-08-11',
    flightEnd: '2026-09-21',
    dailyImpressions: 240_000,
    viewability: 0.84,
    engagementRate: 0.061,
    owner: 'Petra Lang',
    market: 'CH',
    bookedImpressions: 9_500_000,
    productLine: 'Playable — Spin the Wheel',
    language: 'de-CH',
    seed: 11,
  },
  {
    id: 'cmp-4b07',
    salesforceId: '006Qy00000ALm44IAB',
    name: 'Migros Back-to-School Quiz',
    companyId: 'c-migros',
    status: 'live',
    primarySource: 'custom',
    flightStart: '2026-08-25',
    flightEnd: '2026-09-14',
    dailyImpressions: 96_000,
    viewability: 0.79,
    engagementRate: 0.084,
    missingSources: ['nexd'],
    owner: 'Petra Lang',
    market: 'CH',
    bookedImpressions: 2_200_000,
    productLine: 'Playable — Quiz',
    language: 'de-CH',
    seed: 23,
  },
  {
    id: 'cmp-9c55',
    salesforceId: '006Qy00000ALm51IAB',
    name: 'Swisscom blue Play Memory',
    companyId: 'c-swisscom',
    status: 'live',
    primarySource: 'nexd',
    flightStart: '2026-08-18',
    flightEnd: '2026-09-30',
    dailyImpressions: 158_000,
    viewability: 0.87,
    engagementRate: 0.048,
    owner: 'Marc Bühler',
    market: 'CH',
    bookedImpressions: 6_800_000,
    productLine: 'Playable — Memory',
    language: 'de-CH',
    seed: 37,
  },
  {
    id: 'cmp-2d18',
    salesforceId: '006Qy00000ALm62IAB',
    name: 'dm Adventskalender Teaser',
    companyId: 'c-dm',
    status: 'scheduled',
    primarySource: 'atk',
    flightStart: '2026-11-03',
    flightEnd: '2026-12-24',
    dailyImpressions: 180_000,
    viewability: 0.82,
    engagementRate: 0.07,
    owner: 'Jana Roth',
    market: 'DE',
    bookedImpressions: 12_000_000,
    productLine: 'Playable — Advent Calendar',
    language: 'de-DE',
    seed: 41,
  },
  {
    id: 'cmp-7a93',
    salesforceId: '006Qy00000ALm70IAB',
    name: 'dm Beauty Days Scratch',
    companyId: 'c-dm',
    status: 'ended',
    primarySource: 'atk',
    flightStart: '2026-06-16',
    flightEnd: '2026-07-27',
    dailyImpressions: 205_000,
    viewability: 0.81,
    engagementRate: 0.055,
    owner: 'Jana Roth',
    market: 'DE',
    bookedImpressions: 8_000_000,
    productLine: 'Playable — Scratch Card',
    language: 'de-DE',
    seed: 53,
  },
  {
    id: 'cmp-1e64',
    salesforceId: '006Qy00000ALm88IAB',
    name: 'Migros Bio Week Slider',
    companyId: 'c-migros',
    status: 'ended',
    primarySource: 'custom',
    flightStart: '2026-07-06',
    flightEnd: '2026-08-03',
    dailyImpressions: 74_000,
    viewability: 0.77,
    engagementRate: 0.092,
    owner: 'Petra Lang',
    market: 'CH',
    bookedImpressions: 2_000_000,
    productLine: 'Playable — Slider',
    language: 'fr-CH',
    seed: 67,
  },
  {
    id: 'cmp-5f30',
    salesforceId: '006Qy00000ALm99IAB',
    name: 'Swisscom Fibre Push Runner',
    companyId: 'c-swisscom',
    status: 'ended',
    primarySource: 'atk',
    flightStart: '2026-05-19',
    flightEnd: '2026-06-22',
    dailyImpressions: 132_000,
    viewability: 0.86,
    engagementRate: 0.039,
    owner: 'Marc Bühler',
    market: 'CH',
    bookedImpressions: 4_400_000,
    productLine: 'Playable — Endless Runner',
    language: 'de-CH',
    seed: 79,
  },
  {
    id: 'cmp-3a72',
    salesforceId: '006Qy00000ALmA1IAB',
    name: 'Migros Grill Season (merged in SF)',
    companyId: 'c-migros',
    status: 'archived',
    primarySource: 'atk',
    flightStart: '2026-04-07',
    flightEnd: '2026-05-12',
    dailyImpressions: 61_000,
    viewability: 0.8,
    engagementRate: 0.05,
    owner: 'Petra Lang',
    market: 'CH',
    bookedImpressions: 1_500_000,
    productLine: 'Playable — Spin the Wheel',
    language: 'de-CH',
    seed: 83,
  },
];

function buildCampaign(s: CampaignSeed): Campaign {
  const company = companies.find((c) => c.id === s.companyId)!;
  const dates = daysBetween(s.flightStart, s.flightEnd);
  const rand = rng(s.seed);
  const missing = new Set(s.missingSources ?? []);
  const started = s.flightStart <= iso(TODAY);

  const mk = (key: SourceKey, bias: number, measures: MetricKey[]): SourceSeries | null => {
    if (missing.has(key) || !started) return null;
    return buildSeries({
      seed: s.seed * 7 + key.length,
      dates,
      dailyImpressions: s.dailyImpressions,
      countBias: bias,
      viewability: s.viewability,
      engagementRate: s.engagementRate,
      measures,
      truncateToYesterday: key !== 'custom',
    });
  };

  const pageLabels = [
    ['start', 'Start screen'],
    ['game', 'Game'],
    ['form', 'Prize form'],
    ['result', 'Result'],
    ['offer', 'Offer page'],
  ];
  let remaining = Math.round(s.dailyImpressions * dates.length * s.engagementRate);
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

  const ctaSeed = Math.round(s.dailyImpressions * dates.length * s.engagementRate * 0.15);
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
      ctr: clicks / (s.dailyImpressions * dates.length),
    };
  });

  const totalImp = s.dailyImpressions * dates.length;
  const devices: Campaign['devices'] = [
    { device: 'Mobile', impressions: Math.round(totalImp * 0.74), viewability: s.viewability + 0.02, engagementRate: s.engagementRate * 1.12 },
    { device: 'Tablet', impressions: Math.round(totalImp * 0.11), viewability: s.viewability - 0.01, engagementRate: s.engagementRate * 0.94 },
    { device: 'Desktop', impressions: Math.round(totalImp * 0.15), viewability: s.viewability - 0.05, engagementRate: s.engagementRate * 0.71 },
  ];

  const creatives: Campaign['creatives'] = ['300x250', '320x480', '970x250'].map((format, i) => ({
    id: `cr-${s.id}-${i}`,
    name: `${s.productLine.split('— ')[1] ?? 'Unit'} ${format}`,
    format,
    impressions: Math.round(totalImp * [0.48, 0.37, 0.15][i]),
    engagementRate: s.engagementRate * [1.18, 0.96, 0.62][i],
    avgDwell: Math.round((28 - i * 4 + rand() * 5) * 10) / 10,
    ctaClicks: Math.round(ctaSeed * [0.5, 0.36, 0.14][i]),
  }));

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
    status: s.status,
    primarySource: s.primarySource,
    flightStart: s.flightStart,
    flightEnd: s.flightEnd,
    salesforce: {
      owner: s.owner,
      market: s.market,
      bookedImpressions: s.bookedImpressions,
      productLine: s.productLine,
      lastSyncedAt: '2026-09-08T09:12:00+02:00',
    },
    appOwned: {
      campaignTag,
      language: s.language,
      nexdLiveIds: missing.has('nexd') ? [] : [`nx_${s.seed}8842`, `nx_${s.seed}8843`],
      atkPixelMapping: `loadATK/${s.market.toLowerCase()}/${s.id.replace('cmp-', '')}`,
      clicktags: [
        { id: `ct-${s.id}-1`, label: 'Primary', url: 'https://example.com/voucher?utm_source=%%SOURCE%%' },
        { id: `ct-${s.id}-2`, label: 'Secondary', url: 'https://example.com/shop' },
      ],
    },
    sources: {
      // ATK reads high against our own beacon — the discrepancy the Compare
      // overlay exists to explain.
      atk: mk('atk', 1.06, ATK_MEASURES),
      nexd: mk('nexd', 1.02, NEXD_MEASURES),
      custom: mk('custom', 1.0, CUSTOM_MEASURES),
    },
    pages,
    ctas,
    devices,
    creatives,
    utm: utmRows,
  };
}

export const campaigns: Campaign[] = seeds.map(buildCampaign);

// ---------------------------------------------------------------------------
// Scheduled client reports + delivery log
// ---------------------------------------------------------------------------

export const schedules: ReportSchedule[] = [
  {
    id: 'sch-1',
    companyId: 'c-migros',
    companyName: 'Migros',
    endpoint: 'https://reporting.migros.ch/hooks/brame',
    cron: '0 8 * * 1',
    humanSchedule: 'Mondays, 08:00',
    timezone: 'Europe/Zurich',
    enabled: true,
  },
  {
    id: 'sch-2',
    companyId: 'c-swisscom',
    companyName: 'Swisscom',
    endpoint: 'https://api.swisscom.com/media/ingest/brame',
    cron: '0 7 * * 1-5',
    humanSchedule: 'Weekdays, 07:00',
    timezone: 'Europe/Zurich',
    enabled: true,
  },
  {
    id: 'sch-3',
    companyId: 'c-dm',
    companyName: 'dm-drogerie markt',
    endpoint: 'https://dm-media.de/partner/brame/weekly',
    cron: '0 6 1 * *',
    humanSchedule: '1st of the month, 06:00',
    timezone: 'Europe/Berlin',
    enabled: false,
  },
];

export const deliveries: DeliveryAttempt[] = [
  { id: 'd-1', scheduleId: 'sch-2', companyName: 'Swisscom', sentAt: '2026-09-08T07:00:04+02:00', status: 'acknowledged', attempts: 1, httpStatus: 200, durationMs: 412 },
  { id: 'd-2', scheduleId: 'sch-1', companyName: 'Migros', sentAt: '2026-09-08T08:00:02+02:00', status: 'retrying', attempts: 3, httpStatus: 503, durationMs: 30_012 },
  { id: 'd-3', scheduleId: 'sch-2', companyName: 'Swisscom', sentAt: '2026-09-05T07:00:03+02:00', status: 'acknowledged', attempts: 1, httpStatus: 200, durationMs: 388 },
  { id: 'd-4', scheduleId: 'sch-1', companyName: 'Migros', sentAt: '2026-09-01T08:00:05+02:00', status: 'acknowledged', attempts: 2, httpStatus: 200, durationMs: 1_204 },
  { id: 'd-5', scheduleId: 'sch-3', companyName: 'dm-drogerie markt', sentAt: '2026-08-01T06:00:01+02:00', status: 'failed', attempts: 6, httpStatus: 401, durationMs: 220 },
];

export const syncRuns: SyncRun[] = [
  { id: 's-1', source: 'salesforce', startedAt: '2026-09-08T09:12:00+02:00', durationMs: 3_140, status: 'ok', rowsWritten: 8, campaignsTouched: 8 },
  { id: 's-2', source: 'atk', startedAt: '2026-09-08T04:00:00+02:00', durationMs: 84_220, status: 'ok', rowsWritten: 1_412, campaignsTouched: 6 },
  { id: 's-3', source: 'nexd', startedAt: '2026-09-08T04:02:00+02:00', durationMs: 41_880, status: 'partial', rowsWritten: 612, campaignsTouched: 3, note: '1 campaign has no NEXD live ID configured' },
  { id: 's-4', source: 'atk', startedAt: '2026-09-07T04:00:00+02:00', durationMs: 79_010, status: 'ok', rowsWritten: 1_388, campaignsTouched: 6 },
];

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export const fmtInt = (n: number) => Math.round(n).toLocaleString('de-CH').replace(/’/g, "'");

export const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return `${Math.round(n)}`;
};

export const fmtPct = (n: number, decimals = 1) => `${(n * 100).toFixed(decimals)}%`;

export const fmtSeconds = (n: number) => `${n.toFixed(1)}s`;

export function fmtMetric(metric: MetricKey, value: number | undefined): string {
  if (value == null) return '—';
  switch (metric) {
    case 'viewability':
    case 'engagementRate':
    case 'completionRate':
      return fmtPct(value);
    case 'ctr':
      return fmtPct(value, 2);
    case 'avgDwell':
      return fmtSeconds(value);
    default:
      return fmtCompact(value);
  }
}

// Date/time/relative-time formatting is locale-aware and lives in
// src/lib/i18n.tsx (useFormatters()) so it reacts to the language switch.
