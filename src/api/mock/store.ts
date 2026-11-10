// The "mock API" layer. TanStack Query hooks (src/hooks/*) call these
// functions instead of importing the arrays below directly — that boundary is
// what makes swapping this for real Supabase/REST calls later a data-layer
// change, not a component rewrite.
//
// State lives in the plain mutable arrays exported from mock/data.ts. Reads
// return shallow copies (so React sees a new reference and re-renders);
// writes mutate in place, then the caller invalidates the relevant query key
// so the next read picks up the change. There's no real network, so the
// artificial delay exists only to make loading states demonstrable.

import { addDays } from 'date-fns';
import {
  accounts,
  apiKeys,
  benchmarkCreatives,
  benchmarkPool,
  campaigns,
  companies,
  emailReports,
  inboxEvents,
  seatIdForAccount,
  seatIdForCompany,
  seatMembers,
  seats,
  syncRuns,
} from './data';
import { TODAY } from '@/lib/clock';
import {
  benchmarkContext,
  groupBenchmarks,
  overallStats,
  type BenchmarkContext,
  type BenchmarkGroup,
  type BenchmarkMetric,
  type BenchmarkScope,
  type Dimension,
  type Stats,
} from '@/features/benchmarks/lib/benchmarks';
import type {
  Account,
  ApiKey,
  BenchmarkCampaign,
  BenchmarkCreative,
  Campaign,
  Clicktag,
  EmailReport,
  InboxEvent,
  Seat,
  SeatMember,
  SeatRole,
  SourceKey,
  SyncRun,
} from '@/types';

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export async function fetchCampaigns(): Promise<Campaign[]> {
  await delay();
  return [...campaigns];
}

/** `null` when there is no such campaign — TanStack Query does not accept
 *  `undefined` as a result. */
export async function fetchCampaign(id: string): Promise<Campaign | null> {
  await delay(200);
  return campaigns.find((c) => c.id === id) ?? null;
}

export interface UpdateCampaignInput {
  name?: string;
  status?: Campaign['status'];
  primarySource?: SourceKey;
  appOwned?: Partial<Campaign['appOwned']>;
}

export async function updateCampaign(id: string, patch: UpdateCampaignInput): Promise<Campaign> {
  await delay();
  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) throw new Error(`Unknown campaign ${id}`);
  if (patch.name !== undefined) campaign.name = patch.name;
  if (patch.status !== undefined) campaign.status = patch.status;
  if (patch.primarySource !== undefined) campaign.primarySource = patch.primarySource;
  if (patch.appOwned) Object.assign(campaign.appOwned, patch.appOwned);
  return campaign;
}

export async function addClicktag(
  campaignId: string,
  clicktag: Omit<Clicktag, 'id'>
): Promise<Campaign> {
  await delay(250);
  const campaign = campaigns.find((c) => c.id === campaignId);
  if (!campaign) throw new Error(`Unknown campaign ${campaignId}`);
  campaign.appOwned.clicktags.push({ id: `ct-${campaignId}-${Date.now()}`, ...clicktag });
  return campaign;
}

