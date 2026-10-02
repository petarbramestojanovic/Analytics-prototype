import { eachDayOfInterval, format } from 'date-fns';
import { TODAY, YESTERDAY_ISO } from '@/lib/clock';
import { deliveryPacing } from '@/features/campaigns/lib/delivery';
import { SOURCE_DEFINITIONS } from '@/features/campaigns/lib/sources';
import type {
  Agency,
  ApiKey,
  BenchmarkCampaign,
  Campaign,
  Company,
  DailyPoint,
  EmailReport,
  MetricKey,
  Seat,
  SeatMember,
  SourceKey,
  SourceSeries,
  SyncRun,
} from '@/types';

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
// Agencies — who booked the campaign on the client's behalf. Not every
// campaign has one; a null agencyId on the seed means booked direct.
// ---------------------------------------------------------------------------

export const agencies: Agency[] = [
  { id: 'ag-goldbach', name: 'Goldbach' },
  { id: 'ag-admeira', name: 'Admeira' },
  { id: 'ag-omd', name: 'OMD' },
  { id: 'ag-havas', name: 'Havas Media' },
  { id: 'ag-groupm', name: 'GroupM' },
  { id: 'ag-dentsu', name: 'Dentsu' },
  { id: 'ag-vizeum', name: 'Vizeum' },
];

// ---------------------------------------------------------------------------
// Seats — the tenant boundary someone signs in under (see mock/types.ts).
// There is exactly one Admin seat and one Brame seat system-wide; every
// existing company gets its own client seat. Agency seats aren't pre-seeded
// — nobody's registered under one yet, so they only appear once an admin
// creates one from the Seats page.
// ---------------------------------------------------------------------------

export const ADMIN_SEAT_ID = 'seat-admin';
export const BRAME_SEAT_ID = 'seat-brame';

export function seatIdForCompany(companyId: string): string {
  return `seat-client-${companyId}`;
}

export function seatIdForAgency(agencyId: string): string {
  return `seat-agency-${agencyId}`;
}

export const seats: Seat[] = [
  { id: ADMIN_SEAT_ID, category: 'admin', name: 'Admin' },
  { id: BRAME_SEAT_ID, category: 'brame', name: 'Brame' },
  ...companies.map((c): Seat => ({ id: seatIdForCompany(c.id), category: 'client', name: c.name, companyId: c.id })),
];

// ---------------------------------------------------------------------------
// Seat members — per-seat Admin/Viewer roles. lastSeen is mock record
// content (like a log line), not UI chrome, so it stays English regardless
// of the language switch.
// ---------------------------------------------------------------------------

