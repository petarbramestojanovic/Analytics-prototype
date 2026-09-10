import { fmtInt } from '../mock/data';
import { useTheme } from './theme';

/**
 * Chart colours as hex literals, because SVG attributes cannot take Tailwind
 * utility classes. These mirror the --color-brame-* tokens in index.css; keep
 * the two in step.
 */
export const CHART_COLORS = {
  teal: '#077070',
  turquoise: '#40b8b8',
  turquoiseLight: '#7dd4d4',
  lime: '#DFFA96',
  purple: '#6b5b95',
} as const;

/**
 * Axis, grid and tooltip styling that follows the dark-mode class. Recharts
 * renders SVG, so it cannot inherit the `dark:` variants the rest of the UI
 * uses — the theme has to be read in JS and passed as props.
 */
export function useAxisStyle() {
  const { theme } = useTheme();
  const textColor = theme === 'dark' ? '#ececec' : '#282929';
  return {
    axis: { stroke: theme === 'dark' ? '#8b8c8c' : '#9ca3af', fontSize: 11 },
    grid: theme === 'dark' ? '#3a3b3b' : '#f0f0f0',
    tooltipStyle: {
      borderRadius: 10,
      border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
      fontSize: 12,
      background: theme === 'dark' ? '#282929' : '#fff',
      color: textColor,
    },
    /** contentStyle sets the tooltip wrapper's color, but Recharts colors each
     *  item line from the series' own color and falls back to black if a
     *  chart never sets one directly (e.g. a Bar coloured only via per-Cell
     *  fill) — invisible against a dark tooltip. Pass explicitly rather than
     *  relying on inheritance. */
    tooltipItemStyle: { color: textColor },
    tooltipLabelStyle: { color: textColor, fontWeight: 600, marginBottom: 4 },
    /** The default hover-highlight rectangle behind a Bar/Area is a light
     *  grey that reads as a jarring white patch in dark mode. */
    cursorFill: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
  };
}

/** Recharts types its formatter value as possibly-undefined, so wrap the
 *  numeric formatters once here instead of casting at every call site. */
export const tooltipInt = (v: unknown, name?: unknown): [string, string] => [
  typeof v === 'number' ? fmtInt(v) : '—',
  String(name ?? ''),
];

export const tooltipIntOnly = (v: unknown): string =>
  typeof v === 'number' ? fmtInt(v) : '—';