export async function removeClicktag(campaignId: string, clicktagId: string): Promise<Campaign> {
  await delay(200);
  const campaign = campaigns.find((c) => c.id === campaignId);
  if (!campaign) throw new Error(`Unknown campaign ${campaignId}`);
  campaign.appOwned.clicktags = campaign.appOwned.clicktags.filter((c) => c.id !== clicktagId);
  return campaign;
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export async function fetchCompanies() {
  await delay(200);
  return [...companies];
}

export async function fetchAccounts(): Promise<Account[]> {
  await delay(200);
  return [...accounts];
}

// ---------------------------------------------------------------------------
// Seats & seat members
// ---------------------------------------------------------------------------

export async function fetchSeats(): Promise<Seat[]> {
  await delay(200);
  return [...seats];
}

export async function fetchSeatMembers(seatId?: string): Promise<SeatMember[]> {
  await delay(250);
  return seatId ? seatMembers.filter((m) => m.seatId === seatId) : [...seatMembers];
}

/**
 * Accounts and clients are never created here — they live in Salesforce and
 * arrive through the nightly sync, same as campaigns. Creating a seat only
 * ever links to one that's already been pulled in; only 'account' and
 * 'client' are ever created by hand — there is exactly one Admin seat and
 * one Klea seat, both pre-seeded.
 */
export type CreateSeatInput = { category: 'account'; accountId: string } | { category: 'client'; companyId: string };

export async function createSeat(input: CreateSeatInput): Promise<Seat> {
  await delay(300);

  if (input.category === 'account') {
    const account = accounts.find((a) => a.id === input.accountId);
    if (!account) throw new Error(`Unknown account ${input.accountId}`);
    const existing = seats.find((s) => s.category === 'account' && s.accountId === account.id);
    if (existing) return existing;
    const seat: Seat = { id: seatIdForAccount(account.id), category: 'account', name: account.name, accountId: account.id };
    seats.push(seat);
    return seat;
  }

  const company = companies.find((c) => c.id === input.companyId);
  if (!company) throw new Error(`Unknown company ${input.companyId}`);
  const existing = seats.find((s) => s.category === 'client' && s.companyId === company.id);
  if (existing) return existing;
  const seat: Seat = { id: seatIdForCompany(company.id), category: 'client', name: company.name, companyId: company.id };
  seats.push(seat);
  return seat;
}

export interface InviteSeatMemberInput {
  seatId: string;
  name: string;
  email: string;
  role: SeatRole;
}

export async function inviteSeatMember(input: InviteSeatMemberInput): Promise<SeatMember> {
  await delay(300);
  const member: SeatMember = {
    id: `m-${Date.now()}`,
    seatId: input.seatId,
    name: input.name,
    email: input.email,
    role: input.role,
    status: 'pending',
    lastSeenAt: null,
  };
  seatMembers.push(member);
  return member;
}

export async function updateSeatMemberRole(memberId: string, role: SeatRole): Promise<SeatMember> {
  await delay(200);
  const member = seatMembers.find((m) => m.id === memberId);
  if (!member) throw new Error(`Unknown seat member ${memberId}`);
  member.role = role;
  return member;
}

export async function removeSeatMember(memberId: string): Promise<void> {
  await delay(250);
  const idx = seatMembers.findIndex((m) => m.id === memberId);
  if (idx !== -1) seatMembers.splice(idx, 1);
}

/** Stands in for re-sending the invite email — there's no real email to
 *  resend, so this just confirms the member is still pending. */
export async function resendInvite(memberId: string): Promise<SeatMember> {
  await delay(300);
  const member = seatMembers.find((m) => m.id === memberId);
  if (!member) throw new Error(`Unknown seat member ${memberId}`);
  return member;
}

/** Demo-only stand-in for the member actually clicking the invite link —
 *  there's no real email/auth flow here, so this is how a presenter can show
 *  the pending → accepted transition without a second browser. */
export async function acceptInvite(memberId: string): Promise<SeatMember> {
  await delay(300);
  const member = seatMembers.find((m) => m.id === memberId);
  if (!member) throw new Error(`Unknown seat member ${memberId}`);
  member.status = 'accepted';
  member.lastSeenAt = TODAY.toISOString();
  inboxEvents.push({
    id: `ev-invite-${member.id}-${Date.now()}`,
    kind: 'invitation',
    createdAt: TODAY.toISOString(),
    seatId: member.seatId,
    seatName: seats.find((s) => s.id === member.seatId)?.name ?? '',
    memberName: member.name,
    memberEmail: member.email,
  });
  return member;
}

// ---------------------------------------------------------------------------
// API keys — read-only BI credentials owned by a seat.
//
// The real backend stores a hash of the secret and returns the secret exactly
// once, from the create call. This mirrors that: the secret is generated here,
// handed back, and only its prefix is kept.
// ---------------------------------------------------------------------------

const KEY_TAG = 'bms_live_';
const KEY_PREFIX_LENGTH = KEY_TAG.length + 8;
// No 0/O/1/l/I — a key that gets read off a screen shouldn't be ambiguous.
const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function generateApiKeySecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(40));
  return KEY_TAG + Array.from(bytes, (b) => KEY_ALPHABET[b % KEY_ALPHABET.length]).join('');
}