export const seatMembers: SeatMember[] = [
  { id: 'm-admin-1', seatId: ADMIN_SEAT_ID, name: 'Alex Weber', email: 'alex.weber@brame.io', role: 'admin', status: 'accepted', lastSeen: 'today, 09:20' },
  { id: 'm-brame-1', seatId: BRAME_SEAT_ID, name: 'Nadia Brunner', email: 'nadia.brunner@brame.io', role: 'admin', status: 'accepted', lastSeen: 'today, 08:47' },

  { id: 'u-1', name: 'Petra Lang', email: 'p.lang@migros.ch', seatId: seatIdForCompany('c-migros'), role: 'admin', status: 'accepted', lastSeen: 'today, 08:41' },
  { id: 'u-2', name: 'Tobias Frei', email: 't.frei@migros.ch', seatId: seatIdForCompany('c-migros'), role: 'viewer', status: 'accepted', lastSeen: '3 d ago' },
  { id: 'u-2b', name: 'Corinne Hess', email: 'c.hess@migros.ch', seatId: seatIdForCompany('c-migros'), role: 'viewer', status: 'accepted', lastSeen: 'today, 10:03' },

  { id: 'u-3', name: 'Marc Bühler', email: 'm.buehler@swisscom.com', seatId: seatIdForCompany('c-swisscom'), role: 'admin', status: 'accepted', lastSeen: 'today, 07:15' },
  { id: 'u-3b', name: 'Sandra Keller', email: 's.keller@swisscom.com', seatId: seatIdForCompany('c-swisscom'), role: 'viewer', status: 'accepted', lastSeen: 'yesterday' },
  { id: 'u-3c', name: 'Dominik Wyss', email: 'd.wyss@swisscom.com', seatId: seatIdForCompany('c-swisscom'), role: 'viewer', status: 'accepted', lastSeen: '6 d ago' },

  { id: 'u-4', name: 'Jana Roth', email: 'j.roth@dm.de', seatId: seatIdForCompany('c-dm'), role: 'admin', status: 'accepted', lastSeen: 'yesterday' },
  { id: 'u-5', name: 'Nina Weber', email: 'n.weber@dm.de', seatId: seatIdForCompany('c-dm'), role: 'viewer', status: 'accepted', lastSeen: '2 w ago' },
  { id: 'u-5b', name: 'Lukas Franke', email: 'l.franke@dm.de', seatId: seatIdForCompany('c-dm'), role: 'viewer', status: 'accepted', lastSeen: 'today, 09:30' },

  { id: 'u-6', name: 'Sebastian Kohl', email: 's.kohl@bmw.de', seatId: seatIdForCompany('c-bmw'), role: 'admin', status: 'accepted', lastSeen: 'today, 09:02' },
  { id: 'u-6b', name: 'Miriam Voss', email: 'm.voss@bmw.de', seatId: seatIdForCompany('c-bmw'), role: 'viewer', status: 'accepted', lastSeen: '2 d ago' },
  { id: 'u-6c', name: 'Jonas Peters', email: 'j.peters@bmw.de', seatId: seatIdForCompany('c-bmw'), role: 'viewer', status: 'accepted', lastSeen: '1 w ago' },

  { id: 'u-7', name: 'Laura Dietrich', email: 'l.dietrich@audi.de', seatId: seatIdForCompany('c-audi'), role: 'admin', status: 'accepted', lastSeen: 'yesterday' },
  { id: 'u-7b', name: 'Felix Arnold', email: 'f.arnold@audi.de', seatId: seatIdForCompany('c-audi'), role: 'viewer', status: 'accepted', lastSeen: '4 d ago' },

  { id: 'u-8', name: 'Fabienne Moser', email: 'f.moser@coop.ch', seatId: seatIdForCompany('c-coop'), role: 'admin', status: 'accepted', lastSeen: 'today, 08:12' },
  { id: 'u-8b', name: 'Yvonne Leu', email: 'y.leu@coop.ch', seatId: seatIdForCompany('c-coop'), role: 'viewer', status: 'accepted', lastSeen: 'today, 11:20' },
  { id: 'u-8c', name: 'Reto Zimmermann', email: 'r.zimmermann@coop.ch', seatId: seatIdForCompany('c-coop'), role: 'viewer', status: 'accepted', lastSeen: '3 d ago' },

  { id: 'u-9', name: 'Kevin Brandt', email: 'k.brandt@lidl.ch', seatId: seatIdForCompany('c-lidl'), role: 'admin', status: 'accepted', lastSeen: '4 d ago' },
  { id: 'u-9b', name: 'Melanie Frei', email: 'm.frei@lidl.ch', seatId: seatIdForCompany('c-lidl'), role: 'viewer', status: 'accepted', lastSeen: 'today, 07:58' },

  { id: 'u-10', name: 'Anja Steiner', email: 'a.steiner@denner.ch', seatId: seatIdForCompany('c-denner'), role: 'admin', status: 'accepted', lastSeen: '1 w ago' },
  { id: 'u-10b', name: 'Simon Baumann', email: 's.baumann@denner.ch', seatId: seatIdForCompany('c-denner'), role: 'viewer', status: 'accepted', lastSeen: '2 w ago' },
  { id: 'u-10c', name: 'Elena Marti', email: 'e.marti@denner.ch', seatId: seatIdForCompany('c-denner'), role: 'viewer', status: 'accepted', lastSeen: 'yesterday' },

  { id: 'u-11', name: 'Ralf Huber', email: 'r.huber@mediamarkt.ch', seatId: seatIdForCompany('c-mediamarkt'), role: 'admin', status: 'accepted', lastSeen: 'today, 07:44' },
  { id: 'u-11b', name: 'Nadine Schoch', email: 'n.schoch@mediamarkt.ch', seatId: seatIdForCompany('c-mediamarkt'), role: 'viewer', status: 'accepted', lastSeen: 'today, 08:05' },

  { id: 'u-12', name: 'Sofia Berg', email: 's.berg@ikea.com', seatId: seatIdForCompany('c-ikea'), role: 'admin', status: 'accepted', lastSeen: '2 d ago' },
  { id: 'u-12b', name: 'Erik Lindqvist', email: 'e.lindqvist@ikea.com', seatId: seatIdForCompany('c-ikea'), role: 'viewer', status: 'accepted', lastSeen: '5 d ago' },
  { id: 'u-12c', name: 'Maja Holm', email: 'm.holm@ikea.com', seatId: seatIdForCompany('c-ikea'), role: 'viewer', status: 'accepted', lastSeen: '1 w ago' },

  { id: 'u-13', name: 'Thomas Gerber', email: 't.gerber@manor.ch', seatId: seatIdForCompany('c-manor'), role: 'admin', status: 'accepted', lastSeen: 'yesterday' },
  { id: 'u-13b', name: 'Céline Rey', email: 'c.rey@manor.ch', seatId: seatIdForCompany('c-manor'), role: 'viewer', status: 'accepted', lastSeen: 'today, 09:47' },

  { id: 'u-14', name: 'Isabelle Meyer', email: 'i.meyer@ubs.com', seatId: seatIdForCompany('c-ubs'), role: 'admin', status: 'accepted', lastSeen: 'today, 08:55' },
  { id: 'u-14b', name: 'Andreas Kunz', email: 'a.kunz@ubs.com', seatId: seatIdForCompany('c-ubs'), role: 'viewer', status: 'accepted', lastSeen: '2 d ago' },
  { id: 'u-14c', name: 'Vera Stucki', email: 'v.stucki@ubs.com', seatId: seatIdForCompany('c-ubs'), role: 'viewer', status: 'accepted', lastSeen: '4 d ago' },

  { id: 'u-15', name: 'Daniel Egger', email: 'd.egger@swisslife.ch', seatId: seatIdForCompany('c-swisslife'), role: 'admin', status: 'accepted', lastSeen: '3 d ago' },
  { id: 'u-15b', name: 'Larissa Good', email: 'l.good@swisslife.ch', seatId: seatIdForCompany('c-swisslife'), role: 'viewer', status: 'accepted', lastSeen: '1 w ago' },

  { id: 'u-16', name: 'Chiara Rossi', email: 'c.rossi@nestle.com', seatId: seatIdForCompany('c-nestle'), role: 'admin', status: 'accepted', lastSeen: 'today, 06:30' },
  { id: 'u-16b', name: 'Marco Bianchi', email: 'm.bianchi@nestle.com', seatId: seatIdForCompany('c-nestle'), role: 'viewer', status: 'accepted', lastSeen: 'today, 07:10' },
  { id: 'u-16c', name: 'Giulia Conti', email: 'g.conti@nestle.com', seatId: seatIdForCompany('c-nestle'), role: 'viewer', status: 'accepted', lastSeen: '3 d ago' },

  { id: 'u-17', name: 'Peter Vogel', email: 'p.vogel@zalando.de', seatId: seatIdForCompany('c-zalando'), role: 'viewer', status: 'accepted', lastSeen: '5 d ago' },
  { id: 'u-17b', name: 'Katharina Sommer', email: 'k.sommer@zalando.de', seatId: seatIdForCompany('c-zalando'), role: 'admin', status: 'accepted', lastSeen: 'today, 08:22' },
];

