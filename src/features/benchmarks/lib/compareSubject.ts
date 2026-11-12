import { parseSelection } from '@/lib/selection';
import type { BenchmarkCampaign } from '@/types';
import {
  partMatches,
  SLICE_DIMS,
  sliceKey,
  sliceLabel,
  type SliceDim,
  type SlicePart,
} from './benchmarks';

/** What the Compare view is about: one campaign, or a **segment** — all the
 *  campaigns matching any mix of cuts (a client; a client in one market; an
 *  industry in two markets; Germany and Austria together …). No cuts at all is
 *  the whole KLEA network. Everything else on the page — the matrix and the
 *  charts — is measured against it. */
export const SUBJECT_KINDS = ['campaign', 'segment'] as const;
export type SubjectKind = (typeof SUBJECT_KINDS)[number];

/** Reads the `kind` URL param. `client` and `industry` are what older links
 *  carry — a segment of that one cut. */
export const parseSubjectKind = (value: string | null | undefined): SubjectKind =>
  value === 'segment' || value === 'client' || value === 'industry' ? 'segment' : 'campaign';

export interface CompareSubject {
  kind: SubjectKind;
  /** A campaign's id, or a segment's cuts written out (`client=c-x&market=DE`). */
  id: string;
  name: string;
  /** Second header line: a campaign's client. */
  subtitle: string | null;
  /** The cuts that define a segment (none for a campaign, or for all of KLEA). */
  cuts: SlicePart[];
  /** For each cut of a segment, the display name of every bucket it names
   *  (null = direct bookings) — "DE", "AT" for a Germany + Austria cut. */
  cutLabels: Partial<Record<SliceDim, (string | null)[]>>;
  /** Every campaign in the subject (one, for a campaign). */
  campaigns: BenchmarkCampaign[];
  /** Per cut, the bucket all its campaigns share — null where they differ
   *  (a client running in several markets has no single market). */
  keys: Record<SliceDim, string | null>;
  /** Display name of that bucket; null for direct bookings (and for "varies"). */
  labels: Record<SliceDim, string | null>;
}

function shared(campaigns: BenchmarkCampaign[], dim: SliceDim) {
  const keys = new Set(campaigns.map((c) => sliceKey(c, dim)));
  if (keys.size !== 1) return { key: null, label: null };
  return { key: [...keys][0], label: sliceLabel(campaigns[0], dim) };
}

function make(
  kind: SubjectKind,
  id: string,
  cuts: SlicePart[],
  campaigns: BenchmarkCampaign[],
): CompareSubject {
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
    // A segment's name is built from its buckets where it is shown (they need
    // translating — "Direct"); this is the plain fallback.
    name:
      kind === 'campaign'
        ? first.name
        : cuts.map((c) => labels[c.dim] ?? 'Direct').join(' · ') || 'KLEA',
    subtitle: kind === 'campaign' ? first.companyName : null,
    cuts,
    cutLabels: Object.fromEntries(
      cuts.map((cut) => [
        cut.dim,
        parseSelection(cut.value).map((v) => {
          const c = campaigns.find((x) => sliceKey(x, cut.dim) === v);
          return c ? sliceLabel(c, cut.dim) : v;
        }),
      ]),
    ),
    campaigns,
    keys,
    labels,
  };
}

const matches = (c: BenchmarkCampaign, cuts: readonly SlicePart[]) =>
  cuts.every((p) => partMatches(c, p));

/** Cuts in their fixed order, one per cut, empty values dropped. */
const tidy = (cuts: readonly SlicePart[]): SlicePart[] =>
  SLICE_DIMS.flatMap((d) => cuts.filter((c) => c.dim === d && c.value).slice(0, 1));

/** The cuts as a URL-style string; the same cuts always read the same. */
export const cutsId = (cuts: readonly SlicePart[]) =>
  tidy(cuts)
    .map((c) => `${c.dim}=${c.value}`)
    .join('&');

/** Every campaign as a subject — for the campaign picker. */
export function campaignSubjects(pool: BenchmarkCampaign[]): CompareSubject[] {
  return pool.map((c) => make('campaign', c.id, [], [c]));
}

export function findCampaign(pool: BenchmarkCampaign[], id: string | null): CompareSubject | null {
  const c = id ? pool.find((x) => x.id === id) : undefined;
  return c ? make('campaign', c.id, [], [c]) : null;
}

/** The segment those cuts describe — all of KLEA when none is set, null if no
 *  campaign matches. */
export function findSegment(
  pool: BenchmarkCampaign[],
  cuts: readonly SlicePart[],
): CompareSubject | null {
  const clean = tidy(cuts);
  const campaigns = pool.filter((c) => matches(c, clean));
  return campaigns.length ? make('segment', cutsId(clean), clean, campaigns) : null;
}

/** Ids to leave out of a benchmark so the subject isn't judged against itself. */
export const subjectIds = (subject: CompareSubject): ReadonlySet<string> =>
  new Set(subject.campaigns.map((c) => c.id));

/** The campaigns of `pool` a set of cuts picks out. */
export const campaignsWhere = (pool: BenchmarkCampaign[], cuts: readonly SlicePart[]) =>
  pool.filter((c) => matches(c, cuts));