/** A seat's own keys, newest first. Revoked ones stay listed — the audit trail
 *  of what used to have access is part of the point. */
export async function fetchApiKeys(seatId: string): Promise<ApiKey[]> {
  await delay(250);
  return apiKeys
    .map((key, index) => ({ key, index }))
    .filter(({ key }) => key.seatId === seatId)
    .sort((a, b) => new Date(b.key.createdAt).getTime() - new Date(a.key.createdAt).getTime() || b.index - a.index)
    .map(({ key }) => key);
}

export interface CreateApiKeyInput {
  seatId: string;
  name: string;
  createdBy: string;
  /** Null means the key never expires. */
  expiresInDays: number | null;
}

export async function createApiKey(input: CreateApiKeyInput): Promise<{ key: ApiKey; secret: string }> {
  await delay(300);
  const secret = generateApiKeySecret();
  const key: ApiKey = {
    id: `key-${Date.now()}`,
    seatId: input.seatId,
    name: input.name,
    prefix: secret.slice(0, KEY_PREFIX_LENGTH),
    createdAt: TODAY.toISOString(),
    createdBy: input.createdBy,
    lastUsedAt: null,
    expiresAt: input.expiresInDays === null ? null : addDays(TODAY, input.expiresInDays).toISOString(),
    revokedAt: null,
  };
  apiKeys.push(key);
  return { key, secret };
}

export async function revokeApiKey(id: string): Promise<ApiKey> {
  await delay(250);
  const key = apiKeys.find((k) => k.id === id);
  if (!key) throw new Error(`Unknown API key ${id}`);
  // Revoking twice must not move the original revocation time.
  if (!key.revokedAt) key.revokedAt = TODAY.toISOString();
  return key;
}

// ---------------------------------------------------------------------------
// Connector sync runs — newest first.
// ---------------------------------------------------------------------------

export async function fetchSyncRuns(): Promise<SyncRun[]> {
  await delay(200);
  return [...syncRuns];
}

// ---------------------------------------------------------------------------
// Inbox — events written when something finished or changed. Whether a person
// has read them is that person's own state, kept by the app, not here.
// ---------------------------------------------------------------------------

export async function fetchInboxEvents(): Promise<InboxEvent[]> {
  await delay(150);
  return [...inboxEvents];
}

// ---------------------------------------------------------------------------
// Email reports — human-readable performance summaries.
// ---------------------------------------------------------------------------

export async function fetchEmailReports(): Promise<EmailReport[]> {
  await delay(200);
  return [...emailReports];
}

export interface EmailReportInput {
  scope: EmailReport['scope'];
  name: string;
  recipients: string[];
  metrics: EmailReport['metrics'];
  granularity: EmailReport['granularity'];
  cadence: EmailReport['cadence'];
  dayOfWeek?: EmailReport['dayOfWeek'];
  format: EmailReport['format'];
  enabled: EmailReport['enabled'];
}

export async function createEmailReport(input: EmailReportInput): Promise<EmailReport> {
  await delay(300);
  const report: EmailReport = { id: `er-${Date.now()}`, lastSentAt: null, ...input };
  emailReports.push(report);
  return report;
}

export async function updateEmailReport(id: string, patch: EmailReportInput): Promise<EmailReport> {
  await delay(300);
  const report = emailReports.find((r) => r.id === id);
  if (!report) throw new Error(`Unknown email report ${id}`);
  Object.assign(report, patch);
  return report;
}

export async function deleteEmailReport(id: string): Promise<void> {
  await delay(250);
  const idx = emailReports.findIndex((r) => r.id === id);
  if (idx !== -1) emailReports.splice(idx, 1);
}

