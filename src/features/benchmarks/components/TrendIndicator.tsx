import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useI18n } from '@/i18n';
import { fmtSignedPct } from '@/lib/format';
import { Pill, type PillTone } from '@/components/ui';
import type { Trend } from '../lib/benchmarks';

const TREND_ICON = { improving: TrendingUp, declining: TrendingDown, stable: Minus } as const;
const TREND_TONE: Record<Trend, PillTone> = { improving: 'green', declining: 'red', stable: 'neutral' };
const TREND_TEXT: Record<Trend, string> = {
  improving: 'text-green-600 dark:text-green-400',
  declining: 'text-red-600 dark:text-red-400',
  stable: 'text-gray-400 dark:text-gray-500',
};

/** Just the coloured direction sign — for dense tables. */
export function TrendIcon({ trend, size = 14 }: { trend: Trend; size?: number }) {
  const Icon = TREND_ICON[trend];
  return <Icon size={size} className={TREND_TEXT[trend]} />;
}

/** The direction with its label and change — for a single-metric headline. */
export function TrendPill({ trend, pct }: { trend: Trend; pct: number }) {
  const { t } = useI18n();
  const Icon = TREND_ICON[trend];
  return (
    <Pill tone={TREND_TONE[trend]} icon={<Icon size={12} />}>
      {t(`benchmarks.trend.${trend}`)}
      {trend !== 'stable' && ` ${fmtSignedPct(pct, 1)}`}
    </Pill>
  );
}
