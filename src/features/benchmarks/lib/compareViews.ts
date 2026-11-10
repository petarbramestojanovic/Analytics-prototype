import type { BenchmarkMetric, SliceDim } from './benchmarks';
import { BENCHMARK_METRICS, SLICE_DIMS } from './benchmarks';

export const MAX_MATRIX_COLUMNS = 10;
export const MAX_COMPARE_CHARTS = 4;

/** A matrix column: KLEA overall; the picked campaign's own bucket for one or
 *  more cuts at once ("own" — client, or industry × market); or one specific
 *  bucket that doesn't depend on the campaign ("fixed"). */
export type MatrixColumn =
  | { id: string; kind: 'brame' }
  | { id: string; kind: 'own'; dims: SliceDim[] }
  | { id: string; kind: 'fixed'; dim: SliceDim; value: string; label: string };

export interface CompareChart {
  id: string;
  metric: BenchmarkMetric;
  by: SliceDim;
}

export interface CompareView {
  id: string;
  name: string;
  columns: MatrixColumn[];
  charts: CompareChart[];
}

export interface CompareState {
  columns: MatrixColumn[];
  charts: CompareChart[];
  views: CompareView[];
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
          ? [{ id: view.id, name: view.name, columns, charts }]
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
