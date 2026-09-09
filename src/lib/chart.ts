import { fmtInt } from '../mock/data';

/** Recharts types its formatter value as possibly-undefined, so wrap the
 *  numeric formatters once here instead of casting at every call site. */
export const tooltipInt = (v: unknown, name?: unknown): [string, string] => [
  typeof v === 'number' ? fmtInt(v) : '—',
  String(name ?? ''),
];

export const tooltipIntOnly = (v: unknown): string =>
  typeof v === 'number' ? fmtInt(v) : '—';
