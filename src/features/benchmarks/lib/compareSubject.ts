import type { BenchmarkCampaign } from '@/types';
import { SLICE_DIMS, sliceKey, sliceLabel, type SliceDim } from './benchmarks';

/** What the Compare view is about: one campaign, or a whole client, or a whole
 *  industry (all the campaigns in it). Everything else on the page — the matrix
 *  and the charts — is measured against it. */
export const SUBJECT_KINDS = ['campaign', 'client', 'industry'] as const;
export type SubjectKind = (typeof SUBJECT_KINDS)[number];

export const parseSubjectKind = (value: string | null | undefined): SubjectKind =>
  (SUBJECT_KINDS as readonly string[]).includes(value ?? '') ? (value as SubjectKind) : 'campaign';

export interface CompareSubject {
  kind: SubjectKind;
  /** Campaign id, company id, or the industry name. */
  id: string;
  name: string;
  /** Second header line: the client of a campaign, the industry of a client. */
  subtitle: string | null;
  /** Every campaign in the subject (one, for a campaign). */
  campaigns: BenchmarkCampaign[];
  /** Per cut, the bucket all its campaigns share — null where they differ
   *  (a client running in several markets has no single market). */
  keys: Record<SliceDim, string | null>;
  /** Display name of that bucket; null for direct bookings (and for "varies"). */
  labels: Record<SliceDim, string | null>;
}

const BY_KIND: Record<SubjectKind, (c: BenchmarkCampaign) => string> = {
  campaign: (c) => c.id,
  client: (c) => c.companyId,
  industry: (c) => c.industry,
};

function shared(campaigns: BenchmarkCampaign[], dim: SliceDim) {
  const keys = new Set(campaigns.map((c) => sliceKey(c, dim)));
  if (keys.size !== 1) return { key: null, label: null };
  return { key: [...keys][0], label: sliceLabel(campaigns[0], dim) };
}

function make(kind: SubjectKind, id: string, campaigns: BenchmarkCampaign[]): CompareSubject {
  const first = campaigns[0];
  const keys = {} as Record<SliceDim, string | null>;
  const labels = {} as Record<SliceDim, string | null>;
  for (const dim of SLICE_DIMS) {
    const s = shared(campaigns, dim);
    keys[dim] = s.key;
    labels[dim] = s.label;
  }
  return {
    kind,
    id,
    name: kind === 'campaign' ? first.name : kind === 'client' ? first.companyName : first.industry,
    subtitle: kind === 'campaign' ? first.companyName : kind === 'client' ? first.industry : null,
    campaigns,
    keys,
    labels,
  };
}

/** Every subject of one kind that the pool has campaigns for. */
export function subjectsOf(pool: BenchmarkCampaign[], kind: SubjectKind): CompareSubject[] {
  const groups = new Map<string, BenchmarkCampaign[]>();
  for (const c of pool) {
    const id = BY_KIND[kind](c);
    groups.set(id, [...(groups.get(id) ?? []), c]);
  }
  return [...groups].map(([id, campaigns]) => make(kind, id, campaigns));
}

export function findSubject(
  pool: BenchmarkCampaign[],
  kind: SubjectKind,
  id: string | null,
): CompareSubject | null {
  if (!id) return null;
  const campaigns = pool.filter((c) => BY_KIND[kind](c) === id);
  return campaigns.length ? make(kind, id, campaigns) : null;
}

/** The cut a client or industry subject is itself — its own bucket there, not a
 *  benchmark to compare it with. A campaign is none of them. */
const SELF_DIM: Partial<Record<SubjectKind, SliceDim>> = { client: 'client', industry: 'industry' };

/** The bucket the subject shares with its benchmark column for `dim`: null when
 *  that cut doesn't apply — it is the subject itself, or the subject's
 *  campaigns span several buckets of it. */
export function ownKey(subject: CompareSubject, dim: SliceDim): string | null {
  return SELF_DIM[subject.kind] === dim ? null : subject.keys[dim];
}

/** Ids to leave out of a benchmark so the subject isn't judged against itself. */
export const subjectIds = (subject: CompareSubject): ReadonlySet<string> =>
  new Set(subject.campaigns.map((c) => c.id));
