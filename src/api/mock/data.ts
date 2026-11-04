import { eachDayOfInterval, format } from 'date-fns';
import { TODAY, YESTERDAY_ISO } from '@/lib/clock';
import { deliveryPacing } from '@/features/campaigns/lib/delivery';
import { SOURCE_DEFINITIONS } from '@/features/campaigns/lib/sources';
import type {
  Agency,
  ApiKey,
  BenchmarkCampaign,
  BenchmarkCreative,
  Campaign,
  Company,
  InboxEvent,
  DailyPoint,
  EmailReport,
  MetricKey,
  PrimaryKpi,
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

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

/** Industries follow the KPI platform's live taxonomy (11 categories, after the
 *  2026-06 migrations re-added Food Retail alongside a narrowed Retail). */
export const companies: Company[] = [
  { id: 'c-migros', name: 'Migros', industry: 'Food Retail' },
  { id: 'c-swisscom', name: 'Swisscom', industry: 'Tech-Telco' },
  { id: 'c-dm', name: 'dm-drogerie markt', industry: 'Retail' },
  { id: 'c-bmw', name: 'BMW', industry: 'Automotive' },
  { id: 'c-audi', name: 'Audi', industry: 'Automotive' },
  { id: 'c-coop', name: 'Coop', industry: 'Food Retail' },
  { id: 'c-lidl', name: 'Lidl', industry: 'Food Retail' },
  { id: 'c-denner', name: 'Denner', industry: 'Food Retail' },
  { id: 'c-mediamarkt', name: 'MediaMarkt', industry: 'Technical Appliances' },
  { id: 'c-ikea', name: 'IKEA', industry: 'Retail' },
  { id: 'c-manor', name: 'Manor', industry: 'Retail' },
  { id: 'c-ubs', name: 'UBS', industry: 'Finance & Insurance' },
  { id: 'c-swisslife', name: 'Swiss Life', industry: 'Finance & Insurance' },
  { id: 'c-nestle', name: 'Nestlé', industry: 'FMCG / CPG' },
  { id: 'c-zalando', name: 'Zalando', industry: 'eCommerce' },
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

const ADMIN_SEAT_ID = 'seat-admin';
const BRAME_SEAT_ID = 'seat-brame';

export function seatIdForCompany(companyId: string): string {
  return `seat-client-${companyId}`;
}

export function seatIdForAgency(agencyId: string): string {
  return `seat-agency-${agencyId}`;
}

export const seats: Seat[] = [
  { id: ADMIN_SEAT_ID, category: 'admin', name: 'Admin' },
  { id: BRAME_SEAT_ID, category: 'brame', name: 'Brame' },
  ...companies.map((c): Seat => ({
    id: seatIdForCompany(c.id),
    category: 'client',
    name: c.name,
    companyId: c.id,
  })),
];

// ---------------------------------------------------------------------------
// Seat members — per-seat Admin/Viewer roles. lastSeenAt is a timestamp on
// the pinned clock (lib/clock), rendered relative and translated by the UI.
// ---------------------------------------------------------------------------

export const seatMembers: SeatMember[] = [
  {
    id: 'm-admin-1',
    seatId: ADMIN_SEAT_ID,
    name: 'Alex Weber',
    email: 'alex.weber@brame.io',
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-28T09:20:00+01:00',
  },
  {
    id: 'm-brame-1',
    seatId: BRAME_SEAT_ID,
    name: 'Nadia Brunner',
    email: 'nadia.brunner@brame.io',
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-28T08:47:00+01:00',
  },

  {
    id: 'u-1',
    name: 'Petra Lang',
    email: 'p.lang@migros.ch',
    seatId: seatIdForCompany('c-migros'),
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-28T08:41:00+01:00',
  },
  {
    id: 'u-2',
    name: 'Tobias Frei',
    email: 't.frei@migros.ch',
    seatId: seatIdForCompany('c-migros'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-25T14:00:00+01:00',
  },
  {
    id: 'u-2b',
    name: 'Corinne Hess',
    email: 'c.hess@migros.ch',
    seatId: seatIdForCompany('c-migros'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-28T07:03:00+01:00',
  },

  {
    id: 'u-3',
    name: 'Marc Bühler',
    email: 'm.buehler@swisscom.com',
    seatId: seatIdForCompany('c-swisscom'),
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-28T07:15:00+01:00',
  },
  {
    id: 'u-3b',
    name: 'Sandra Keller',
    email: 's.keller@swisscom.com',
    seatId: seatIdForCompany('c-swisscom'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-27T16:30:00+01:00',
  },
  {
    id: 'u-3c',
    name: 'Dominik Wyss',
    email: 'd.wyss@swisscom.com',
    seatId: seatIdForCompany('c-swisscom'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-22T14:00:00+02:00',
  },

  {
    id: 'u-4',
    name: 'Jana Roth',
    email: 'j.roth@dm.de',
    seatId: seatIdForCompany('c-dm'),
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-27T16:30:00+01:00',
  },
  {
    id: 'u-5',
    name: 'Nina Weber',
    email: 'n.weber@dm.de',
    seatId: seatIdForCompany('c-dm'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-14T14:00:00+02:00',
  },
  {
    id: 'u-5b',
    name: 'Lukas Franke',
    email: 'l.franke@dm.de',
    seatId: seatIdForCompany('c-dm'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-28T06:30:00+01:00',
  },

  {
    id: 'u-6',
    name: 'Sebastian Kohl',
    email: 's.kohl@bmw.de',
    seatId: seatIdForCompany('c-bmw'),
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-28T09:02:00+01:00',
  },
  {
    id: 'u-6b',
    name: 'Miriam Voss',
    email: 'm.voss@bmw.de',
    seatId: seatIdForCompany('c-bmw'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-26T14:00:00+01:00',
  },
  {
    id: 'u-6c',
    name: 'Jonas Peters',
    email: 'j.peters@bmw.de',
    seatId: seatIdForCompany('c-bmw'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-21T14:00:00+02:00',
  },

  {
    id: 'u-7',
    name: 'Laura Dietrich',
    email: 'l.dietrich@audi.de',
    seatId: seatIdForCompany('c-audi'),
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-27T16:30:00+01:00',
  },
  {
    id: 'u-7b',
    name: 'Felix Arnold',
    email: 'f.arnold@audi.de',
    seatId: seatIdForCompany('c-audi'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-24T14:00:00+02:00',
  },

  {
    id: 'u-8',
    name: 'Fabienne Moser',
    email: 'f.moser@coop.ch',
    seatId: seatIdForCompany('c-coop'),
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-28T08:12:00+01:00',
  },
  {
    id: 'u-8b',
    name: 'Yvonne Leu',
    email: 'y.leu@coop.ch',
    seatId: seatIdForCompany('c-coop'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-28T08:20:00+01:00',
  },
  {
    id: 'u-8c',
    name: 'Reto Zimmermann',
    email: 'r.zimmermann@coop.ch',
    seatId: seatIdForCompany('c-coop'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-25T14:00:00+01:00',
  },

  {
    id: 'u-9',
    name: 'Kevin Brandt',
    email: 'k.brandt@lidl.ch',
    seatId: seatIdForCompany('c-lidl'),
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-24T14:00:00+02:00',
  },
  {
    id: 'u-9b',
    name: 'Melanie Frei',
    email: 'm.frei@lidl.ch',
    seatId: seatIdForCompany('c-lidl'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-28T07:58:00+01:00',
  },

  {
    id: 'u-10',
    name: 'Anja Steiner',
    email: 'a.steiner@denner.ch',
    seatId: seatIdForCompany('c-denner'),
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-21T14:00:00+02:00',
  },
  {
    id: 'u-10b',
    name: 'Simon Baumann',
    email: 's.baumann@denner.ch',
    seatId: seatIdForCompany('c-denner'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-14T14:00:00+02:00',
  },
  {
    id: 'u-10c',
    name: 'Elena Marti',
    email: 'e.marti@denner.ch',
    seatId: seatIdForCompany('c-denner'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-27T16:30:00+01:00',
  },

  {
    id: 'u-11',
    name: 'Ralf Huber',
    email: 'r.huber@mediamarkt.ch',
    seatId: seatIdForCompany('c-mediamarkt'),
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-28T07:44:00+01:00',
  },
  {
    id: 'u-11b',
    name: 'Nadine Schoch',
    email: 'n.schoch@mediamarkt.ch',
    seatId: seatIdForCompany('c-mediamarkt'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-28T08:05:00+01:00',
  },

  {
    id: 'u-12',
    name: 'Sofia Berg',
    email: 's.berg@ikea.com',
    seatId: seatIdForCompany('c-ikea'),
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-26T14:00:00+01:00',
  },
  {
    id: 'u-12b',
    name: 'Erik Lindqvist',
    email: 'e.lindqvist@ikea.com',
    seatId: seatIdForCompany('c-ikea'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-23T14:00:00+02:00',
  },
  {
    id: 'u-12c',
    name: 'Maja Holm',
    email: 'm.holm@ikea.com',
    seatId: seatIdForCompany('c-ikea'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-21T14:00:00+02:00',
  },

  {
    id: 'u-13',
    name: 'Thomas Gerber',
    email: 't.gerber@manor.ch',
    seatId: seatIdForCompany('c-manor'),
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-27T16:30:00+01:00',
  },
  {
    id: 'u-13b',
    name: 'Céline Rey',
    email: 'c.rey@manor.ch',
    seatId: seatIdForCompany('c-manor'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-28T06:47:00+01:00',
  },

  {
    id: 'u-14',
    name: 'Isabelle Meyer',
    email: 'i.meyer@ubs.com',
    seatId: seatIdForCompany('c-ubs'),
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-28T08:55:00+01:00',
  },
  {
    id: 'u-14b',
    name: 'Andreas Kunz',
    email: 'a.kunz@ubs.com',
    seatId: seatIdForCompany('c-ubs'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-26T14:00:00+01:00',
  },
  {
    id: 'u-14c',
    name: 'Vera Stucki',
    email: 'v.stucki@ubs.com',
    seatId: seatIdForCompany('c-ubs'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-24T14:00:00+02:00',
  },

  {
    id: 'u-15',
    name: 'Daniel Egger',
    email: 'd.egger@swisslife.ch',
    seatId: seatIdForCompany('c-swisslife'),
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-25T14:00:00+01:00',
  },
  {
    id: 'u-15b',
    name: 'Larissa Good',
    email: 'l.good@swisslife.ch',
    seatId: seatIdForCompany('c-swisslife'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-21T14:00:00+02:00',
  },

  {
    id: 'u-16',
    name: 'Chiara Rossi',
    email: 'c.rossi@nestle.com',
    seatId: seatIdForCompany('c-nestle'),
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-28T06:30:00+01:00',
  },
  {
    id: 'u-16b',
    name: 'Marco Bianchi',
    email: 'm.bianchi@nestle.com',
    seatId: seatIdForCompany('c-nestle'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-28T07:10:00+01:00',
  },
  {
    id: 'u-16c',
    name: 'Giulia Conti',
    email: 'g.conti@nestle.com',
    seatId: seatIdForCompany('c-nestle'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-25T14:00:00+01:00',
  },

  {
    id: 'u-17',
    name: 'Peter Vogel',
    email: 'p.vogel@zalando.de',
    seatId: seatIdForCompany('c-zalando'),
    role: 'viewer',
    status: 'accepted',
    lastSeenAt: '2026-10-23T14:00:00+02:00',
  },
  {
    id: 'u-17b',
    name: 'Katharina Sommer',
    email: 'k.sommer@zalando.de',
    seatId: seatIdForCompany('c-zalando'),
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-28T08:22:00+01:00',
  },
];

// ---------------------------------------------------------------------------
// API keys — read-only BI credentials, one list per seat. Timestamps are
// anchored to TODAY so "last used" and expiry read the same in every demo.
// ---------------------------------------------------------------------------

export const apiKeys: ApiKey[] = [
  {
    id: 'key-1',
    seatId: seatIdForCompany('c-migros'),
    name: 'Power BI: marketing dashboard',
    prefix: 'bms_live_k7Qm2xPa',
    createdAt: '2026-09-02T10:12:00+02:00',
    createdBy: 'Petra Lang',
    lastUsedAt: '2026-10-28T06:05:00+01:00',
    expiresAt: '2027-07-14T10:12:00+02:00',
    revokedAt: null,
  },
  {
    id: 'key-2',
    seatId: seatIdForCompany('c-migros'),
    name: 'Looker Studio: weekly review',
    prefix: 'bms_live_t3Zw9LcE',
    createdAt: '2026-06-21T14:40:00+02:00',
    createdBy: 'Petra Lang',
    lastUsedAt: '2026-10-21T07:30:00+02:00',
    expiresAt: '2026-11-19T00:00:00+01:00',
    revokedAt: null,
  },
  {
    id: 'key-3',
    seatId: seatIdForCompany('c-migros'),
    name: 'Old Tableau workbook',
    prefix: 'bms_live_h8Vd1RnU',
    createdAt: '2026-03-11T09:00:00+01:00',
    createdBy: 'Petra Lang',
    lastUsedAt: '2026-05-31T12:20:00+02:00',
    expiresAt: null,
    revokedAt: '2026-06-01T09:15:00+02:00',
  },
  {
    id: 'key-4',
    seatId: seatIdForCompany('c-swisscom'),
    name: 'Internal reporting warehouse',
    prefix: 'bms_live_c5Nf4YeB',
    createdAt: '2026-09-22T16:25:00+02:00',
    createdBy: 'Marc Bühler',
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
  },
  {
    id: 'key-5',
    seatId: ADMIN_SEAT_ID,
    name: 'Brame BI: all clients',
    prefix: 'bms_live_m2Xj6GaS',
    createdAt: '2026-07-29T11:00:00+02:00',
    createdBy: 'Alex Weber',
    lastUsedAt: '2026-10-28T09:00:00+01:00',
    expiresAt: null,
    revokedAt: null,
  },
];

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

// Salesforce users. The mock has no profile photos, so avatars fall back to
// initials; a real sync fills `avatarUrl` from Salesforce's SmallPhotoUrl.
const CAMPAIGN_MANAGERS = [
  'Nina Keller',
  'Tobias Frei',
  'Lena Vogel',
  'David Marti',
  'Sara Brunner',
];

const personFor = (name: string): Campaign['salesforce']['salesPerson'] => ({
  id: `sf-user-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`,
  name,
  avatarUrl: null,
});

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
    name: 'Migros Cumulus Summer',
    companyId: 'c-migros',
    agencyId: 'ag-goldbach',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-09-30',
    flightEnd: '2026-11-10',
    dailyImpressions: 240_000,
    viewability: 0.84,
    engagementRate: 0.061,
    owner: 'Petra Lang',
    market: 'CH',
    bookedImpressions: 9_500_000,
    productLine: 'Playable',
    language: 'de-CH',
    seed: 11,
  },
  {
    id: 'cmp-4b07',
    salesforceId: '006Qy00000ALm44IAB',
    name: 'Migros Back-to-School',
    companyId: 'c-migros',
    agencyId: 'ag-admeira',
    status: 'live',
    primarySource: 'custom',
    flightStart: '2026-10-14',
    flightEnd: '2026-11-03',
    dailyImpressions: 96_000,
    viewability: 0.79,
    engagementRate: 0.084,
    missingSources: ['nexd'],
    owner: 'Petra Lang',
    market: 'AT',
    bookedImpressions: 2_200_000,
    productLine: 'Playable',
    language: 'de-CH',
    seed: 23,
  },
  {
    id: 'cmp-9c55',
    salesforceId: '006Qy00000ALm51IAB',
    name: 'Swisscom blue Play',
    companyId: 'c-swisscom',
    status: 'live',
    primarySource: 'nexd',
    flightStart: '2026-10-07',
    flightEnd: '2026-11-19',
    dailyImpressions: 158_000,
    viewability: 0.87,
    engagementRate: 0.048,
    owner: 'Marc Bühler',
    market: 'CH',
    bookedImpressions: 6_800_000,
    productLine: 'Playable',
    language: 'de-CH',
    seed: 37,
  },
  {
    id: 'cmp-2d18',
    salesforceId: '006Qy00000ALm62IAB',
    name: 'dm Adventskalender',
    companyId: 'c-dm',
    agencyId: 'ag-omd',
    status: 'scheduled',
    primarySource: 'atk',
    flightStart: '2026-12-23',
    flightEnd: '2027-02-12',
    dailyImpressions: 180_000,
    viewability: 0.82,
    engagementRate: 0.07,
    owner: 'Jana Roth',
    market: 'DE',
    bookedImpressions: 12_000_000,
    productLine: 'Playable',
    language: 'de-DE',
    seed: 41,
  },
  {
    id: 'cmp-7a93',
    salesforceId: '006Qy00000ALm70IAB',
    name: 'dm Beauty Days',
    companyId: 'c-dm',
    agencyId: 'ag-havas',
    status: 'ended',
    primarySource: 'atk',
    flightStart: '2026-08-05',
    flightEnd: '2026-09-15',
    dailyImpressions: 205_000,
    viewability: 0.81,
    engagementRate: 0.055,
    owner: 'Jana Roth',
    market: 'FR',
    bookedImpressions: 8_000_000,
    productLine: 'Playable',
    language: 'de-DE',
    seed: 53,
  },
  {
    id: 'cmp-1e64',
    salesforceId: '006Qy00000ALm88IAB',
    name: 'Migros Bio Week',
    companyId: 'c-migros',
    status: 'ended',
    primarySource: 'custom',
    flightStart: '2026-08-25',
    flightEnd: '2026-09-22',
    dailyImpressions: 74_000,
    viewability: 0.77,
    engagementRate: 0.092,
    owner: 'Petra Lang',
    market: 'IT',
    bookedImpressions: 2_000_000,
    productLine: 'Playable',
    language: 'fr-CH',
    seed: 67,
  },
  {
    id: 'cmp-5f30',
    salesforceId: '006Qy00000ALm99IAB',
    name: 'Swisscom Fibre Push',
    companyId: 'c-swisscom',
    agencyId: 'ag-groupm',
    status: 'ended',
    primarySource: 'atk',
    flightStart: '2026-07-08',
    flightEnd: '2026-08-11',
    dailyImpressions: 132_000,
    viewability: 0.86,
    engagementRate: 0.039,
    owner: 'Marc Bühler',
    market: 'AT',
    bookedImpressions: 4_400_000,
    productLine: 'Playable',
    language: 'de-CH',
    seed: 79,
  },
  {
    id: 'cmp-bm01',
    salesforceId: '006Qy00000ALmB1IAB',
    name: 'BMW Winter Test Drive',
    companyId: 'c-bmw',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-10-09',
    flightEnd: '2026-11-24',
    dailyImpressions: 92_000,
    viewability: 0.83,
    engagementRate: 0.052,
    owner: 'Sebastian Kohl',
    market: 'DE',
    bookedImpressions: 4_800_000,
    productLine: 'Playable',
    language: 'de-DE',
    seed: 101,
  },
  {
    id: 'cmp-bm02',
    salesforceId: '006Qy00000ALmB2IAB',
    name: 'BMW i-Series Configurator',
    companyId: 'c-bmw',
    agencyId: 'ag-vizeum',
    status: 'scheduled',
    primarySource: 'nexd',
    flightStart: '2026-12-04',
    flightEnd: '2027-01-19',
    dailyImpressions: 78_000,
    viewability: 0.85,
    engagementRate: 0.047,
    owner: 'Sebastian Kohl',
    market: 'AT',
    bookedImpressions: 3_200_000,
    productLine: 'Playable',
    language: 'de-DE',
    seed: 103,
  },
  {
    id: 'cmp-au01',
    salesforceId: '006Qy00000ALmC1IAB',
    name: 'Audi e-tron Awareness',
    companyId: 'c-audi',
    agencyId: 'ag-goldbach',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-09-24',
    flightEnd: '2026-11-14',
    dailyImpressions: 84_000,
    viewability: 0.82,
    engagementRate: 0.049,
    owner: 'Laura Dietrich',
    market: 'DE',
    bookedImpressions: 3_900_000,
    productLine: 'Playable',
    language: 'de-DE',
    seed: 107,
  },
  {
    id: 'cmp-au02',
    salesforceId: '006Qy00000ALmC2IAB',
    name: 'Audi Q6 Launch',
    companyId: 'c-audi',
    agencyId: 'ag-admeira',
    status: 'ended',
    primarySource: 'custom',
    flightStart: '2026-06-29',
    flightEnd: '2026-08-03',
    dailyImpressions: 66_000,
    viewability: 0.8,
    engagementRate: 0.058,
    owner: 'Laura Dietrich',
    market: 'FR',
    bookedImpressions: 2_400_000,
    productLine: 'Playable',
    language: 'de-DE',
    seed: 109,
  },
  {
    id: 'cmp-co01',
    salesforceId: '006Qy00000ALmD1IAB',
    name: 'Coop Prix Garantie',
    companyId: 'c-coop',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-10-04',
    flightEnd: '2026-12-20',
    dailyImpressions: 118_000,
    viewability: 0.75,
    engagementRate: 0.044,
    owner: 'Fabienne Moser',
    market: 'CH',
    bookedImpressions: 6_100_000,
    productLine: 'Playable',
    language: 'fr-CH',
    seed: 113,
  },
  {
    id: 'cmp-co02',
    salesforceId: '006Qy00000ALmD2IAB',
    name: 'Coop Building Bloqx',
    companyId: 'c-coop',
    agencyId: 'ag-omd',
    status: 'ended',
    primarySource: 'nexd',
    flightStart: '2026-05-21',
    flightEnd: '2026-07-04',
    dailyImpressions: 94_000,
    viewability: 0.73,
    engagementRate: 0.05,
    owner: 'Fabienne Moser',
    market: 'FR',
    bookedImpressions: 3_800_000,
    productLine: 'Playable',
    language: 'de-CH',
    seed: 127,
  },
  {
    id: 'cmp-li01',
    salesforceId: '006Qy00000ALmE1IAB',
    name: 'Lidl Schweiz Anniversary',
    companyId: 'c-lidl',
    agencyId: 'ag-havas',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-09-20',
    flightEnd: '2026-11-19',
    dailyImpressions: 102_000,
    viewability: 0.71,
    engagementRate: 0.046,
    owner: 'Kevin Brandt',
    market: 'CH',
    bookedImpressions: 5_200_000,
    productLine: 'Playable',
    language: 'de-CH',
    seed: 131,
  },
  {
    id: 'cmp-de01',
    salesforceId: '006Qy00000ALmF1IAB',
    name: 'Denner Frische-Offensive',
    companyId: 'c-denner',
    agencyId: 'ag-groupm',
    status: 'live',
    primarySource: 'custom',
    flightStart: '2026-09-29',
    flightEnd: '2026-12-09',
    dailyImpressions: 58_000,
    viewability: 0.7,
    engagementRate: 0.06,
    owner: 'Anja Steiner',
    market: 'CH',
    bookedImpressions: 2_600_000,
    productLine: 'Playable',
    language: 'de-CH',
    seed: 139,
  },
  {
    id: 'cmp-de02',
    salesforceId: '006Qy00000ALmF2IAB',
    name: 'Denner Weinwochen',
    companyId: 'c-denner',
    agencyId: 'ag-dentsu',
    status: 'ended',
    primarySource: 'atk',
    flightStart: '2026-03-23',
    flightEnd: '2026-04-27',
    dailyImpressions: 44_000,
    viewability: 0.69,
    engagementRate: 0.055,
    owner: 'Anja Steiner',
    market: 'IT',
    bookedImpressions: 1_600_000,
    productLine: 'Playable',
    language: 'de-CH',
    seed: 149,
  },
  {
    id: 'cmp-mm01',
    salesforceId: '006Qy00000ALmG1IAB',
    name: 'MediaMarkt Black Friday',
    companyId: 'c-mediamarkt',
    status: 'scheduled',
    primarySource: 'atk',
    flightStart: '2026-12-30',
    flightEnd: '2027-01-19',
    dailyImpressions: 145_000,
    viewability: 0.91,
    engagementRate: 0.038,
    owner: 'Ralf Huber',
    market: 'CH',
    bookedImpressions: 5_900_000,
    productLine: 'Playable',
    language: 'de-CH',
    seed: 151,
  },
  {
    id: 'cmp-mm02',
    salesforceId: '006Qy00000ALmG2IAB',
    name: 'MediaMarkt Gaming Week',
    companyId: 'c-mediamarkt',
    agencyId: 'ag-vizeum',
    status: 'ended',
    primarySource: 'nexd',
    flightStart: '2026-07-21',
    flightEnd: '2026-08-10',
    dailyImpressions: 89_000,
    viewability: 0.9,
    engagementRate: 0.041,
    owner: 'Ralf Huber',
    market: 'DE',
    bookedImpressions: 2_800_000,
    productLine: 'Playable',
    language: 'de-CH',
    seed: 157,
  },
  {
    id: 'cmp-ik01',
    salesforceId: '006Qy00000ALmH1IAB',
    name: 'IKEA Winterkollektion',
    companyId: 'c-ikea',
    agencyId: 'ag-goldbach',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-10-14',
    flightEnd: '2027-02-03',
    dailyImpressions: 39_000,
    viewability: 0.89,
    engagementRate: 0.065,
    owner: 'Sofia Berg',
    market: 'CH',
    bookedImpressions: 4_100_000,
    productLine: 'Playable',
    language: 'de-CH',
    seed: 163,
  },
  {
    id: 'cmp-ik02',
    salesforceId: '006Qy00000ALmH2IAB',
    name: 'IKEA Small Space',
    companyId: 'c-ikea',
    agencyId: 'ag-admeira',
    status: 'ended',
    primarySource: 'custom',
    flightStart: '2026-06-04',
    flightEnd: '2026-07-19',
    dailyImpressions: 31_000,
    viewability: 0.88,
    engagementRate: 0.072,
    owner: 'Sofia Berg',
    market: 'GB',
    bookedImpressions: 1_400_000,
    productLine: 'Playable',
    language: 'fr-CH',
    seed: 167,
  },
  {
    id: 'cmp-ma01',
    salesforceId: '006Qy00000ALmI1IAB',
    name: 'Manor Holiday Season',
    companyId: 'c-manor',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-10-19',
    flightEnd: '2027-01-09',
    dailyImpressions: 47_000,
    viewability: 0.9,
    engagementRate: 0.058,
    owner: 'Thomas Gerber',
    market: 'CH',
    bookedImpressions: 2_300_000,
    productLine: 'Playable',
    language: 'fr-CH',
    seed: 173,
  },
  {
    id: 'cmp-ub01',
    salesforceId: '006Qy00000ALmJ1IAB',
    name: 'UBS Vorsorge 2026',
    companyId: 'c-ubs',
    agencyId: 'ag-havas',
    status: 'live',
    primarySource: 'nexd',
    flightStart: '2026-09-20',
    flightEnd: '2026-12-20',
    dailyImpressions: 21_000,
    viewability: 0.87,
    engagementRate: 0.033,
    owner: 'Isabelle Meyer',
    market: 'CH',
    bookedImpressions: 1_900_000,
    productLine: 'Playable',
    language: 'de-CH',
    seed: 181,
  },
  {
    id: 'cmp-ub02',
    salesforceId: '006Qy00000ALmJ2IAB',
    name: 'UBS Digital Banking',
    companyId: 'c-ubs',
    status: 'ended',
    primarySource: 'atk',
    flightStart: '2026-04-20',
    flightEnd: '2026-05-25',
    dailyImpressions: 18_000,
    viewability: 0.86,
    engagementRate: 0.03,
    owner: 'Isabelle Meyer',
    market: 'GB',
    bookedImpressions: 900_000,
    productLine: 'Playable',
    language: 'de-CH',
    seed: 191,
  },
  {
    id: 'cmp-sl01',
    salesforceId: '006Qy00000ALmK1IAB',
    name: 'Swiss Life Pensionsberatung',
    companyId: 'c-swisslife',
    agencyId: 'ag-groupm',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-10-07',
    flightEnd: '2027-01-04',
    dailyImpressions: 19_000,
    viewability: 0.86,
    engagementRate: 0.036,
    owner: 'Daniel Egger',
    market: 'CH',
    bookedImpressions: 1_700_000,
    productLine: 'Playable',
    language: 'de-CH',
    seed: 197,
  },
  {
    id: 'cmp-sl02',
    salesforceId: '006Qy00000ALmK2IAB',
    name: 'Swiss Life Family Planning',
    companyId: 'c-swisslife',
    agencyId: 'ag-dentsu',
    status: 'scheduled',
    primarySource: 'custom',
    flightStart: '2026-12-21',
    flightEnd: '2027-02-03',
    dailyImpressions: 16_000,
    viewability: 0.85,
    engagementRate: 0.042,
    owner: 'Daniel Egger',
    market: 'AT',
    bookedImpressions: 1_200_000,
    productLine: 'Playable',
    language: 'fr-CH',
    seed: 199,
  },
  {
    id: 'cmp-ne01',
    salesforceId: '006Qy00000ALmL1IAB',
    name: 'Nestlé KitKat Break',
    companyId: 'c-nestle',
    status: 'live',
    primarySource: 'atk',
    flightStart: '2026-10-01',
    flightEnd: '2026-11-29',
    dailyImpressions: 128_000,
    viewability: 0.79,
    engagementRate: 0.048,
    owner: 'Chiara Rossi',
    market: 'CH',
    bookedImpressions: 6_500_000,
    productLine: 'Playable',
    language: 'de-CH',
    seed: 211,
  },
  {
    id: 'cmp-ne02',
    salesforceId: '006Qy00000ALmL2IAB',
    name: 'Nestlé Nespresso',
    companyId: 'c-nestle',
    agencyId: 'ag-vizeum',
    status: 'ended',
    primarySource: 'nexd',
    flightStart: '2026-06-20',
    flightEnd: '2026-07-30',
    dailyImpressions: 71_000,
    viewability: 0.78,
    engagementRate: 0.053,
    owner: 'Chiara Rossi',
    market: 'FR',
    bookedImpressions: 3_100_000,
    productLine: 'Playable',
    language: 'fr-CH',
    seed: 223,
  },
  {
    id: 'cmp-za01',
    salesforceId: '006Qy00000ALmM1IAB',
    name: 'Zalando Autumn Drop',
    companyId: 'c-zalando',
    agencyId: 'ag-goldbach',
    status: 'live',
    primarySource: 'custom',
    flightStart: '2026-10-11',
    flightEnd: '2026-11-20',
    dailyImpressions: 112_000,
    viewability: 0.81,
    engagementRate: 0.07,
    owner: 'Peter Vogel',
    market: 'DE',
    bookedImpressions: 4_600_000,
    productLine: 'Playable',
    language: 'de-DE',
    seed: 227,
  },
  {
    id: 'cmp-za02',
    salesforceId: '006Qy00000ALmM2IAB',
    name: 'Zalando Sneaker Drop',
    companyId: 'c-zalando',
    agencyId: 'ag-admeira',
    status: 'ended',
    primarySource: 'atk',
    flightStart: '2026-06-09',
    flightEnd: '2026-07-14',
    dailyImpressions: 96_000,
    viewability: 0.8,
    engagementRate: 0.064,
    owner: 'Peter Vogel',
    market: 'GB',
    bookedImpressions: 3_500_000,
    productLine: 'Playable',
    language: 'de-DE',
    seed: 233,
  },
];

/**
 * Finished campaigns from the previous year — what a portfolio that has been
 * running a while looks like, and what the Overview's year-over-year
 * comparison needs to have something to compare against. Same company,
 * owner, market and agency as that client's current campaigns, slightly lower
 * engagement; flights spread across 2025 so most periods (a quarter, Black
 * Friday week, Christmas) have a counterpart.
 */
const PRIOR_YEAR_FLIGHTS: { company: string; start: string; end: string; label: string }[] = [
  { company: 'c-swisscom', start: '2025-06-16', end: '2025-07-27', label: 'Summer Connect' },
  { company: 'c-lidl', start: '2025-07-28', end: '2025-09-07', label: 'Back to Savings' },
  { company: 'c-dm', start: '2025-08-04', end: '2025-09-14', label: 'Beauty Autumn' },
  { company: 'c-audi', start: '2025-09-01', end: '2025-10-12', label: 'Autumn Drive' },
  { company: 'c-migros', start: '2025-09-22', end: '2025-11-02', label: 'Harvest Festival' },
  { company: 'c-zalando', start: '2025-10-06', end: '2025-11-16', label: 'Autumn Drop Early' },
  { company: 'c-ikea', start: '2025-11-03', end: '2025-12-14', label: 'Winter Living' },
  { company: 'c-mediamarkt', start: '2025-11-17', end: '2025-12-02', label: 'Black Friday Deals' },
  { company: 'c-manor', start: '2025-11-24', end: '2025-12-24', label: 'Christmas Gift Guide' },
];

seeds.push(
  ...PRIOR_YEAR_FLIGHTS.map((f, i): CampaignSeed => {
    const base = seeds.find((s) => s.companyId === f.company)!;
    const days = (new Date(f.end).getTime() - new Date(f.start).getTime()) / 86_400_000 + 1;
    const n = String(i + 1).padStart(2, '0');
    return {
      ...base,
      id: `cmp-py${n}`,
      salesforceId: `006Qy00000PY${n}IAB`,
      name: `${companies.find((c) => c.id === f.company)!.name} ${f.label}`,
      status: 'ended',
      flightStart: f.start,
      flightEnd: f.end,
      dailyImpressions: Math.round(base.dailyImpressions * (0.8 + (i % 4) * 0.08)),
      viewability: base.viewability - 0.015,
      engagementRate: base.engagementRate * 0.92,
      missingSources: undefined,
      bookedImpressions: Math.round(base.dailyImpressions * days * 0.95),
      seed: 300 + i,
    };
  }),
);

/**
 * Finished flights from earlier in 2026 — the rest of the portfolio the team
 * has already run this year. They are ordinary campaigns (listed, openable,
 * with their own creatives) and the reason industries, markets and mechanics
 * have enough campaigns behind them for benchmarks to mean something. Same
 * client, owner and agency as that client's other campaigns; market and
 * primary source vary so the comparisons have something to compare.
 */
const EARLIER_2026_FLIGHTS: {
  company: string;
  start: string;
  end: string;
  label: string;
  market: string;
}[] = [
  {
    company: 'c-swisscom',
    start: '2026-01-12',
    end: '2026-02-22',
    label: 'Winter Connect',
    market: 'IT',
  },
  {
    company: 'c-swisscom',
    start: '2026-03-02',
    end: '2026-04-12',
    label: 'Fibre Spring',
    market: 'CH',
  },
  {
    company: 'c-swisscom',
    start: '2026-06-08',
    end: '2026-07-19',
    label: 'Summer Roaming',
    market: 'AT',
  },
  {
    company: 'c-nestle',
    start: '2026-03-09',
    end: '2026-04-12',
    label: 'Easter Treats',
    market: 'DE',
  },
  {
    company: 'c-nestle',
    start: '2026-06-01',
    end: '2026-07-12',
    label: 'Summer Coffee',
    market: 'CH',
  },
  {
    company: 'c-nestle',
    start: '2026-08-31',
    end: '2026-10-04',
    label: 'Autumn Kitchen',
    market: 'FR',
  },
  {
    company: 'c-mediamarkt',
    start: '2026-03-16',
    end: '2026-04-26',
    label: 'Spring Tech Days',
    market: 'DE',
  },
  {
    company: 'c-mediamarkt',
    start: '2026-07-06',
    end: '2026-08-16',
    label: 'Summer Sale',
    market: 'AT',
  },
  {
    company: 'c-ubs',
    start: '2026-02-23',
    end: '2026-04-05',
    label: 'Spring Savings',
    market: 'CH',
  },
  {
    company: 'c-ubs',
    start: '2026-05-04',
    end: '2026-06-14',
    label: 'Pension Month',
    market: 'DE',
  },
  {
    company: 'c-zalando',
    start: '2026-03-02',
    end: '2026-04-12',
    label: 'Spring Collection',
    market: 'DE',
  },
  {
    company: 'c-zalando',
    start: '2026-06-22',
    end: '2026-08-02',
    label: 'Summer Drop',
    market: 'FR',
  },
  {
    company: 'c-bmw',
    start: '2026-06-01',
    end: '2026-07-12',
    label: 'Summer Roadtrip',
    market: 'AT',
  },
  { company: 'c-ikea', start: '2026-03-23', end: '2026-05-03', label: 'Spring Home', market: 'DE' },
  {
    company: 'c-coop',
    start: '2026-04-13',
    end: '2026-05-24',
    label: 'Spring Garden',
    market: 'CH',
  },
];

seeds.push(
  ...EARLIER_2026_FLIGHTS.map((f, i): CampaignSeed => {
    const base = seeds.find((s) => s.companyId === f.company)!;
    const days = (new Date(f.end).getTime() - new Date(f.start).getTime()) / 86_400_000 + 1;
    const n = String(i + 1).padStart(2, '0');
    return {
      ...base,
      id: `cmp-e26${n}`,
      salesforceId: `006Qy00000E26${n}IAB`,
      name: `${companies.find((c) => c.id === f.company)!.name} ${f.label}`,
      status: 'ended',
      primarySource: (['custom', 'nexd', 'atk'] as const)[i % 3],
      market: f.market,
      flightStart: f.start,
      flightEnd: f.end,
      dailyImpressions: Math.round(base.dailyImpressions * (0.7 + (i % 5) * 0.1)),
      viewability: Math.min(0.92, base.viewability + ((i % 4) - 1.5) * 0.02),
      engagementRate: base.engagementRate * (0.85 + (i % 4) * 0.07),
      missingSources: undefined,
      bookedImpressions: Math.round(base.dailyImpressions * days * 0.95),
      seed: 400 + i,
    };
  }),
);

/** Stand-ins for what sales briefs in Salesforce: the main goal, the
 *  guaranteed floor and the budget (the last two are Brame-internal). The goal
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

// ---------------------------------------------------------------------------
// Mechanics
//
// A mechanic belongs to a creative (one size + one mechanic), not to the
// campaign: a campaign runs several creatives and they need not share one. The
// list is open-ended in the real data; this is just what the demo draws from.
// ---------------------------------------------------------------------------

const MECHANICS = [
  'Tap to Reveal',
  'Swipe to Reveal',
  'Scratch to Reveal',
  'Matchmaker',
  'Carousel',
  'Catcher',
  'Dropper',
  'Slider',
];
// Rough pull of each mechanic on engagement, and each market on delivery.
const MECHANIC_LIFT: Record<string, number> = {
  'Tap to Reveal': 1.25,
  'Swipe to Reveal': 1.15,
  'Scratch to Reveal': 1.2,
  Matchmaker: 1.1,
  Carousel: 0.85,
  Catcher: 1.05,
  Dropper: 0.95,
  Slider: 0.8,
};

function buildCampaign(s: CampaignSeed): Campaign {
  const company = companies.find((c) => c.id === s.companyId)!;
  const dates = daysBetween(s.flightStart, s.flightEnd);
  const rand = rng(s.seed);
  const missing = new Set(s.missingSources ?? []);
  const started = s.flightStart <= iso(TODAY);
  const tracksConversions = s.seed % 2 === 1;

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
    agencyId: s.agencyId ?? null,
    agencyName: s.agencyId ? (agencies.find((a) => a.id === s.agencyId)?.name ?? null) : null,
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
// a few times a day, never live. Brame's own instrumentation is the only
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
