import { EMPTY_VALUE, fmtInt } from '@/lib/format';
import { useTheme } from '@/components/theme';
import { useMediaQuery } from '@/hooks/useMediaQuery';

/**
 * Chart colours as hex literals, because SVG attributes cannot take Tailwind
 * utility classes. They come from the BRAME palette (see the --color-brame-*
 * tokens in index.css) and follow the guide's pairings: deep teal on light
 * surfaces, lime on charcoal. Purple and amber are the same hues pushed far
 * enough from their surface to stay visible as thin lines (>= 3:1).
 */
const LIGHT_CHART_COLORS = {
  teal: '#024a4a',
  turquoise: '#28b8b8',
  turquoiseLight: '#90f1f1',
  lime: '#9ccf12',
  purple: '#5b67c9',
  amber: '#a06f0e',
  green: '#3d7d59',
} as const;

const DARK_CHART_COLORS = {
  teal: '#dffa96',
  turquoise: '#9ccf12',
  turquoiseLight: '#4f6a2f',
  lime: '#dffa96',
  purple: '#bec6fa',
  amber: '#edae30',
  green: '#8fc4a5',
} as const;

export type ChartPalette = Record<keyof typeof LIGHT_CHART_COLORS, string>;

/**
 * Axis, grid and tooltip styling that follows the dark-mode class. Recharts
 * renders SVG, so it cannot inherit the `dark:` variants the rest of the UI
 * uses — the theme has to be read in JS and passed as props.
 */
export function useAxisStyle() {
  const { theme } = useTheme();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const textColor = theme === 'dark' ? '#f1f3f3' : '#282929';
  return {
    /** Series colours for the current theme. */
    colors: theme === 'dark' ? DARK_CHART_COLORS : LIGHT_CHART_COLORS,
    axis: { stroke: theme === 'dark' ? '#b0b5b5' : '#898c8c', fontSize: 12 },
    grid: theme === 'dark' ? '#4a4b4b' : '#e0e5e5',
    tooltipStyle: {
      borderRadius: 10,
      border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#e0e5e5'}`,
      fontSize: 13,
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
    /** Spread onto every series as `isAnimationActive` — no grow-in animation
     *  for users who asked the OS for reduced motion. */
    animate: !reducedMotion,
  };
}

/** Recharts types its formatter value as possibly-undefined, so wrap the
 *  numeric formatters once here instead of casting at every call site. */
export const tooltipInt = (v: unknown, name?: unknown): [string, string] => [
  typeof v === 'number' ? fmtInt(v) : EMPTY_VALUE,
  String(name ?? ''),
];

export const tooltipIntOnly = (v: unknown): string =>
  typeof v === 'number' ? fmtInt(v) : EMPTY_VALUE;
