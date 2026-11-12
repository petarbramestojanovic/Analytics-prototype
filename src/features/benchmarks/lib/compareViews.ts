import type { BenchmarkMetric, SliceDim } from './benchmarks';
import { BENCHMARK_METRICS, SLICE_DIMS } from './benchmarks';

export const MAX_MATRIX_COLUMNS = 10;
export const MAX_COMPARE_CHARTS = 4;

/** One cut of a mixed column: a specific bucket, or — `value` null — whatever
 *  bucket the pick sits in ("same client", with the pick being Audi). */
export interface MixPart {
  dim: SliceDim;
  value: string | null;
  /** Display name of the specific bucket (already translated); empty when `value` is null. */
  label: string;
}

/** A matrix column: KLEA overall; the pick's own bucket for one or more cuts at
 *  once ("own" — client, or industry × market); one specific bucket that
 *  doesn't depend on the pick ("fixed"); several cuts combined, some "same as
 *  the pick" and some specific ("mix" — same client × market AT); or one named
 *  campaign ("campaign" — a single flight, not an average, so it needs no
 *  sample floor). */
export type MatrixColumn =
  | { id: string; kind: 'brame' }
  | { id: string; kind: 'own'; dims: SliceDim[] }
  | { id: string; kind: 'fixed'; dim: SliceDim; value: string; label: string }
  | { id: string; kind: 'mix'; parts: MixPart[] }
  | { id: string; kind: 'campaign'; campaignId: string; label: string };

export interface CompareChart {
  id: string;
  metric: BenchmarkMetric;
  by: SliceDim;
}

/** What a view is about: one campaign, or a segment's cuts. The cut values are
 *  the Compare page's own filter strings (`all`, one bucket, or several joined by
 *  a comma). */
export interface SubjectState {
  kind: 'campaign' | 'segment';
  campaign: string;
  industry: string;
  market: string;
  client: string;
  account: string;
}

export const DEFAULT_SUBJECT: SubjectState = {
  kind: 'campaign',
  campaign: '',
  industry: 'all',
  market: 'all',
  client: 'all',
  account: 'all',
};

export interface CompareView {
  id: string;
  name: string;
  /** What was being compared when the view was saved. Views saved before this
   *  existed have none: loading one then leaves the pick as it is. */
  subject?: SubjectState;
  columns: MatrixColumn[];
  charts: CompareChart[];
}

export interface CompareState {
  columns: MatrixColumn[];
  charts: CompareChart[];
  views: CompareView[];
}

/** A saved pick, repaired — or null if it isn't one. `client` / `industry` are
 *  what an older link carried for a segment of that cut. */
function cleanSubject(raw: unknown): SubjectState | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const text = (v: unknown, fallback: string) => (typeof v === 'string' && v ? v : fallback);
  return {
    kind: r.kind === 'campaign' ? 'campaign' : 'segment',
    campaign: typeof r.campaign === 'string' ? r.campaign : '',
    industry: text(r.industry, 'all'),
    market: text(r.market, 'all'),
    client: text(r.client, 'all'),
    account: text(r.account, 'all'),
  };
}

const ORDER = (dims: SliceDim[]) => SLICE_DIMS.filter((d) => dims.includes(d));

export const ownColumn = (dims: SliceDim[]): MatrixColumn => {
  const sorted = ORDER(dims);
  return { id: `own:${sorted.join('+')}`, kind: 'own', dims: sorted };
};
export const fixedColumn = (dim: SliceDim, value: string, label: string): MatrixColumn => ({
  id: `fixed:${dim}:${value}`,
  kind: 'fixed',
  dim,
  value,
  label,
});
export const campaignColumn = (campaignId: string, label: string): MatrixColumn => ({
  id: `campaign:${campaignId}`,
  kind: 'campaign',
  campaignId,
  label,
});

/** Combines cuts into one column, collapsing to the simpler kinds where the mix
 *  is really just that (all "same as the pick" = own; one specific = fixed). */
export function mixColumn(parts: MixPart[]): MatrixColumn {
  const sorted = SLICE_DIMS.flatMap((d) => parts.filter((p) => p.dim === d));
  if (sorted.every((p) => p.value === null)) return ownColumn(sorted.map((p) => p.dim));
  if (sorted.length === 1) return fixedColumn(sorted[0].dim, sorted[0].value!, sorted[0].label);
  return {
    id: `mix:${sorted.map((p) => `${p.dim}=${p.value ?? '@'}`).join('+')}`,
    kind: 'mix',
    parts: sorted,
  };
}

export const BRAME_COLUMN: MatrixColumn = { id: 'brame', kind: 'brame' };

/** The four columns a fresh view starts with. */
export const defaultColumns = (): MatrixColumn[] => [
  ownColumn(['client']),
  ownColumn(['market']),
  ownColumn(['industry']),
  BRAME_COLUMN,
];

