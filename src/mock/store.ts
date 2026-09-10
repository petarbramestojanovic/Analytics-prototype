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

import { benchmarkPool, campaigns, companies, emailReports, users, TODAY } from './data';
import { groupBenchmarks, overallStats, type BenchmarkGroup, type Dimension, type Stats } from '../lib/benchmarks';
import type { BenchmarkMetric } from '../lib/benchmarks';
import type { Campaign, Clicktag, CompanyUser, EmailReport, MetricKey, SourceKey, UserRole } from './types';

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export async function fetchCampaigns(): Promise<Campaign[]> {
  await delay();
  return [...campaigns];
}

export async function fetchCampaign(id: string): Promise<Campaign | undefined> {
  await delay(200);
  return campaigns.find((c) => c.id === id);
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
// Companies & users
// ---------------------------------------------------------------------------

export async function fetchCompanies() {
  await delay(200);
  return [...companies];
}

export async function fetchUsers(companyId?: string): Promise<CompanyUser[]> {
  await delay(250);
  return companyId ? users.filter((u) => u.companyId === companyId) : [...users];
}

export interface AddUserInput {
  name: string;
  email: string;
  companyId: string;
  role: UserRole;
}

export async function addUser(input: AddUserInput): Promise<CompanyUser> {
  await delay(300);
  const user: CompanyUser = {
    id: `u-${Date.now()}`,
    name: input.name,
    email: input.email,
    companyId: input.companyId,
    role: input.role,
    twoFactor: false,
    lastSeen: 'not yet signed in',
  };
  users.push(user);
  return user;
}

export async function updateUserRole(userId: string, role: UserRole): Promise<CompanyUser> {
  await delay(200);
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error(`Unknown user ${userId}`);
  user.role = role;
  return user;
}

export async function deleteUser(userId: string): Promise<void> {
  await delay(250);
  const idx = users.findIndex((u) => u.id === userId);
  if (idx !== -1) users.splice(idx, 1);
}

// ---------------------------------------------------------------------------
// Email reports — human-readable performance summaries.
// ---------------------------------------------------------------------------

export async function fetchEmailReports(): Promise<EmailReport[]> {
  await delay(200);
  return [...emailReports];
}

export interface EmailReportInput {
  companyId: string;
  companyName: string;
  name: string;
  recipients: string[];
  metrics: MetricKey[];
  cadence: EmailReport['cadence'];
  dayOfWeek?: EmailReport['dayOfWeek'];
  format: EmailReport['format'];
}

export async function createEmailReport(input: EmailReportInput): Promise<EmailReport> {
  await delay(300);
  const report: EmailReport = { id: `er-${Date.now()}`, enabled: true, lastSentAt: null, ...input };
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

export async function sendTestEmailReport(id: string): Promise<EmailReport> {
  await delay(600);
  const report = emailReports.find((r) => r.id === id);
  if (!report) throw new Error(`Unknown email report ${id}`);
  report.lastSentAt = new Date().toISOString();
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

export async function fetchBenchmarks(dimension: Dimension): Promise<BenchmarkResponse> {
  await delay(350);
  const groups = groupBenchmarks(benchmarkPool, dimension, TODAY);
  return {
    groups,
    overall: overallStats(benchmarkPool, TODAY),
    windowCampaignCount: groups.reduce((sum, g) => sum + g.campaignCount, 0),
  };
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