export async function setEmailReportEnabled(id: string, enabled: boolean): Promise<EmailReport> {
  await delay(200);
  const report = emailReports.find((r) => r.id === id);
  if (!report) throw new Error(`Unknown email report ${id}`);
  report.enabled = enabled;
  return report;
}

/** What the "send sample" action hands the backend: one address and the
 *  fully rendered email — the real send happens there; this only simulates it. */
export interface SampleReportRequest {
  to: string;
  subject: string;
  attachment: string | null;
}

/** Sends a dummy report to a single address so a layout can be confirmed
 *  before the report is saved. Deliberately touches no saved report — a
 *  sample is not a run, so it never changes "last sent". */
export async function sendSampleEmailReport(request: SampleReportRequest): Promise<{ to: string; sentAt: string }> {
  await delay(900);
  return { to: request.to, sentAt: new Date().toISOString() };
}

export async function sendTestEmailReport(id: string): Promise<EmailReport> {
  await delay(600);
  const report = emailReports.find((r) => r.id === id);
  if (!report) throw new Error(`Unknown email report ${id}`);
  report.lastSentAt = new Date().toISOString();
  inboxEvents.push({
    id: `ev-report-${report.id}-${Date.now()}`,
    kind: 'report',
    createdAt: TODAY.toISOString(),
    reportId: report.id,
    reportName: report.name,
    recipientCount: report.recipients.length,
    format: report.format,
  });
  return report;
}

// ---------------------------------------------------------------------------
// Benchmarks
//
// Grouping and percentiles run server-side in the real platform, so they are
// done here rather than in the view — the hook receives finished buckets, the
// same shape a /api/benchmarks response would deliver.
// ---------------------------------------------------------------------------

interface BenchmarkResponse {
  groups: BenchmarkGroup[];
  overall: Record<BenchmarkMetric, Stats | null>;
  /** Campaigns inside the rolling window, for the summary tiles. */
  windowCampaignCount: number;
}

export async function fetchBenchmarks(dimension: Dimension, scope?: BenchmarkScope): Promise<BenchmarkResponse> {
  await delay(350);
  const groups = groupBenchmarks(benchmarkPool, dimension, TODAY, scope);
  return {
    groups,
    overall: overallStats(benchmarkPool, TODAY, scope),
    windowCampaignCount: groups.reduce((sum, g) => sum + g.campaignCount, 0),
  };
}

/** Every benchmark campaign (the 12-month window is applied by the caller's
 *  comparisons). Internal-only: the matrix and the mechanic view are cut from
 *  it, and clients/accounts never get it — they get `fetchBenchmarkContext`. */
export async function fetchBenchmarkPool(): Promise<BenchmarkCampaign[]> {
  await delay(300);
  return benchmarkPool;
}

/** Every creative (size + mechanic) behind the benchmark pool — what mechanics
 *  are benchmarked on. Internal-only, like the pool. */
export async function fetchBenchmarkCreatives(): Promise<BenchmarkCreative[]> {
  await delay(300);
  return benchmarkCreatives;
}

/** A client against its industry (and, for Klea seats only, against KLEA).
 *  What a client or account seat is allowed to see — never another client's
 *  numbers, never an account's, never the wider pool. */
export async function fetchBenchmarkContext(companyId: string, includeBrame: boolean): Promise<BenchmarkContext> {
  await delay(250);
  return benchmarkContext(benchmarkPool, companyId, TODAY, includeBrame);
}

export async function fetchBenchmarkGroup(
  dimension: Dimension,
  key: string
): Promise<{ group: BenchmarkGroup; overall: Record<BenchmarkMetric, Stats | null> } | null> {
  await delay(250);
  const group = groupBenchmarks(benchmarkPool, dimension, TODAY).find((g) => g.key === key);
  if (!group) return null;
  return { group, overall: overallStats(benchmarkPool, TODAY) };
}