// ---------------------------------------------------------------------------
// API keys — read-only BI credentials, one list per seat. Timestamps are
// anchored to TODAY so "last used" and expiry read the same in every demo.
// ---------------------------------------------------------------------------

export const apiKeys: ApiKey[] = [
  {
    id: 'key-1',
    seatId: seatIdForCompany('c-migros'),
    name: 'Power BI — marketing dashboard',
    prefix: 'bms_live_k7Qm2xPa',
    createdAt: '2026-07-14T10:12:00+02:00',
    createdBy: 'Petra Lang',
    lastUsedAt: '2026-09-08T06:05:00+02:00',
    expiresAt: '2027-07-14T10:12:00+02:00',
    revokedAt: null,
  },
  {
    id: 'key-2',
    seatId: seatIdForCompany('c-migros'),
    name: 'Looker Studio — weekly review',
    prefix: 'bms_live_t3Zw9LcE',
    createdAt: '2026-05-02T14:40:00+02:00',
    createdBy: 'Petra Lang',
    lastUsedAt: '2026-09-01T07:30:00+02:00',
    expiresAt: '2026-09-30T00:00:00+02:00',
    revokedAt: null,
  },
  {
    id: 'key-3',
    seatId: seatIdForCompany('c-migros'),
    name: 'Old Tableau workbook',
    prefix: 'bms_live_h8Vd1RnU',
    createdAt: '2026-01-20T09:00:00+01:00',
    createdBy: 'Petra Lang',
    lastUsedAt: '2026-04-11T12:20:00+02:00',
    expiresAt: null,
    revokedAt: '2026-04-12T09:15:00+02:00',
  },
  {
    id: 'key-4',
    seatId: seatIdForCompany('c-swisscom'),
    name: 'Internal reporting warehouse',
    prefix: 'bms_live_c5Nf4YeB',
    createdAt: '2026-08-03T16:25:00+02:00',
    createdBy: 'Marc Bühler',
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
  },
  {
    id: 'key-5',
    seatId: ADMIN_SEAT_ID,
    name: 'Brame BI — all clients',
    prefix: 'bms_live_m2Xj6GaS',
    createdAt: '2026-06-09T11:00:00+02:00',
    createdBy: 'Alex Weber',
    lastUsedAt: '2026-09-08T09:00:00+02:00',
    expiresAt: null,
    revokedAt: null,
  },
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
  /** Undefined/omitted means booked directly with the client, no agency. */
  agencyId?: string;
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
    agencyId: 'ag-goldbach',
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
    agencyId: 'ag-admeira',
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
    agencyId: 'ag-omd',
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
    agencyId: 'ag-havas',
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
    agencyId: 'ag-groupm',
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
    agencyId: 'ag-dentsu',
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
    agencyId: 'ag-vizeum',
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
    agencyId: 'ag-goldbach',
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
    agencyId: 'ag-admeira',
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
    agencyId: 'ag-omd',
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
    agencyId: 'ag-havas',
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
    agencyId: 'ag-groupm',
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
    agencyId: 'ag-dentsu',
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
    agencyId: 'ag-vizeum',
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
    agencyId: 'ag-goldbach',
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
    agencyId: 'ag-admeira',
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
    agencyId: 'ag-omd',
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
    agencyId: 'ag-havas',
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
    agencyId: 'ag-groupm',
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
    agencyId: 'ag-dentsu',
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
    agencyId: 'ag-vizeum',
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
    agencyId: 'ag-goldbach',
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
    agencyId: 'ag-admeira',
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
    agencyId: s.agencyId ?? null,
    agencyName: s.agencyId ? (agencies.find((a) => a.id === s.agencyId)?.name ?? null) : null,
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
    scope: { level: 'client', companyId: 'c-migros', companyName: 'Migros' },
    name: 'Weekly performance summary',
    recipients: ['petra.lang@migros.ch', 'media-team@migros.ch'],
    metrics: ['impressions', 'ctr', 'viewability'],
    granularity: 'total',
    cadence: 'weekly',
    dayOfWeek: 'mon',
    format: 'email',
    enabled: true,
    lastSentAt: '2026-09-08T08:00:00+02:00',
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
    lastSentAt: '2026-08-01T08:00:00+02:00',
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
    lastSentAt: '2026-06-01T08:00:00+02:00',
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
    lastSentAt: '2026-09-03T08:00:00+02:00',
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
    lastSentAt: '2026-09-04T08:00:00+02:00',
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
    lastSentAt: '2026-08-01T08:00:00+02:00',
  },
  {
    id: 'er-8',
    // Agency-level: Goldbach's own rollup across every client they book
    // through us, not any one client's report.
    scope: { level: 'agency', agencyId: 'ag-goldbach', agencyName: 'Goldbach' },
    name: 'Weekly book-wide delivery snapshot',
    recipients: ['ads-team@goldbach.ch'],
    metrics: ['impressions', 'viewability'],
    granularity: 'total',
    cadence: 'weekly',
    dayOfWeek: 'tue',
    format: 'excel',
    // Paused — kept as a saved report Goldbach runs on demand instead.
    enabled: false,
    lastSentAt: '2026-07-14T08:00:00+02:00',
  },
  {
    id: 'er-9',
    // Campaign-level: one flight IKEA wants a daily breakdown on, not
    // rolled into their client-wide summary.
    scope: { level: 'campaign', campaignId: 'cmp-ik01', campaignName: 'IKEA Winterkollektion Slider' },
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
    lastSentAt: '2026-09-08T08:00:00+02:00',
  },
];

