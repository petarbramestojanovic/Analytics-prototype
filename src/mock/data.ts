import { eachDayOfInterval, format } from 'date-fns';
import type {
  BenchmarkCampaign,
  Campaign,
  Company,
  CompanyUser,
  DailyPoint,
  EmailReport,
  MetricKey,
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

/** Industries follow the KPI platform's live taxonomy (11 categories, after the
 *  2026-06 migrations re-added Food Retail alongside a narrowed Retail). */
export const companies: Company[] = [
  { id: 'c-migros', name: 'Migros', campaignCount: 4, industry: 'Food Retail' },
  { id: 'c-swisscom', name: 'Swisscom', campaignCount: 2, industry: 'Tech-Telco' },
  { id: 'c-dm', name: 'dm-drogerie markt', campaignCount: 2, industry: 'Retail' },
  { id: 'c-bmw', name: 'BMW', campaignCount: 2, industry: 'Automotive' },
  { id: 'c-audi', name: 'Audi', campaignCount: 2, industry: 'Automotive' },
  { id: 'c-coop', name: 'Coop', campaignCount: 2, industry: 'Food Retail' },
  { id: 'c-lidl', name: 'Lidl', campaignCount: 2, industry: 'Food Retail' },
  { id: 'c-denner', name: 'Denner', campaignCount: 2, industry: 'Food Retail' },
  { id: 'c-mediamarkt', name: 'MediaMarkt', campaignCount: 2, industry: 'Technical Appliances' },
  { id: 'c-ikea', name: 'IKEA', campaignCount: 2, industry: 'Retail' },
  { id: 'c-manor', name: 'Manor', campaignCount: 2, industry: 'Retail' },
  { id: 'c-ubs', name: 'UBS', campaignCount: 2, industry: 'Finance & Insurance' },
  { id: 'c-swisslife', name: 'Swiss Life', campaignCount: 2, industry: 'Finance & Insurance' },
  { id: 'c-nestle', name: 'Nestlé', campaignCount: 2, industry: 'FMCG / CPG' },
  { id: 'c-zalando', name: 'Zalando', campaignCount: 2, industry: 'eCommerce' },
];

// ---------------------------------------------------------------------------
// Company users — per-company Admin/Viewer roles. lastSeen is mock record
// content (like a log line), not UI chrome, so it stays English regardless
// of the language switch.
// ---------------------------------------------------------------------------

export const users: CompanyUser[] = [
  { id: 'u-1', name: 'Petra Lang', email: 'p.lang@migros.ch', companyId: 'c-migros', role: 'admin', twoFactor: true, lastSeen: 'today, 08:41' },
  { id: 'u-2', name: 'Tobias Frei', email: 't.frei@migros.ch', companyId: 'c-migros', role: 'viewer', twoFactor: false, lastSeen: '3 d ago' },
  { id: 'u-2b', name: 'Corinne Hess', email: 'c.hess@migros.ch', companyId: 'c-migros', role: 'viewer', twoFactor: true, lastSeen: 'today, 10:03' },

  { id: 'u-3', name: 'Marc Bühler', email: 'm.buehler@swisscom.com', companyId: 'c-swisscom', role: 'admin', twoFactor: true, lastSeen: 'today, 07:15' },
  { id: 'u-3b', name: 'Sandra Keller', email: 's.keller@swisscom.com', companyId: 'c-swisscom', role: 'viewer', twoFactor: true, lastSeen: 'yesterday' },
  { id: 'u-3c', name: 'Dominik Wyss', email: 'd.wyss@swisscom.com', companyId: 'c-swisscom', role: 'viewer', twoFactor: false, lastSeen: '6 d ago' },

  { id: 'u-4', name: 'Jana Roth', email: 'j.roth@dm.de', companyId: 'c-dm', role: 'admin', twoFactor: true, lastSeen: 'yesterday' },
  { id: 'u-5', name: 'Nina Weber', email: 'n.weber@dm.de', companyId: 'c-dm', role: 'viewer', twoFactor: false, lastSeen: '2 w ago' },
  { id: 'u-5b', name: 'Lukas Franke', email: 'l.franke@dm.de', companyId: 'c-dm', role: 'viewer', twoFactor: true, lastSeen: 'today, 09:30' },

  { id: 'u-6', name: 'Sebastian Kohl', email: 's.kohl@bmw.de', companyId: 'c-bmw', role: 'admin', twoFactor: true, lastSeen: 'today, 09:02' },
  { id: 'u-6b', name: 'Miriam Voss', email: 'm.voss@bmw.de', companyId: 'c-bmw', role: 'viewer', twoFactor: true, lastSeen: '2 d ago' },
  { id: 'u-6c', name: 'Jonas Peters', email: 'j.peters@bmw.de', companyId: 'c-bmw', role: 'viewer', twoFactor: false, lastSeen: '1 w ago' },

  { id: 'u-7', name: 'Laura Dietrich', email: 'l.dietrich@audi.de', companyId: 'c-audi', role: 'admin', twoFactor: true, lastSeen: 'yesterday' },
  { id: 'u-7b', name: 'Felix Arnold', email: 'f.arnold@audi.de', companyId: 'c-audi', role: 'viewer', twoFactor: false, lastSeen: '4 d ago' },

  { id: 'u-8', name: 'Fabienne Moser', email: 'f.moser@coop.ch', companyId: 'c-coop', role: 'admin', twoFactor: true, lastSeen: 'today, 08:12' },
  { id: 'u-8b', name: 'Yvonne Leu', email: 'y.leu@coop.ch', companyId: 'c-coop', role: 'viewer', twoFactor: true, lastSeen: 'today, 11:20' },
  { id: 'u-8c', name: 'Reto Zimmermann', email: 'r.zimmermann@coop.ch', companyId: 'c-coop', role: 'viewer', twoFactor: false, lastSeen: '3 d ago' },

  { id: 'u-9', name: 'Kevin Brandt', email: 'k.brandt@lidl.ch', companyId: 'c-lidl', role: 'admin', twoFactor: false, lastSeen: '4 d ago' },
  { id: 'u-9b', name: 'Melanie Frei', email: 'm.frei@lidl.ch', companyId: 'c-lidl', role: 'viewer', twoFactor: true, lastSeen: 'today, 07:58' },

  { id: 'u-10', name: 'Anja Steiner', email: 'a.steiner@denner.ch', companyId: 'c-denner', role: 'admin', twoFactor: true, lastSeen: '1 w ago' },
  { id: 'u-10b', name: 'Simon Baumann', email: 's.baumann@denner.ch', companyId: 'c-denner', role: 'viewer', twoFactor: false, lastSeen: '2 w ago' },
  { id: 'u-10c', name: 'Elena Marti', email: 'e.marti@denner.ch', companyId: 'c-denner', role: 'viewer', twoFactor: true, lastSeen: 'yesterday' },

  { id: 'u-11', name: 'Ralf Huber', email: 'r.huber@mediamarkt.ch', companyId: 'c-mediamarkt', role: 'admin', twoFactor: true, lastSeen: 'today, 07:44' },
  { id: 'u-11b', name: 'Nadine Schoch', email: 'n.schoch@mediamarkt.ch', companyId: 'c-mediamarkt', role: 'viewer', twoFactor: true, lastSeen: 'today, 08:05' },

  { id: 'u-12', name: 'Sofia Berg', email: 's.berg@ikea.com', companyId: 'c-ikea', role: 'admin', twoFactor: false, lastSeen: '2 d ago' },
  { id: 'u-12b', name: 'Erik Lindqvist', email: 'e.lindqvist@ikea.com', companyId: 'c-ikea', role: 'viewer', twoFactor: true, lastSeen: '5 d ago' },
  { id: 'u-12c', name: 'Maja Holm', email: 'm.holm@ikea.com', companyId: 'c-ikea', role: 'viewer', twoFactor: false, lastSeen: '1 w ago' },

  { id: 'u-13', name: 'Thomas Gerber', email: 't.gerber@manor.ch', companyId: 'c-manor', role: 'admin', twoFactor: true, lastSeen: 'yesterday' },
  { id: 'u-13b', name: 'Céline Rey', email: 'c.rey@manor.ch', companyId: 'c-manor', role: 'viewer', twoFactor: true, lastSeen: 'today, 09:47' },

  { id: 'u-14', name: 'Isabelle Meyer', email: 'i.meyer@ubs.com', companyId: 'c-ubs', role: 'admin', twoFactor: true, lastSeen: 'today, 08:55' },
  { id: 'u-14b', name: 'Andreas Kunz', email: 'a.kunz@ubs.com', companyId: 'c-ubs', role: 'viewer', twoFactor: true, lastSeen: '2 d ago' },
  { id: 'u-14c', name: 'Vera Stucki', email: 'v.stucki@ubs.com', companyId: 'c-ubs', role: 'viewer', twoFactor: true, lastSeen: '4 d ago' },

  { id: 'u-15', name: 'Daniel Egger', email: 'd.egger@swisslife.ch', companyId: 'c-swisslife', role: 'admin', twoFactor: true, lastSeen: '3 d ago' },
  { id: 'u-15b', name: 'Larissa Good', email: 'l.good@swisslife.ch', companyId: 'c-swisslife', role: 'viewer', twoFactor: false, lastSeen: '1 w ago' },

  { id: 'u-16', name: 'Chiara Rossi', email: 'c.rossi@nestle.com', companyId: 'c-nestle', role: 'admin', twoFactor: true, lastSeen: 'today, 06:30' },
  { id: 'u-16b', name: 'Marco Bianchi', email: 'm.bianchi@nestle.com', companyId: 'c-nestle', role: 'viewer', twoFactor: true, lastSeen: 'today, 07:10' },
  { id: 'u-16c', name: 'Giulia Conti', email: 'g.conti@nestle.com', companyId: 'c-nestle', role: 'viewer', twoFactor: false, lastSeen: '3 d ago' },

  { id: 'u-17', name: 'Peter Vogel', email: 'p.vogel@zalando.de', companyId: 'c-zalando', role: 'viewer', twoFactor: false, lastSeen: '5 d ago' },
  { id: 'u-17b', name: 'Katharina Sommer', email: 'k.sommer@zalando.de', companyId: 'c-zalando', role: 'admin', twoFactor: true, lastSeen: 'today, 08:22' },
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
    market: 'AT',
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
    market: 'FR',
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
    market: 'IT',
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
    market: 'AT',
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
  {
    id: 'cmp-bm01',
    salesforceId: '006Qy00000ALmB1IAB',
    name: 'BMW Winter Test Drive Quiz',
    companyId: 'c-bmw',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-08-20',
    flightEnd: '2026-10-05',
    dailyImpressions: 92_000,
    viewability: 0.83,
    engagementRate: 0.052,
    owner: 'Sebastian Kohl',
    market: 'DE',
    bookedImpressions: 4_800_000,
    productLine: 'Playable — Quiz',
    language: 'de-DE',
    seed: 101,
  },
  {
    id: 'cmp-bm02',
    salesforceId: '006Qy00000ALmB2IAB',
    name: 'BMW i-Series Configurator Spin',
    companyId: 'c-bmw',
    status: 'scheduled',
    primarySource: 'nexd',
    flightStart: '2026-10-15',
    flightEnd: '2026-11-30',
    dailyImpressions: 78_000,
    viewability: 0.85,
    engagementRate: 0.047,
    owner: 'Sebastian Kohl',
    market: 'AT',
    bookedImpressions: 3_200_000,
    productLine: 'Playable — Spin the Wheel',
    language: 'de-DE',
    seed: 103,
  },
  {
    id: 'cmp-au01',
    salesforceId: '006Qy00000ALmC1IAB',
    name: 'Audi e-tron Awareness Memory',
    companyId: 'c-audi',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-08-05',
    flightEnd: '2026-09-25',
    dailyImpressions: 84_000,
    viewability: 0.82,
    engagementRate: 0.049,
    owner: 'Laura Dietrich',
    market: 'DE',
    bookedImpressions: 3_900_000,
    productLine: 'Playable — Memory',
    language: 'de-DE',
    seed: 107,
  },
  {
    id: 'cmp-au02',
    salesforceId: '006Qy00000ALmC2IAB',
    name: 'Audi Q6 Launch Scratch Card',
    companyId: 'c-audi',
    status: 'ended',
    primarySource: 'custom',
    flightStart: '2026-05-10',
    flightEnd: '2026-06-14',
    dailyImpressions: 66_000,
    viewability: 0.8,
    engagementRate: 0.058,
    owner: 'Laura Dietrich',
    market: 'FR',
    bookedImpressions: 2_400_000,
    productLine: 'Playable — Scratch Card',
    language: 'de-DE',
    seed: 109,
  },
  {
    id: 'cmp-co01',
    salesforceId: '006Qy00000ALmD1IAB',
    name: 'Coop Prix Garantie Spin',
    companyId: 'c-coop',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-08-15',
    flightEnd: '2026-10-31',
    dailyImpressions: 118_000,
    viewability: 0.75,
    engagementRate: 0.044,
    owner: 'Fabienne Moser',
    market: 'CH',
    bookedImpressions: 6_100_000,
    productLine: 'Playable — Spin the Wheel',
    language: 'fr-CH',
    seed: 113,
  },
  {
    id: 'cmp-co02',
    salesforceId: '006Qy00000ALmD2IAB',
    name: 'Coop Building Bloqx Quiz',
    companyId: 'c-coop',
    status: 'ended',
    primarySource: 'nexd',
    flightStart: '2026-04-01',
    flightEnd: '2026-05-15',
    dailyImpressions: 94_000,
    viewability: 0.73,
    engagementRate: 0.05,
    owner: 'Fabienne Moser',
    market: 'FR',
    bookedImpressions: 3_800_000,
    productLine: 'Playable — Quiz',
    language: 'de-CH',
    seed: 127,
  },
  {
    id: 'cmp-li01',
    salesforceId: '006Qy00000ALmE1IAB',
    name: 'Lidl Schweiz Anniversary Scratch',
    companyId: 'c-lidl',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-08-01',
    flightEnd: '2026-09-30',
    dailyImpressions: 102_000,
    viewability: 0.71,
    engagementRate: 0.046,
    owner: 'Kevin Brandt',
    market: 'CH',
    bookedImpressions: 5_200_000,
    productLine: 'Playable — Scratch Card',
    language: 'de-CH',
    seed: 131,
  },
  {
    id: 'cmp-li02',
    salesforceId: '006Qy00000ALmE2IAB',
    name: 'Lidl Fresh Week Slider',
    companyId: 'c-lidl',
    status: 'archived',
    primarySource: 'atk',
    flightStart: '2026-03-10',
    flightEnd: '2026-04-14',
    dailyImpressions: 61_000,
    viewability: 0.68,
    engagementRate: 0.041,
    owner: 'Kevin Brandt',
    market: 'DE',
    bookedImpressions: 2_100_000,
    productLine: 'Playable — Slider',
    language: 'fr-CH',
    seed: 137,
  },
  {
    id: 'cmp-de01',
    salesforceId: '006Qy00000ALmF1IAB',
    name: 'Denner Frische-Offensive Runner',
    companyId: 'c-denner',
    status: 'live',
    primarySource: 'custom',
    flightStart: '2026-08-10',
    flightEnd: '2026-10-20',
    dailyImpressions: 58_000,
    viewability: 0.7,
    engagementRate: 0.06,
    owner: 'Anja Steiner',
    market: 'CH',
    bookedImpressions: 2_600_000,
    productLine: 'Playable — Endless Runner',
    language: 'de-CH',
    seed: 139,
  },
  {
    id: 'cmp-de02',
    salesforceId: '006Qy00000ALmF2IAB',
    name: 'Denner Weinwochen Quiz',
    companyId: 'c-denner',
    status: 'ended',
    primarySource: 'atk',
    flightStart: '2026-02-01',
    flightEnd: '2026-03-08',
    dailyImpressions: 44_000,
    viewability: 0.69,
    engagementRate: 0.055,
    owner: 'Anja Steiner',
    market: 'IT',
    bookedImpressions: 1_600_000,
    productLine: 'Playable — Quiz',
    language: 'de-CH',
    seed: 149,
  },
  {
    id: 'cmp-mm01',
    salesforceId: '006Qy00000ALmG1IAB',
    name: 'MediaMarkt Black Friday Spin',
    companyId: 'c-mediamarkt',
    status: 'scheduled',
    primarySource: 'atk',
    flightStart: '2026-11-10',
    flightEnd: '2026-11-30',
    dailyImpressions: 145_000,
    viewability: 0.91,
    engagementRate: 0.038,
    owner: 'Ralf Huber',
    market: 'CH',
    bookedImpressions: 5_900_000,
    productLine: 'Playable — Spin the Wheel',
    language: 'de-CH',
    seed: 151,
  },
  {
    id: 'cmp-mm02',
    salesforceId: '006Qy00000ALmG2IAB',
    name: 'MediaMarkt Gaming Week Memory',
    companyId: 'c-mediamarkt',
    status: 'ended',
    primarySource: 'nexd',
    flightStart: '2026-06-01',
    flightEnd: '2026-06-21',
    dailyImpressions: 89_000,
    viewability: 0.9,
    engagementRate: 0.041,
    owner: 'Ralf Huber',
    market: 'DE',
    bookedImpressions: 2_800_000,
    productLine: 'Playable — Memory',
    language: 'de-CH',
    seed: 157,
  },
  {
    id: 'cmp-ik01',
    salesforceId: '006Qy00000ALmH1IAB',
    name: 'IKEA Winterkollektion Slider',
    companyId: 'c-ikea',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-08-25',
    flightEnd: '2026-12-15',
    dailyImpressions: 39_000,
    viewability: 0.89,
    engagementRate: 0.065,
    owner: 'Sofia Berg',
    market: 'CH',
    bookedImpressions: 4_100_000,
    productLine: 'Playable — Slider',
    language: 'de-CH',
    seed: 163,
  },
  {
    id: 'cmp-ik02',
    salesforceId: '006Qy00000ALmH2IAB',
    name: 'IKEA Small Space Quiz',
    companyId: 'c-ikea',
    status: 'ended',
    primarySource: 'custom',
    flightStart: '2026-04-15',
    flightEnd: '2026-05-30',
    dailyImpressions: 31_000,
    viewability: 0.88,
    engagementRate: 0.072,
    owner: 'Sofia Berg',
    market: 'GB',
    bookedImpressions: 1_400_000,
    productLine: 'Playable — Quiz',
    language: 'fr-CH',
    seed: 167,
  },
  {
    id: 'cmp-ma01',
    salesforceId: '006Qy00000ALmI1IAB',
    name: 'Manor Holiday Season Scratch',
    companyId: 'c-manor',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-08-30',
    flightEnd: '2026-11-20',
    dailyImpressions: 47_000,
    viewability: 0.9,
    engagementRate: 0.058,
    owner: 'Thomas Gerber',
    market: 'CH',
    bookedImpressions: 2_300_000,
    productLine: 'Playable — Scratch Card',
    language: 'fr-CH',
    seed: 173,
  },
  {
    id: 'cmp-ma02',
    salesforceId: '006Qy00000ALmI2IAB',
    name: 'Manor Beauty Fest Spin',
    companyId: 'c-manor',
    status: 'archived',
    primarySource: 'atk',
    flightStart: '2026-01-15',
    flightEnd: '2026-02-20',
    dailyImpressions: 36_000,
    viewability: 0.88,
    engagementRate: 0.051,
    owner: 'Thomas Gerber',
    market: 'FR',
    bookedImpressions: 1_100_000,
    productLine: 'Playable — Spin the Wheel',
    language: 'de-CH',
    seed: 179,
  },
  {
    id: 'cmp-ub01',
    salesforceId: '006Qy00000ALmJ1IAB',
    name: 'UBS Vorsorge 2026 Quiz',
    companyId: 'c-ubs',
    status: 'live',
    primarySource: 'nexd',
    flightStart: '2026-08-01',
    flightEnd: '2026-10-31',
    dailyImpressions: 21_000,
    viewability: 0.87,
    engagementRate: 0.033,
    owner: 'Isabelle Meyer',
    market: 'CH',
    bookedImpressions: 1_900_000,
    productLine: 'Playable — Quiz',
    language: 'de-CH',
    seed: 181,
  },
  {
    id: 'cmp-ub02',
    salesforceId: '006Qy00000ALmJ2IAB',
    name: 'UBS Digital Banking Memory',
    companyId: 'c-ubs',
    status: 'ended',
    primarySource: 'atk',
    flightStart: '2026-03-01',
    flightEnd: '2026-04-05',
    dailyImpressions: 18_000,
    viewability: 0.86,
    engagementRate: 0.03,
    owner: 'Isabelle Meyer',
    market: 'GB',
    bookedImpressions: 900_000,
    productLine: 'Playable — Memory',
    language: 'de-CH',
    seed: 191,
  },
  {
    id: 'cmp-sl01',
    salesforceId: '006Qy00000ALmK1IAB',
    name: 'Swiss Life Pensionsberatung Spin',
    companyId: 'c-swisslife',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-08-18',
    flightEnd: '2026-11-15',
    dailyImpressions: 19_000,
    viewability: 0.86,
    engagementRate: 0.036,
    owner: 'Daniel Egger',
    market: 'CH',
    bookedImpressions: 1_700_000,
    productLine: 'Playable — Spin the Wheel',
    language: 'de-CH',
    seed: 197,
  },
  {
    id: 'cmp-sl02',
    salesforceId: '006Qy00000ALmK2IAB',
    name: 'Swiss Life Family Planning Quiz',
    companyId: 'c-swisslife',
    status: 'scheduled',
    primarySource: 'custom',
    flightStart: '2026-11-01',
    flightEnd: '2026-12-15',
    dailyImpressions: 16_000,
    viewability: 0.85,
    engagementRate: 0.042,
    owner: 'Daniel Egger',
    market: 'AT',
    bookedImpressions: 1_200_000,
    productLine: 'Playable — Quiz',
    language: 'fr-CH',
    seed: 199,
  },
  {
    id: 'cmp-ne01',
    salesforceId: '006Qy00000ALmL1IAB',
    name: 'Nestlé KitKat Break Slider',
    companyId: 'c-nestle',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-08-12',
    flightEnd: '2026-10-10',
    dailyImpressions: 128_000,
    viewability: 0.79,
    engagementRate: 0.048,
    owner: 'Chiara Rossi',
    market: 'CH',
    bookedImpressions: 6_500_000,
    productLine: 'Playable — Slider',
    language: 'de-CH',
    seed: 211,
  },
  {
    id: 'cmp-ne02',
    salesforceId: '006Qy00000ALmL2IAB',
    name: 'Nestlé Nespresso Memory',
    companyId: 'c-nestle',
    status: 'ended',
    primarySource: 'nexd',
    flightStart: '2026-05-01',
    flightEnd: '2026-06-10',
    dailyImpressions: 71_000,
    viewability: 0.78,
    engagementRate: 0.053,
    owner: 'Chiara Rossi',
    market: 'FR',
    bookedImpressions: 3_100_000,
    productLine: 'Playable — Memory',
    language: 'fr-CH',
    seed: 223,
  },
  {
    id: 'cmp-za01',
    salesforceId: '006Qy00000ALmM1IAB',
    name: 'Zalando Autumn Drop Scratch',
    companyId: 'c-zalando',
    status: 'live',
    primarySource: 'custom',
    flightStart: '2026-08-22',
    flightEnd: '2026-10-01',
    dailyImpressions: 112_000,
    viewability: 0.81,
    engagementRate: 0.07,
    owner: 'Peter Vogel',
    market: 'DE',
    bookedImpressions: 4_600_000,
    productLine: 'Playable — Scratch Card',
    language: 'de-DE',
    seed: 227,
  },
  {
    id: 'cmp-za02',
    salesforceId: '006Qy00000ALmM2IAB',
    name: 'Zalando Sneaker Drop Spin',
    companyId: 'c-zalando',
    status: 'ended',
    primarySource: 'atk',
    flightStart: '2026-04-20',
    flightEnd: '2026-05-25',
    dailyImpressions: 96_000,
    viewability: 0.8,
    engagementRate: 0.064,
    owner: 'Peter Vogel',
    market: 'GB',
    bookedImpressions: 3_500_000,
    productLine: 'Playable — Spin the Wheel',
    language: 'de-DE',
    seed: 233,
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
// Email reports
//
// Deliberately covers every state the view has to render without manual
// testing: never sent, paused, weekly vs monthly, pdf vs emailBody, and a
// client with more than one report.
// ---------------------------------------------------------------------------


export const emailReports: EmailReport[] = [
  {
    id: 'er-1',
    companyId: 'c-migros',
    companyName: 'Migros',
    name: 'Weekly performance summary',
    recipients: ['petra.lang@migros.ch', 'media-team@migros.ch'],
    metrics: ['impressions', 'ctr', 'viewability'],
    cadence: 'weekly',
    dayOfWeek: 'mon',
    format: 'emailBody',
    enabled: true,
    lastSentAt: '2026-09-08T08:00:00+02:00',
  },
  {
    id: 'er-2',
    companyId: 'c-migros',
    companyName: 'Migros',
    name: 'Monthly exec rollup',
    recipients: ['ceo-office@migros.ch'],
    metrics: ['impressions', 'ctr', 'viewability', 'engagementRate'],
    cadence: 'monthly',
    format: 'pdf',
    enabled: true,
    lastSentAt: '2026-08-01T08:00:00+02:00',
  },
  {
    id: 'er-3',
    companyId: 'c-swisscom',
    companyName: 'Swisscom',
    name: 'Weekly delivery snapshot',
    recipients: ['kevin.brandt@swisscom.ch'],
    metrics: ['impressions', 'viewability'],
    cadence: 'weekly',
    dayOfWeek: 'fri',
    format: 'emailBody',
    enabled: true,
    // Never sent — the schedule was only just created.
    lastSentAt: null,
  },
  {
    id: 'er-4',
    companyId: 'c-dm',
    companyName: 'dm-drogerie markt',
    name: 'Monthly summary',
    recipients: ['marketing@dm-drogeriemarkt.de'],
    metrics: ['impressions', 'ctr'],
    cadence: 'monthly',
    format: 'pdf',
    // Paused — dm asked to pause reporting while their campaign was on hold.
    enabled: false,
    lastSentAt: '2026-06-01T08:00:00+02:00',
  },
  {
    id: 'er-5',
    companyId: 'c-bmw',
    companyName: 'BMW',
    name: 'Weekly performance summary',
    recipients: ['thomas.gerber@bmw.de', 'digital-media@bmw.de'],
    metrics: ['impressions', 'ctr', 'engagementRate'],
    cadence: 'weekly',
    dayOfWeek: 'wed',
    format: 'pdf',
    enabled: true,
    lastSentAt: '2026-09-03T08:00:00+02:00',
  },
];

export const syncRuns: SyncRun[] = [
  { id: 's-1', source: 'salesforce', startedAt: '2026-09-08T09:12:00+02:00', durationMs: 3_140, status: 'ok', rowsWritten: 8, campaignsTouched: 8 },
  { id: 's-2', source: 'atk', startedAt: '2026-09-08T04:00:00+02:00', durationMs: 84_220, status: 'ok', rowsWritten: 1_412, campaignsTouched: 6 },
  { id: 's-3', source: 'nexd', startedAt: '2026-09-08T04:02:00+02:00', durationMs: 41_880, status: 'partial', rowsWritten: 612, campaignsTouched: 3, note: '1 campaign has no NEXD live ID configured' },
  { id: 's-4', source: 'atk', startedAt: '2026-09-07T04:00:00+02:00', durationMs: 79_010, status: 'ok', rowsWritten: 1_388, campaignsTouched: 6 },
];

// ---------------------------------------------------------------------------
// Benchmark pool
//
// Benchmarks are computed from the same ~30 campaigns everywhere else in the
// app uses — no separate synthetic history. That means small buckets (an
// industry with one company in it) legitimately hit the low-sample floor
// instead of being padded out to look fuller than the underlying data is.
// ---------------------------------------------------------------------------

function projectLiveCampaign(c: Campaign): BenchmarkCampaign | null {
  const series = c.sources[c.primarySource];
  const impressions = series?.totals.impressions;
  // No delivered impressions means no flight to benchmark — a scheduled
  // campaign is not a zero-performing one.
  if (!series || !impressions) return null;

  const company = companies.find((co) => co.id === c.companyId);
  return {
    id: `bm-live-${c.id}`,
    name: c.name,
    companyId: c.companyId,
    companyName: c.companyName,
    industry: company?.industry ?? 'Other Industries',
    market: c.salesforce.market,
    flightStart: c.flightStart,
    flightEnd: c.flightEnd,
    activeDays: series.daily.filter((d) => d.impressions > 0).length,
    impressions,
    // Absent from a source's totals means that source cannot measure it.
    ctr: series.totals.ctr ?? null,
    viewability: series.totals.viewability ?? null,
    engagementRate: series.totals.engagementRate ?? null,
  };
}

export const benchmarkPool: BenchmarkCampaign[] = campaigns
  .map(projectLiveCampaign)
  .filter((c): c is BenchmarkCampaign => c !== null);

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