export const defaultCharts = (): CompareChart[] => [
  { id: 'c-industry', metric: 'ctr', by: 'industry' },
  { id: 'c-market', metric: 'engagementRate', by: 'market' },
  { id: 'c-client', metric: 'viewability', by: 'client' },
  { id: 'c-account', metric: 'ctr', by: 'account' },
];

export const defaultState = (): CompareState => ({
  columns: defaultColumns(),
  charts: defaultCharts(),
  views: [],
});

const isDim = (v: unknown): v is SliceDim => SLICE_DIMS.includes(v as SliceDim);
const isMetric = (v: unknown): v is BenchmarkMetric =>
  BENCHMARK_METRICS.includes(v as BenchmarkMetric);

function cleanColumns(raw: unknown): MatrixColumn[] | null {
  if (!Array.isArray(raw)) return null;
  const out: MatrixColumn[] = [];
  for (const c of raw) {
    if (!c || typeof c !== 'object') continue;
    const col = c as Record<string, unknown>;
    if (col.kind === 'brame') out.push(BRAME_COLUMN);
    else if (
      col.kind === 'own' &&
      Array.isArray(col.dims) &&
      col.dims.length &&
      col.dims.every(isDim)
    ) {
      out.push(ownColumn(col.dims as SliceDim[]));
    } else if (
      col.kind === 'fixed' &&
      isDim(col.dim) &&
      typeof col.value === 'string' &&
      typeof col.label === 'string'
    ) {
      out.push(fixedColumn(col.dim, col.value, col.label));
    } else if (col.kind === 'mix' && Array.isArray(col.parts) && col.parts.length) {
      const parts = col.parts.flatMap((p): MixPart[] => {
        const part = p as Record<string, unknown> | null;
        return part &&
          isDim(part.dim) &&
          (part.value === null || typeof part.value === 'string') &&
          typeof part.label === 'string'
          ? [{ dim: part.dim, value: part.value as string | null, label: part.label }]
          : [];
      });
      if (
        parts.length === col.parts.length &&
        new Set(parts.map((p) => p.dim)).size === parts.length
      ) {
        out.push(mixColumn(parts));
      }
    } else if (
      col.kind === 'campaign' &&
      typeof col.campaignId === 'string' &&
      typeof col.label === 'string'
    ) {
      out.push(campaignColumn(col.campaignId, col.label));
    }
  }
  return out
    .filter((c, i) => out.findIndex((o) => o.id === c.id) === i)
    .slice(0, MAX_MATRIX_COLUMNS);
}

function cleanCharts(raw: unknown): CompareChart[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .filter(
      (c): c is CompareChart =>
        !!c && isMetric(c.metric) && isDim(c.by) && typeof c.id === 'string',
    )
    .slice(0, MAX_COMPARE_CHARTS);
}

/** Whatever localStorage held, repaired into a state the page can trust — an
 *  empty list of columns or charts is allowed (the user removed them all). */
export function sanitizeState(raw: unknown): CompareState {
  const fallback = defaultState();
  if (!raw || typeof raw !== 'object') return fallback;
  const r = raw as Record<string, unknown>;
  const views: CompareView[] = Array.isArray(r.views)
    ? r.views.flatMap((v) => {
        const view = v as Record<string, unknown> | null;
        const columns = cleanColumns(view?.columns);
        const charts = cleanCharts(view?.charts);
        return view &&
          typeof view.id === 'string' &&
          typeof view.name === 'string' &&
          columns &&
          charts
          ? [{ id: view.id, name: view.name, subject: cleanSubject(view.subject), columns, charts }]
          : [];
      })
    : [];
  return {
    columns: cleanColumns(r.columns) ?? fallback.columns,
    charts: cleanCharts(r.charts) ?? fallback.charts,
    views,
  };
}

/** A named set of charts — what the Overview saves. Unlike a Compare view it
 *  has no matrix columns: the Overview has no campaign to build them around. */
export interface ChartsView {
  id: string;
  name: string;
  charts: CompareChart[];
}

export interface ChartsState {
  charts: CompareChart[];
  views: ChartsView[];
}

export const defaultChartsState = (): ChartsState => ({
  charts: defaultCharts().slice(0, 3),
  views: [],
});

/** Whatever localStorage held, repaired into a charts state the Overview can
 *  trust — no charts at all is allowed (the user removed them). */
export function sanitizeChartsState(raw: unknown): ChartsState {
  const fallback = defaultChartsState();
  if (!raw || typeof raw !== 'object') return fallback;
  const r = raw as Record<string, unknown>;
  const views: ChartsView[] = Array.isArray(r.views)
    ? r.views.flatMap((v) => {
        const view = v as Record<string, unknown> | null;
        const charts = cleanCharts(view?.charts);
        return view && typeof view.id === 'string' && typeof view.name === 'string' && charts
          ? [{ id: view.id, name: view.name, charts }]
          : [];
      })
    : [];
  return { charts: cleanCharts(r.charts) ?? fallback.charts, views };
}
