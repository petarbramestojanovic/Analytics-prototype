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

import { campaigns, companies, schedules, users } from './data';
import type { Campaign, Clicktag, CompanyUser, SourceKey, UserRole } from './types';

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
// Scheduled reports
// ---------------------------------------------------------------------------

export async function fetchSchedules() {
  await delay(200);
  return [...schedules];
}

export async function setScheduleEnabled(id: string, enabled: boolean) {
  await delay(200);
  const schedule = schedules.find((s) => s.id === id);
  if (!schedule) throw new Error(`Unknown schedule ${id}`);
  schedule.enabled = enabled;
  return schedule;
}
