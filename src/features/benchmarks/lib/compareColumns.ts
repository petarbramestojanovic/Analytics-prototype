import type { BenchmarkCampaign } from '@/types';
import { BENCHMARK_METRICS, sliceStats, type MetricStats, type SlicePart } from './benchmarks';
import { campaignsWhere, subjectIds, type CompareSubject } from './compareSubject';
import type { MatrixColumn } from './compareViews';

/** What a matrix column is measured on, for one subject. */
export type ResolvedColumn =
  { kind: 'slice'; parts: SlicePart[] } | { kind: 'campaign'; campaign: BenchmarkCampaign };

/** Resolves a column against the subject and the pool — null when it doesn't
 *  apply: the subject has no single bucket of a cut ("same market" for a client
 *  in several markets), the column would be the subject itself, or the named
 *  campaign is gone. */
export function resolveColumn(
  col: MatrixColumn,
  subject: CompareSubject,
  pool: BenchmarkCampaign[],
): ResolvedColumn | null {
  switch (col.kind) {
    case 'brame':
      // The network average, unless the pick already is the whole network.
      return subject.kind === 'segment' && !subject.cuts.length
        ? null
        : { kind: 'slice', parts: [] };
    case 'fixed':
      return { kind: 'slice', parts: [{ dim: col.dim, value: col.value }] };
    case 'campaign': {
      const campaign = pool.find((c) => c.id === col.campaignId);
      return campaign ? { kind: 'campaign', campaign } : null;
    }
    case 'own':
    case 'mix': {
      const cuts =
        col.kind === 'own'
          ? col.dims.map((dim) => ({ dim, value: null as string | null }))
          : col.parts;
      const parts: SlicePart[] = [];
      for (const { dim, value } of cuts) {
        const bucket = value ?? subject.keys[dim];
        if (bucket === null) return null;
        parts.push({ dim, value: bucket });
      }
      // "Same as the pick" on every cut the pick is defined by is just the pick.
      if (subject.kind === 'segment' && sameCampaigns(campaignsWhere(pool, parts), subject)) {
        return null;
      }
      return { kind: 'slice', parts };
    }
  }
}

const sameCampaigns = (campaigns: BenchmarkCampaign[], subject: CompareSubject) =>
  campaigns.length === subject.campaigns.length &&
  campaigns.every((c) => subject.campaigns.some((s) => s.id === c.id));

/** One column's numbers. `single` marks a named campaign: one flight, shown as
 *  it is — the sample floor is for averages, not for a flight picked by name. */
export function columnStats(
  resolved: ResolvedColumn,
  subject: CompareSubject,
  pool: BenchmarkCampaign[],
  now: Date,
): { stats: MetricStats; single: boolean } {
  if (resolved.kind === 'campaign') {
    const c = resolved.campaign;
    const stats = Object.fromEntries(
      BENCHMARK_METRICS.map((m) => {
        const v = c[m];
        return [m, v === null ? null : { avg: v, p50: v, p75: v, p90: v, n: 1 }];
      }),
    ) as MetricStats;
    return { stats, single: true };
  }
  // A benchmark never includes what it judges. So when a column's campaigns
  // contain the whole subject (the pick's industry, the network), the subject
  // is left out. A column that is part of the subject, or beside it ("Audi AT"
  // for an Audi DE pick), has nothing to leave out; one that is exactly the
  // subject is shown whole — except for a campaign pick, which is always left out.
  const inColumn = campaignsWhere(pool, resolved.parts);
  const contains = subject.campaigns.every((s) => inColumn.some((c) => c.id === s.id));
  const exact = contains && inColumn.length === subject.campaigns.length;
  const exclude =
    contains && (subject.kind === 'campaign' || !exact) ? subjectIds(subject) : undefined;
  return { stats: sliceStats(pool, now, resolved.parts, exclude), single: false };
}
