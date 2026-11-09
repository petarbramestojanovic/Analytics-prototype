import type { Account, ApiKey, Company, Seat, SeatMember } from '@/types';

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
// Accounts — who booked the campaign on the client's behalf. Not every
// campaign has one; a null accountId on the seed means booked direct.
// ---------------------------------------------------------------------------

export const accounts: Account[] = [
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
// There is exactly one Admin seat and one Klea seat system-wide; every
// existing company gets its own client seat. Account seats aren't pre-seeded
// — nobody's registered under one yet, so they only appear once an admin
// creates one from the Seats page.
// ---------------------------------------------------------------------------

const ADMIN_SEAT_ID = 'seat-admin';
const BRAME_SEAT_ID = 'seat-brame';

export function seatIdForCompany(companyId: string): string {
  return `seat-client-${companyId}`;
}

export function seatIdForAccount(accountId: string): string {
  return `seat-account-${accountId}`;
}

export const seats: Seat[] = [
  { id: ADMIN_SEAT_ID, category: 'admin', name: 'Admin' },
  { id: BRAME_SEAT_ID, category: 'brame', name: 'Klea' },
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
    email: 'alex.weber@klea.io',
    role: 'admin',
    status: 'accepted',
    lastSeenAt: '2026-10-28T09:20:00+01:00',
  },
  {
    id: 'm-brame-1',
    seatId: BRAME_SEAT_ID,
    name: 'Nadia Brunner',
    email: 'nadia.brunner@klea.io',
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
    name: 'Klea BI: all clients',
    prefix: 'bms_live_m2Xj6GaS',
    createdAt: '2026-07-29T11:00:00+02:00',
    createdBy: 'Alex Weber',
    lastUsedAt: '2026-10-28T09:00:00+01:00',
    expiresAt: null,
    revokedAt: null,
  },
];