// Salesforce, ATK and NEXD are all pull-based — polled every 4-6 hours,
// a few times a day, never live. Brame's own instrumentation is the only
// live/real-time source and has no sync runs of its own to show here.
export const syncRuns: SyncRun[] = [
  { id: 's-1', source: 'salesforce', startedAt: '2026-09-08T09:12:00+02:00', durationMs: 3_140, status: 'ok', rowsWritten: 8, campaignsTouched: 8 },
  { id: 's-2', source: 'atk', startedAt: '2026-09-08T04:00:00+02:00', durationMs: 84_220, status: 'ok', rowsWritten: 1_412, campaignsTouched: 6 },
  {
    id: 's-6',
    source: 'nexd',
    startedAt: '2026-09-08T08:45:00+02:00',
    durationMs: 2_240,
    status: 'failed',
    rowsWritten: 0,
    campaignsTouched: 0,
    note: 'Authentication expired — the NEXD API token needs refreshing.',
  },
  {
    id: 's-3',
    source: 'nexd',
    startedAt: '2026-09-08T04:02:00+02:00',
    durationMs: 41_880,
    status: 'ok',
    rowsWritten: 612,
    campaignsTouched: 3,
    note: '1 campaign has no NEXD live ID configured',
  },
  { id: 's-5', source: 'atk', startedAt: '2026-09-07T22:00:00+02:00', durationMs: 81_450, status: 'ok', rowsWritten: 1_401, campaignsTouched: 6 },
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
    agencyId: c.agencyId,
    agencyName: c.agencyName,
    market: c.salesforce.market,
    flightStart: c.flightStart,
    flightEnd: c.flightEnd,
    activeDays: series.daily.filter((d) => d.impressions > 0).length,
    impressions,
    // Absent from a source's totals means that source cannot measure it.
    ctr: series.totals.ctr ?? null,
    viewability: series.totals.viewability ?? null,
    engagementRate: series.totals.engagementRate ?? null,
    deliveryPacing: deliveryPacing(c),
  };
}

export const benchmarkPool: BenchmarkCampaign[] = campaigns
  .map(projectLiveCampaign)
  .filter((c): c is BenchmarkCampaign => c !== null);
