import type { Campaign, SourceKey } from '@/types';
import { accounts, companies } from './companies';

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

// Salesforce users. The mock has no profile photos, so avatars fall back to
// initials; a real sync fills `avatarUrl` from Salesforce's SmallPhotoUrl.
export const CAMPAIGN_MANAGERS = [
  'Nina Keller',
  'Tobias Frei',
  'Lena Vogel',
  'David Marti',
  'Sara Brunner',
];

export const personFor = (name: string): Campaign['salesforce']['salesPerson'] => ({
  id: `sf-user-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`,
  name,
  avatarUrl: null,
});

export interface CampaignSeed {
  id: string;
  salesforceId: string;
  name: string;
  companyId: string;
  status: Campaign['status'];
  primarySource: SourceKey;
  flightStart: string;
  flightEnd: string;
  /** Paused campaigns only: the last day it delivered before it was paused. */
  pausedOn?: string;
  dailyImpressions: number;
  viewability: number;
  engagementRate: number;
  /** Sources with no connector configured render blank, never zero. */
  missingSources?: SourceKey[];
  /** Undefined/omitted means booked directly with the client, no account. */
  accountId?: string;
  owner: string;
  market: string;
  bookedImpressions: number;
  productLine: string;
  language: string;
  seed: number;
}

export const seeds: CampaignSeed[] = [
  {
    id: 'cmp-8f21',
    salesforceId: '006Qy00000ALm3aIAB',
    name: 'Migros Cumulus Summer',
    companyId: 'c-migros',
    accountId: 'ag-goldbach',
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
    accountId: 'ag-admeira',
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
    status: 'paused',
    primarySource: 'nexd',
    flightStart: '2026-10-07',
    flightEnd: '2026-11-19',
    pausedOn: '2026-10-21',
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
    id: 'cmp-7a93',
    salesforceId: '006Qy00000ALm70IAB',
    name: 'dm Beauty Days',
    companyId: 'c-dm',
    accountId: 'ag-havas',
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
    accountId: 'ag-groupm',
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
    id: 'cmp-au01',
    salesforceId: '006Qy00000ALmC1IAB',
    name: 'Audi e-tron Awareness',
    companyId: 'c-audi',
    accountId: 'ag-goldbach',
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
    accountId: 'ag-admeira',
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
    accountId: 'ag-omd',
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
    accountId: 'ag-havas',
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
    accountId: 'ag-groupm',
    status: 'paused',
    primarySource: 'custom',
    flightStart: '2026-09-29',
    flightEnd: '2026-12-09',
    pausedOn: '2026-10-18',
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
    accountId: 'ag-dentsu',
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
    id: 'cmp-mm02',
    salesforceId: '006Qy00000ALmG2IAB',
    name: 'MediaMarkt Gaming Week',
    companyId: 'c-mediamarkt',
    accountId: 'ag-vizeum',
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
    accountId: 'ag-goldbach',
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
    accountId: 'ag-admeira',
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
    accountId: 'ag-havas',
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
    accountId: 'ag-groupm',
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
    id: 'cmp-ne01',
    salesforceId: '006Qy00000ALmL1IAB',
    name: 'Nestlé KitKat Break',
    companyId: 'c-nestle',
    status: 'paused',
    primarySource: 'atk',
    flightStart: '2026-10-01',
    flightEnd: '2026-11-29',
    pausedOn: '2026-10-22',
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
    accountId: 'ag-vizeum',
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
    accountId: 'ag-goldbach',
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
    accountId: 'ag-admeira',
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
 * owner, market and account as that client's current campaigns, slightly lower
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
 * client, owner and account as that client's other campaigns; market and
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

// ---------------------------------------------------------------------------
// Volume campaigns
//
// The hand-written campaigns above are too few for a benchmark to rest on —
// most industry × market cells fell under the 3-campaign floor and read blank.
// These fill every industry in every market with real, listed campaigns (they
// show up in the Campaigns list and open like any other), generated
// deterministically so the data is the same on every load.
// ---------------------------------------------------------------------------

const VOLUME_MARKETS = ['CH', 'DE', 'AT', 'FR', 'IT', 'GB'];
const VOLUME_LANGUAGE: Record<string, string> = {
  CH: 'de-CH',
  DE: 'de-DE',
  AT: 'de-AT',
  FR: 'fr-FR',
  IT: 'it-IT',
  GB: 'en-GB',
};
const VOLUME_LABELS = [
  'Spring Launch',
  'Summer Sale',
  'Back to School',
  'Black Friday',
  'Autumn Promo',
  'Winter Warmup',
  'Brand Awareness',
  'Product Drop',
  'Loyalty Push',
  'Easter Special',
  'Holiday Gifting',
  'New Season',
];
// Rough engagement level per industry, so the benchmarks differ between them.
const INDUSTRY_ENGAGEMENT: Record<string, number> = {
  'Food Retail': 0.056,
  'Tech-Telco': 0.048,
  Retail: 0.06,
  Automotive: 0.052,
  'Technical Appliances': 0.062,
  'Finance & Insurance': 0.042,
  'FMCG / CPG': 0.066,
  eCommerce: 0.07,
};
// Each market pulls a little above or below the industry level.
const MARKET_ENGAGEMENT: Record<string, number> = { CH: 0.95, DE: 1.0, AT: 1.08, FR: 0.98, IT: 1.04, GB: 0.9 };

function volumeSeeds(): CampaignSeed[] {
  let state = 20_261_028;
  const rand = () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];
  const owners = [...new Set(seeds.map((s) => s.owner))];
  const industries = [...new Set(companies.map((c) => c.industry))];
  const TODAY_MS = new Date('2026-10-28').getTime();
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const DAY = 86_400_000;

  const out: CampaignSeed[] = [];
  let pausableLive = 0;
  // Three campaigns per industry × market, then a few more on the busiest cells.
  const plan: { industry: string; market: string; source: SourceKey }[] = [];
  for (const industry of industries)
    for (const market of VOLUME_MARKETS) for (let k = 0; k < 3; k++) plan.push({ industry, market, source: k % 2 ? 'nexd' : 'custom' });
  for (let k = 0; k < 11; k++) {
    plan.push({ industry: industries[k % industries.length], market: VOLUME_MARKETS[k % VOLUME_MARKETS.length], source: 'atk' });
  }

  plan.forEach(({ industry, market, source }, i) => {
    const inIndustry = companies.filter((c) => c.industry === industry);
    const company = inIndustry[i % inIndustry.length];
    const roll = rand();
    const length = 14 + Math.floor(rand() * 29);
    let start: number;
    let status: Campaign['status'];
    let pausedOn: string | undefined;
    // A flight that starts in the future has no status of its own (there is
    // no "scheduled"), so it is left out. Its random draws are still taken, so
    // every other generated campaign stays exactly as it was.
    let future = false;
    if (roll < 0.28) {
      // Running today — except every fifth one that has been going a while,
      // which was paused part-way through and keeps the history it delivered.
      start = TODAY_MS - (2 + Math.floor(rand() * (length - 4))) * DAY;
      status = 'live';
      if (TODAY_MS - start >= 7 * DAY && pausableLive++ % 5 === 0) {
        status = 'paused';
        pausedOn = iso(start + Math.floor(((TODAY_MS - start) / DAY) * 0.6) * DAY);
      }
    } else if (roll < 0.33) {
      start = TODAY_MS + (3 + Math.floor(rand() * 30)) * DAY;
      status = 'ended';
      future = true;
    } else {
      // Finished within the last year (a flight must end before today).
      start = TODAY_MS - (length + 3 + Math.floor(rand() * (330 - length))) * DAY;
      status = 'ended';
    }
    const end = start + (length - 1) * DAY;
    const dailyImpressions = Math.round((30_000 + rand() * 210_000) / 1_000) * 1_000;
    const n = String(i + 1).padStart(3, '0');
    const account = rand() < 0.7 ? pick(accounts).id : undefined;
    const generated: CampaignSeed = {
      id: `cmp-v${n}`,
      salesforceId: `006Qy00000V${n}IAB`,
      name: `${company.name} ${VOLUME_LABELS[(i * 5 + Math.floor(rand() * 7)) % VOLUME_LABELS.length]} ${market}`,
      companyId: company.id,
      accountId: account,
      status,
      primarySource: source,
      flightStart: iso(start),
      flightEnd: iso(end),
      ...(pausedOn && { pausedOn }),
      dailyImpressions,
      viewability: Math.round((0.68 + rand() * 0.22) * 1000) / 1000,
      engagementRate: Math.round((INDUSTRY_ENGAGEMENT[industry] ?? 0.05) * MARKET_ENGAGEMENT[market] * (0.8 + rand() * 0.4) * 10_000) / 10_000,
      owner: pick(owners),
      market,
      bookedImpressions: Math.round(dailyImpressions * length * (0.92 + rand() * 0.16)),
      productLine: 'Playable',
      language: VOLUME_LANGUAGE[market],
      seed: 1000 + i,
    };
    if (!future) out.push(generated);
  });
  return out;
}

seeds.push(...volumeSeeds());

// ---------------------------------------------------------------------------
// Mechanics
//
// A mechanic belongs to a creative (one size + one mechanic), not to the
// campaign: a campaign runs several creatives and they need not share one. The
// list is open-ended in the real data; this is just what the demo draws from.
// ---------------------------------------------------------------------------

export const MECHANICS = [
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
export const MECHANIC_LIFT: Record<string, number> = {
  'Tap to Reveal': 1.25,
  'Swipe to Reveal': 1.15,
  'Scratch to Reveal': 1.2,
  Matchmaker: 1.1,
  Carousel: 0.85,
  Catcher: 1.05,
  Dropper: 0.95,
  Slider: 0.8,
};
